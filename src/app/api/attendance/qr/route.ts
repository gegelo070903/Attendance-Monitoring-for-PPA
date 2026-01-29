import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays } from "date-fns";

// Minimum seconds between scans for the same user (cooldown)
const SCAN_COOLDOWN_SECONDS = 3;

// Extended types for new schema fields (will be properly typed after Prisma regeneration)
interface ExtendedAttendance {
  id: string;
  userId: string;
  date: Date;
  shiftType?: string;
  amIn: Date | null;
  amOut: Date | null;
  pmIn: Date | null;
  pmOut: Date | null;
  nightIn?: Date | null;
  nightOut?: Date | null;
  status: string;
  workHours: number | null;
  notes: string | null;
}

interface ExtendedSettings {
  amStartTime: string;
  amEndTime: string;
  pmStartTime: string;
  pmEndTime: string;
  nightStartTime?: string;
  nightEndTime?: string;
  amGracePeriod?: number;
  pmGracePeriod?: number;
  nightGracePeriod?: number;
  lateThreshold: number;
}

// Helper to parse time string "HH:MM" to hours and minutes
function parseTimeString(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(":").map(Number);
  return { hour, minute };
}

// Helper to check if arrival is late based on start time and grace period
function isLate(
  arrivalTime: Date,
  startTimeStr: string,
  gracePeriodMinutes: number
): boolean {
  const { hour: startHour, minute: startMinute } = parseTimeString(startTimeStr);
  const graceDeadline = new Date(arrivalTime);
  graceDeadline.setHours(startHour, startMinute + gracePeriodMinutes, 0, 0);
  
  return arrivalTime > graceDeadline;
}

// GET - Check attendance status for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const shiftType = searchParams.get("shiftType") || "DAY";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const today = new Date();
    const attendanceRaw = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
    });
    
    // Cast to extended type
    const attendance = attendanceRaw as ExtendedAttendance | null;

    // Determine next action based on shift type
    let nextAction: string = shiftType === "NIGHT" ? "night-in" : "am-in";
    
    if (attendance) {
      if (shiftType === "DAY") {
        if (!attendance.amIn) nextAction = "am-in";
        else if (!attendance.amOut) nextAction = "am-out";
        else if (!attendance.pmIn) nextAction = "pm-in";
        else if (!attendance.pmOut) nextAction = "pm-out";
        else nextAction = "complete";
      } else {
        if (!attendance.nightIn) nextAction = "night-in";
        else if (!attendance.nightOut) nextAction = "night-out";
        else nextAction = "complete";
      }
    }

    return NextResponse.json({
      attendance,
      nextAction,
      shiftType,
    });
  } catch (error) {
    console.error("Error checking attendance:", error);
    return NextResponse.json(
      { error: "Failed to check attendance status" },
      { status: 500 }
    );
  }
}

// POST - Record attendance via QR scan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId, shiftType = "DAY" } = body;

    const identifier = email || userId;

    if (!identifier) {
      return NextResponse.json(
        { error: "Email or User ID is required" },
        { status: 400 }
      );
    }

    console.log("QR Scan - Looking up user with identifier:", identifier, "Shift:", shiftType);

    // Find user by email or ID
    let user = await prisma.user.findUnique({
      where: { email: identifier },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        position: true,
        profileImage: true,
      },
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: identifier },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          position: true,
          profileImage: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Get settings
    const settings = await prisma.settings.findFirst() || {
      amStartTime: "08:00",
      amEndTime: "12:00",
      pmStartTime: "13:00",
      pmEndTime: "17:00",
      nightStartTime: "22:00",
      nightEndTime: "06:00",
      amGracePeriod: 15,
      pmGracePeriod: 15,
      nightGracePeriod: 15,
      lateThreshold: 15,
    };

    // Determine the attendance date
    // For night shift starting before midnight, use that date
    // For night shift after midnight (continuing from previous night), use previous date
    let attendanceDate = startOfDay(now);
    
    if (shiftType === "NIGHT" && currentHour < 12) {
      // If it's early morning and night shift, this might be continuing from yesterday
      const yesterdayAttendance = await prisma.attendance.findFirst({
        where: {
          userId: user.id,
          shiftType: "NIGHT",
          date: {
            gte: startOfDay(subDays(now, 1)),
            lte: endOfDay(subDays(now, 1)),
          },
          nightIn: { not: null },
          nightOut: null,
        },
      });
      
      if (yesterdayAttendance) {
        attendanceDate = startOfDay(subDays(now, 1));
      }
    }

    // Find or create today's attendance record for this shift
    let attendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        shiftType,
        date: {
          gte: attendanceDate,
          lte: endOfDay(attendanceDate),
        },
      },
    });

    // Check for scan cooldown
    if (attendance) {
      const lastScanTime = shiftType === "NIGHT"
        ? (attendance.nightOut || attendance.nightIn)
        : (attendance.pmOut || attendance.pmIn || attendance.amOut || attendance.amIn);
      
      if (lastScanTime) {
        const secondsSinceLastScan = (now.getTime() - new Date(lastScanTime).getTime()) / 1000;
        if (secondsSinceLastScan < SCAN_COOLDOWN_SECONDS) {
          const waitTime = Math.ceil(SCAN_COOLDOWN_SECONDS - secondsSinceLastScan);
          return NextResponse.json({
            success: false,
            message: `Please wait ${waitTime} seconds before scanning again.`,
            cooldown: true,
            waitTime,
          });
        }
      }
    }

    // Determine action and update data
    let action: string;
    let updateData: Record<string, unknown> = {};
    let status = "PRESENT";

    if (shiftType === "NIGHT") {
      // Night shift logic
      if (!attendance) {
        // First scan - Night In
        action = "night-in";
        
        // Check if late for night shift
        if (isLate(now, settings.nightStartTime || "22:00", (settings as { nightGracePeriod?: number }).nightGracePeriod || 15)) {
          status = "LATE";
        }
        
        attendance = await prisma.attendance.create({
          data: {
            userId: user.id,
            date: attendanceDate,
            shiftType: "NIGHT",
            nightIn: now,
            status,
          },
        });

        return NextResponse.json({
          success: true,
          action: "Night In",
          time: now,
          status,
          message: `Good evening, ${user.name}! Night In recorded at ${now.toLocaleTimeString()}.`,
          nextAction: "night-out",
          user: {
            name: user.name,
            department: user.department,
            position: user.position,
            profileImage: user.profileImage,
          },
        });
      }

      if (!attendance.nightIn) {
        action = "night-in";
        if (isLate(now, settings.nightStartTime || "22:00", (settings as { nightGracePeriod?: number }).nightGracePeriod || 15)) {
          updateData.status = "LATE";
        } else {
          updateData.status = "PRESENT";
        }
        updateData.nightIn = now;
      } else if (!attendance.nightOut) {
        action = "night-out";
        updateData.nightOut = now;
        
        // Calculate work hours
        const nightHours = (now.getTime() - new Date(attendance.nightIn).getTime()) / (1000 * 60 * 60);
        updateData.workHours = Math.round(nightHours * 100) / 100;
      } else {
        return NextResponse.json({
          success: false,
          message: `${user.name} has already completed all attendance for tonight's shift.`,
          nextAction: "complete",
        });
      }
    } else {
      // Day shift logic
      if (!attendance) {
        // First scan of the day
        action = "am-in";
        
        // Check if within PM time window (afternoon arrival without AM)
        const pmStart = parseTimeString(settings.pmStartTime);
        if (currentHour >= pmStart.hour || (currentHour === pmStart.hour - 1 && currentMinute >= 30)) {
          // It's afternoon - employee missed AM, record as PM In instead
          if (isLate(now, settings.pmStartTime, (settings as { pmGracePeriod?: number }).pmGracePeriod || 15)) {
            status = "LATE";
          }
          
          attendance = await prisma.attendance.create({
            data: {
              userId: user.id,
              date: attendanceDate,
              shiftType: "DAY",
              pmIn: now,
              status,
            },
          });

          return NextResponse.json({
            success: true,
            action: "PM In",
            time: now,
            status,
            message: `Good afternoon, ${user.name}! PM In recorded at ${now.toLocaleTimeString()}. (Morning session missed)`,
            nextAction: "pm-out",
            user: {
              name: user.name,
              department: user.department,
              position: user.position,
              profileImage: user.profileImage,
            },
          });
        }
        
        // Morning arrival - check if late
        if (isLate(now, settings.amStartTime, (settings as { amGracePeriod?: number }).amGracePeriod || 15)) {
          status = "LATE";
        }
        
        attendance = await prisma.attendance.create({
          data: {
            userId: user.id,
            date: attendanceDate,
            shiftType: "DAY",
            amIn: now,
            status,
          },
        });

        return NextResponse.json({
          success: true,
          action: "AM In",
          time: now,
          status,
          message: `Good morning, ${user.name}! AM In recorded at ${now.toLocaleTimeString()}.`,
          nextAction: "am-out",
          user: {
            name: user.name,
            department: user.department,
            position: user.position,
            profileImage: user.profileImage,
          },
        });
      }

      // Determine next action based on existing record
      if (!attendance.amIn && !attendance.pmIn) {
        // No check-in yet
        const pmStart = parseTimeString(settings.pmStartTime);
        if (currentHour >= pmStart.hour || (currentHour === pmStart.hour - 1 && currentMinute >= 30)) {
          // Afternoon - record as PM In
          action = "pm-in";
          if (isLate(now, settings.pmStartTime, (settings as { pmGracePeriod?: number }).pmGracePeriod || 15)) {
            updateData.status = "LATE";
          } else if (attendance.status === "ABSENT") {
            updateData.status = "PRESENT";
          }
          updateData.pmIn = now;
        } else {
          // Morning - record as AM In
          action = "am-in";
          if (isLate(now, settings.amStartTime, (settings as { amGracePeriod?: number }).amGracePeriod || 15)) {
            updateData.status = "LATE";
          } else if (attendance.status === "ABSENT") {
            updateData.status = "PRESENT";
          }
          updateData.amIn = now;
        }
      } else if (attendance.amIn && !attendance.amOut && !attendance.pmIn) {
        // Has AM In, needs AM Out or PM In
        const pmStart = parseTimeString(settings.pmStartTime);
        
        // If it's past PM start time, skip AM Out and go to PM In
        if (currentHour >= pmStart.hour) {
          action = "pm-in";
          if (isLate(now, settings.pmStartTime, (settings as { pmGracePeriod?: number }).pmGracePeriod || 15)) {
            updateData.status = "LATE";
          }
          updateData.pmIn = now;
        } else {
          action = "am-out";
          updateData.amOut = now;
        }
      } else if (attendance.amIn && attendance.amOut && !attendance.pmIn) {
        // Has AM In and Out, needs PM In
        action = "pm-in";
        if (isLate(now, settings.pmStartTime, (settings as { pmGracePeriod?: number }).pmGracePeriod || 15)) {
          updateData.status = "LATE";
        }
        updateData.pmIn = now;
      } else if ((attendance.amIn || attendance.pmIn) && !attendance.pmOut) {
        // Has PM In (with or without AM), needs PM Out
        if (!attendance.pmIn) {
          // Edge case: has AM but skipped to PM Out
          action = "pm-out";
          updateData.pmOut = now;
        } else {
          action = "pm-out";
          updateData.pmOut = now;
        }
        
        // Calculate total work hours
        let totalHours = 0;
        if (attendance.amIn && attendance.amOut) {
          totalHours += (new Date(attendance.amOut).getTime() - new Date(attendance.amIn).getTime()) / (1000 * 60 * 60);
        }
        if (attendance.pmIn) {
          totalHours += (now.getTime() - new Date(attendance.pmIn).getTime()) / (1000 * 60 * 60);
        }
        updateData.workHours = Math.round(totalHours * 100) / 100;
      } else {
        return NextResponse.json({
          success: false,
          message: `${user.name} has already completed all attendance for today.`,
          nextAction: "complete",
        });
      }
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData,
    });

    // Format action labels and messages
    const actionLabels: Record<string, string> = {
      "am-in": "AM In",
      "am-out": "AM Out",
      "pm-in": "PM In",
      "pm-out": "PM Out",
      "night-in": "Night In",
      "night-out": "Night Out",
    };

    const messages: Record<string, string> = {
      "am-in": `Good morning, ${user.name}! AM In recorded at ${now.toLocaleTimeString()}.`,
      "am-out": `See you later, ${user.name}! AM Out recorded at ${now.toLocaleTimeString()}.`,
      "pm-in": `Welcome back, ${user.name}! PM In recorded at ${now.toLocaleTimeString()}.`,
      "pm-out": `Goodbye, ${user.name}! PM Out recorded at ${now.toLocaleTimeString()}. Have a great evening!`,
      "night-in": `Good evening, ${user.name}! Night In recorded at ${now.toLocaleTimeString()}.`,
      "night-out": `Good morning, ${user.name}! Night Out recorded at ${now.toLocaleTimeString()}. Rest well!`,
    };

    const nextActions: Record<string, string> = {
      "am-in": "am-out",
      "am-out": "pm-in",
      "pm-in": "pm-out",
      "pm-out": "complete",
      "night-in": "night-out",
      "night-out": "complete",
    };

    return NextResponse.json({
      success: true,
      action: actionLabels[action],
      time: now,
      status: updatedAttendance.status,
      message: messages[action],
      nextAction: nextActions[action],
      workHours: updatedAttendance.workHours,
      user: {
        name: user.name,
        department: user.department,
        position: user.position,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Error processing QR attendance:", error);
    return NextResponse.json(
      { error: "Failed to process attendance" },
      { status: 500 }
    );
  }
}
