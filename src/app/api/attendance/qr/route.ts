import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays } from "date-fns";

// Minimum seconds between scans for the same user (cooldown)
const SCAN_COOLDOWN_SECONDS = 3;

// Half-day threshold in minutes (arrives more than this many minutes late = half day)
const HALF_DAY_THRESHOLD_MINUTES = 120; // 2 hours

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

// Helper to get the scheduled start time as a Date object for the given arrival date
function getScheduledStartTime(arrivalTime: Date, startTimeStr: string): Date {
  const { hour: startHour, minute: startMinute } = parseTimeString(startTimeStr);
  const scheduledStart = new Date(arrivalTime);
  scheduledStart.setHours(startHour, startMinute, 0, 0);
  return scheduledStart;
}

// Helper to check if arrival is late based on start time and grace period
// Returns: { isLate: boolean, isHalfDay: boolean, minutesLate: number }
function checkLateStatus(
  arrivalTime: Date,
  startTimeStr: string,
  gracePeriodMinutes: number
): { isLate: boolean; isHalfDay: boolean; minutesLate: number } {
  const scheduledStart = getScheduledStartTime(arrivalTime, startTimeStr);
  const graceDeadline = new Date(scheduledStart);
  graceDeadline.setMinutes(graceDeadline.getMinutes() + gracePeriodMinutes);
  
  const minutesLate = Math.floor((arrivalTime.getTime() - scheduledStart.getTime()) / (1000 * 60));
  
  // If arrived before scheduled start or within grace period, not late
  if (arrivalTime <= graceDeadline) {
    return { isLate: false, isHalfDay: false, minutesLate: Math.max(0, minutesLate) };
  }
  
  // Check if half-day (more than HALF_DAY_THRESHOLD_MINUTES late)
  const isHalfDay = minutesLate >= HALF_DAY_THRESHOLD_MINUTES;
  
  return { isLate: true, isHalfDay, minutesLate };
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
    const { email, userId, shiftType = "DAY", scanPhoto } = body;

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

    // Parse all time boundaries from settings
    const amStart = parseTimeString(settings.amStartTime);
    const amEnd = parseTimeString(settings.amEndTime);
    const pmStart = parseTimeString(settings.pmStartTime);
    const pmEnd = parseTimeString(settings.pmEndTime);
    const nightStart = parseTimeString(settings.nightStartTime || "22:00");
    const nightEnd = parseTimeString(settings.nightEndTime || "06:00");

    // Helper function to check if current time is within a time range
    const isWithinTimeRange = (startHour: number, startMin: number, endHour: number, endMin: number): boolean => {
      const currentMinutes = currentHour * 60 + currentMinute;
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    };

    // Helper function to check if time is before a given time
    const isBeforeTime = (hour: number, minute: number): boolean => {
      const currentMinutes = currentHour * 60 + currentMinute;
      const targetMinutes = hour * 60 + minute;
      return currentMinutes < targetMinutes;
    };

    // Helper function to check if time is after or at a given time
    const isAfterOrAtTime = (hour: number, minute: number): boolean => {
      const currentMinutes = currentHour * 60 + currentMinute;
      const targetMinutes = hour * 60 + minute;
      return currentMinutes >= targetMinutes;
    };

    if (shiftType === "NIGHT") {
      // Night shift logic
      if (!attendance) {
        // First scan - Night In
        action = "night-in";
        
        // Check if late for night shift
        const lateCheck = checkLateStatus(now, settings.nightStartTime || "22:00", (settings as { nightGracePeriod?: number }).nightGracePeriod || 15);
        if (lateCheck.isHalfDay) {
          status = "HALF_DAY";
        } else if (lateCheck.isLate) {
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
          attendanceId: attendance.id,
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
        const lateCheck = checkLateStatus(now, settings.nightStartTime || "22:00", (settings as { nightGracePeriod?: number }).nightGracePeriod || 15);
        if (lateCheck.isHalfDay) {
          updateData.status = "HALF_DAY";
        } else if (lateCheck.isLate) {
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
      // Day shift logic with strict time-based restrictions
      
      // Determine which time period we're in
      const isInAMPeriod = isBeforeTime(amEnd.hour, amEnd.minute); // Before AM End (e.g., before 12:00)
      const isInLunchPeriod = isAfterOrAtTime(amEnd.hour, amEnd.minute) && isBeforeTime(pmStart.hour, pmStart.minute); // Between AM End and PM Start
      const isInPMPeriod = isAfterOrAtTime(pmStart.hour, pmStart.minute); // PM Start or later (e.g., 1:00 PM onwards)
      
      if (!attendance) {
        // First scan of the day - create new attendance record
        
        if (isInAMPeriod) {
          // Morning arrival - record as AM In
          action = "am-in";
          const lateCheck = checkLateStatus(now, settings.amStartTime, (settings as { amGracePeriod?: number }).amGracePeriod || 15);
          if (lateCheck.isHalfDay) {
            status = "HALF_DAY";
          } else if (lateCheck.isLate) {
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
            attendanceId: attendance.id,
            action: "AM In",
            time: now,
            status,
            message: `Good morning, ${user.name}! AM In recorded at ${now.toLocaleTimeString()}.${status === "LATE" ? " (Late)" : status === "HALF_DAY" ? " (Half Day)" : ""}`,
            nextAction: "am-out",
            user: {
              name: user.name,
              department: user.department,
              position: user.position,
              profileImage: user.profileImage,
            },
          });
        } else if (isInLunchPeriod) {
          // During lunch period - first arrival is recorded as PM In (missed AM = half day)
          action = "pm-in";
          
          attendance = await prisma.attendance.create({
            data: {
              userId: user.id,
              date: attendanceDate,
              shiftType: "DAY",
              pmIn: now,
              status: "HALF_DAY", // Missing AM session = half day
            },
          });

          return NextResponse.json({
            success: true,
            attendanceId: attendance.id,
            action: "PM In",
            time: now,
            status: "HALF_DAY",
            message: `Good afternoon, ${user.name}! PM In recorded at ${now.toLocaleTimeString()}. (Morning session missed - Half Day)`,
            nextAction: "pm-out",
            user: {
              name: user.name,
              department: user.department,
              position: user.position,
              profileImage: user.profileImage,
            },
          });
        } else {
          // PM period - employee missed AM, record as PM In (half day)
          action = "pm-in";
          const lateCheck = checkLateStatus(now, settings.pmStartTime, (settings as { pmGracePeriod?: number }).pmGracePeriod || 15);
          
          attendance = await prisma.attendance.create({
            data: {
              userId: user.id,
              date: attendanceDate,
              shiftType: "DAY",
              pmIn: now,
              status: "HALF_DAY", // Missing AM session = half day
            },
          });

          let statusMsg = " (Morning session missed - Half Day)";
          if (lateCheck.isLate) {
            statusMsg = " (Morning missed + Late PM arrival - Half Day)";
          }

          return NextResponse.json({
            success: true,
            attendanceId: attendance.id,
            action: "PM In",
            time: now,
            status: "HALF_DAY",
            message: `Good afternoon, ${user.name}! PM In recorded at ${now.toLocaleTimeString()}.${statusMsg}`,
            nextAction: "pm-out",
            user: {
              name: user.name,
              department: user.department,
              position: user.position,
              profileImage: user.profileImage,
            },
          });
        }
      }

      // Existing attendance record - determine next action based on current time and record state
      
      if (attendance.amIn && !attendance.amOut && !attendance.pmIn && !attendance.pmOut) {
        // Has AM In only - next could be AM Out or PM In depending on time
        
        if (isInAMPeriod || isInLunchPeriod) {
          // Still in AM period or lunch - record as AM Out
          action = "am-out";
          updateData.amOut = now;
        } else {
          // Already in PM period - skip AM Out, go to PM In
          action = "pm-in";
          updateData.pmIn = now;
        }
      } else if (attendance.amIn && attendance.amOut && !attendance.pmIn && !attendance.pmOut) {
        // Has AM In and AM Out - needs PM In
        action = "pm-in";
        const lateCheck = checkLateStatus(now, settings.pmStartTime, (settings as { pmGracePeriod?: number }).pmGracePeriod || 15);
        // Only mark late for PM if they were on time for AM but late returning from lunch
        if (lateCheck.isLate && attendance.status === "PRESENT") {
          updateData.status = "LATE";
        }
        updateData.pmIn = now;
      } else if (attendance.pmIn && !attendance.pmOut) {
        // Has PM In (with or without AM) - needs PM Out
        action = "pm-out";
        updateData.pmOut = now;
        
        // Calculate total work hours
        let totalHours = 0;
        if (attendance.amIn && attendance.amOut) {
          totalHours += (new Date(attendance.amOut).getTime() - new Date(attendance.amIn).getTime()) / (1000 * 60 * 60);
        }
        if (attendance.pmIn) {
          totalHours += (now.getTime() - new Date(attendance.pmIn).getTime()) / (1000 * 60 * 60);
        }
        updateData.workHours = Math.round(totalHours * 100) / 100;
      } else if (!attendance.amIn && !attendance.pmIn) {
        // No check-in yet (edge case - record exists but no times)
        if (isInAMPeriod) {
          action = "am-in";
          const lateCheck = checkLateStatus(now, settings.amStartTime, (settings as { amGracePeriod?: number }).amGracePeriod || 15);
          if (lateCheck.isHalfDay) {
            updateData.status = "HALF_DAY";
          } else if (lateCheck.isLate) {
            updateData.status = "LATE";
          } else if (attendance.status === "ABSENT") {
            updateData.status = "PRESENT";
          }
          updateData.amIn = now;
        } else {
          // PM period - missed AM = half day
          action = "pm-in";
          updateData.status = "HALF_DAY";
          updateData.pmIn = now;
        }
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
      attendanceId: updatedAttendance.id,
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
