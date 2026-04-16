import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { logActivity, ActivityActions } from "@/lib/activityLogger";
import { emitAttendanceUpdate } from "@/lib/socketServer";

// Minimum minutes a scan-in remains open before the next scan can close it.
const SCAN_WINDOW_MINUTES = 15;
// Prevent rapid duplicate camera callbacks from recording two actions.
const SCAN_DUPLICATE_COOLDOWN_SECONDS = 5;

// Extended types for schema fields
interface ExtendedAttendance {
  id: string;
  userId: string;
  date: Date;
  amIn: Date | null;
  amOut: Date | null;
  pmIn: Date | null;
  pmOut: Date | null;
  status: string;
  workHours: number | null;
  notes: string | null;
}

interface ExtendedSettings {
  amStartTime: string;
  amEndTime: string;
  pmStartTime: string;
  pmEndTime: string;
  amGracePeriod?: number;
  pmGracePeriod?: number;
  lateThreshold: number;
}

function broadcastAttendanceUpdate(attendance: ExtendedAttendance) {
  emitAttendanceUpdate({
    type: "attendance-update",
    attendance,
  });
}

// Helper to parse time string "HH:MM" to hours and minutes
function parseTimeString(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(":").map(Number);
  return { hour, minute };
}

// Helper to format a Date in 24-hour time.
function fmtTime(d: Date): string {
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getMinutesSince(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60);
}

function getMinutesSinceSafe(start: Date | string | null | undefined, end: Date): number | null {
  if (!start) return null;
  const parsedStart = start instanceof Date ? start : new Date(start);
  const diffMs = end.getTime() - parsedStart.getTime();

  if (!Number.isFinite(diffMs)) {
    return 0;
  }

  // Guard against future timestamps from clock drift/timezone anomalies.
  if (diffMs < 0) {
    return 0;
  }

  return diffMs / (1000 * 60);
}

function getMostRecentScan(attendance: ExtendedAttendance | null): { label: string; time: Date } | null {
  if (!attendance) return null;

  const scans: Array<{ label: string; time: Date | null }> = [
    { label: "AM In", time: attendance.amIn },
    { label: "AM Out", time: attendance.amOut },
    { label: "PM In", time: attendance.pmIn },
    { label: "PM Out", time: attendance.pmOut },
  ];

  const valid = scans
    .filter((entry): entry is { label: string; time: Date } => Boolean(entry.time))
    .sort((a, b) => b.time.getTime() - a.time.getTime());

  return valid[0] || null;
}

// Helper to get the scheduled start time as a Date object for the given arrival date
function getScheduledStartTime(arrivalTime: Date, startTimeStr: string): Date {
  const { hour: startHour, minute: startMinute } = parseTimeString(startTimeStr);
  const scheduledStart = new Date(arrivalTime);
  scheduledStart.setHours(startHour, startMinute, 0, 0);
  return scheduledStart;
}

// Helper to check if arrival is late based on start time and grace period
// Returns: { isLate: boolean, minutesLate: number }
// NOTE: HALF_DAY is NOT determined by arrival lateness. It is determined by
// whether only one session (AM or PM) was completed for the day.
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
  
  // Late arrival is always LATE, never HALF_DAY based on lateness alone
  return { isLate: true, isHalfDay: false, minutesLate };
}

// GET - Check attendance status for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

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
    const currentHourGET = today.getHours();
    const currentMinuteGET = today.getMinutes();
    const currentTimeMinGET = currentHourGET * 60 + currentMinuteGET;

    // Get settings for overnight detection
    const settingsGET = await prisma.settings.findFirst() || {
      amEndTime: "12:00",
      pmStartTime: "13:00",
      pmEndTime: "23:59",
    };
    const pmStartGET = parseTimeString(settingsGET.pmStartTime || "13:00");
    const pmStartMinGET = pmStartGET.hour * 60 + pmStartGET.minute;

    // Intended policy: any open previous-day PM In should close as AM Out before PM starts.
    if (currentTimeMinGET < pmStartMinGET) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const overnightRecord = await prisma.attendance.findFirst({
        where: {
          userId: user.id,
          date: { gte: startOfDay(yesterday), lte: endOfDay(yesterday) },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (overnightRecord && overnightRecord.pmIn && !overnightRecord.amOut) {
        return NextResponse.json({
          attendance: overnightRecord as ExtendedAttendance,
          nextAction: "am-out",
          overnight: true,
        });
      }
    }

    const attendanceRaw = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    const attendance = attendanceRaw as ExtendedAttendance | null;

    let nextAction: string = "am-in";

    if (attendance) {
      if (!attendance.amIn) {
        nextAction = "am-in";
      } else if (!attendance.amOut) {
        const minutesSinceAmIn = getMinutesSince(new Date(attendance.amIn), today);
        nextAction = minutesSinceAmIn < SCAN_WINDOW_MINUTES ? "am-in" : "am-out";
      } else if (!attendance.pmIn) {
        nextAction = "pm-in";
      } else if (!attendance.pmOut) {
        const minutesSincePmIn = getMinutesSince(new Date(attendance.pmIn), today);
        nextAction = minutesSincePmIn < SCAN_WINDOW_MINUTES ? "pm-in" : "pm-out";
      } else {
        nextAction = "complete";
      }
    }

    return NextResponse.json({
      attendance,
      nextAction,
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
    const { email, userId, scanPhoto } = body;

    const identifier = email || userId;

    if (!identifier) {
      return NextResponse.json(
        { error: "Email or User ID is required" },
        { status: 400 }
      );
    }

    console.log("QR Scan - Looking up user with identifier:", identifier);

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

    const latestAttendance = await prisma.attendance.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    const latestScan = getMostRecentScan(latestAttendance as ExtendedAttendance | null);
    if (latestScan) {
      const secondsSinceLatestScan = (now.getTime() - latestScan.time.getTime()) / 1000;
      if (secondsSinceLatestScan < SCAN_DUPLICATE_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(SCAN_DUPLICATE_COOLDOWN_SECONDS - secondsSinceLatestScan);
        return NextResponse.json({
          success: true,
          unchanged: true,
          duplicate: true,
          attendanceId: latestAttendance?.id,
          action: latestScan.label,
          time: latestScan.time,
          message: `${latestScan.label} was just recorded at ${fmtTime(latestScan.time)}. Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before scanning again.`,
          user: {
            name: user.name,
            department: user.department,
            position: user.position,
            profileImage: user.profileImage,
          },
        });
      }
    }

    // Get settings
    const settings = await prisma.settings.findFirst() || {
      amStartTime: "00:00",
      amEndTime: "12:00",
      pmStartTime: "13:00",
      pmEndTime: "23:59",
      amGracePeriod: 15,
      pmGracePeriod: 15,
      lateThreshold: 15,
    };

    // Parse PM end time for overnight shift detection
    const pmEnd = parseTimeString(settings.pmEndTime || "23:59");
    const pmEndMinutes = pmEnd.hour * 60 + pmEnd.minute;
    const pmStartCheck = parseTimeString(settings.pmStartTime || "13:00");
    const pmStartMinutes = pmStartCheck.hour * 60 + pmStartCheck.minute;
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // === OVERNIGHT SHIFT CHECK ===
    // Intended policy: if it's before PM start and yesterday has an open PM In,
    // close it as AM Out regardless of PM In clock time.
    if (currentTimeMinutes < pmStartMinutes) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const openOvernight = await prisma.attendance.findFirst({
        where: {
          userId: user.id,
          date: { gte: startOfDay(yesterday), lte: endOfDay(yesterday) },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (openOvernight && openOvernight.pmIn && !openOvernight.amOut) {
        const pmInDate = new Date(openOvernight.pmIn);

        // Record AM Out on yesterday's open PM session
        const totalHours = (now.getTime() - pmInDate.getTime()) / (1000 * 60 * 60);

        const updatedOvernight = await prisma.attendance.update({
          where: { id: openOvernight.id },
          data: {
            amOut: now,
            workHours: Math.round(totalHours * 100) / 100,
            status: "PRESENT",
          },
        });

        broadcastAttendanceUpdate(updatedOvernight as ExtendedAttendance);

        await logActivity({
          userId: user.id,
          userName: user.name || "Unknown",
          action: ActivityActions.SCAN_AM_OUT,
          description: `${user.name} scanned AM Out (overnight shift) at ${fmtTime(now)}`,
          type: "SUCCESS",
          metadata: {
            attendanceId: updatedOvernight.id,
            time: now.toISOString(),
            status: "PRESENT",
            overnight: true,
          },
          scanPhoto: scanPhoto || undefined,
        });

        return NextResponse.json({
          success: true,
          attendanceId: updatedOvernight.id,
          action: "AM Out",
          time: now,
          status: "PRESENT",
          message: `Good morning, ${user.name}! AM Out (overnight shift) recorded at ${fmtTime(now)}.`,
          nextAction: "complete",
          workHours: updatedOvernight.workHours,
          user: {
            name: user.name,
            department: user.department,
            position: user.position,
            profileImage: user.profileImage,
          },
        });
      }
    }

    const attendanceDate = startOfDay(now);

    // Find today's attendance record.
    // Prioritize open sessions to avoid selecting stale duplicate rows.
    const openAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: attendanceDate,
          lte: endOfDay(attendanceDate),
        },
        OR: [
          { amIn: { not: null }, amOut: null },
          { pmIn: { not: null }, pmOut: null },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    let attendance = openAttendance;

    if (!attendance) {
      attendance = await prisma.attendance.findFirst({
        where: {
          userId: user.id,
          date: {
            gte: attendanceDate,
            lte: endOfDay(attendanceDate),
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    // Hard gate: keep an open scan-in unchanged for the first 15 minutes,
    // regardless of subsequent action resolution paths.
    if (attendance?.amIn && !attendance.amOut) {
      const minutesSinceAmIn = getMinutesSinceSafe(attendance.amIn, now);
      if (minutesSinceAmIn !== null && minutesSinceAmIn < SCAN_WINDOW_MINUTES) {
        const remainingMinutes = Math.ceil(SCAN_WINDOW_MINUTES - minutesSinceAmIn);
        return NextResponse.json({
          success: true,
          unchanged: true,
          attendanceId: attendance.id,
          action: "AM In",
          time: attendance.amIn,
          status: attendance.status,
          message: `AM In remains recorded at ${fmtTime(new Date(attendance.amIn))}. Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} before scanning out.`,
          nextAction: "am-in",
          workHours: attendance.workHours,
          user: {
            name: user.name,
            department: user.department,
            position: user.position,
            profileImage: user.profileImage,
          },
        });
      }
    }

    if (attendance?.pmIn && !attendance.pmOut) {
      const minutesSincePmIn = getMinutesSinceSafe(attendance.pmIn, now);
      if (minutesSincePmIn !== null && minutesSincePmIn < SCAN_WINDOW_MINUTES) {
        const remainingMinutes = Math.ceil(SCAN_WINDOW_MINUTES - minutesSincePmIn);
        return NextResponse.json({
          success: true,
          unchanged: true,
          attendanceId: attendance.id,
          action: "PM In",
          time: attendance.pmIn,
          status: attendance.status,
          message: `PM In remains recorded at ${fmtTime(new Date(attendance.pmIn))}. Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} before scanning out.`,
          nextAction: "pm-in",
          workHours: attendance.workHours,
          user: {
            name: user.name,
            department: user.department,
            position: user.position,
            profileImage: user.profileImage,
          },
        });
      }
    }

    // Determine action and update data
    let action: string | undefined;
    let updateData: Record<string, unknown> = {};
    let status = "PRESENT";

    if (attendance) {
      const openTimeIn = attendance.pmIn && !attendance.pmOut
        ? { field: "pmIn" as const, label: "PM In" }
        : attendance.amIn && !attendance.amOut
          ? { field: "amIn" as const, label: "AM In" }
          : null;

      if (openTimeIn) {
        const openScanTime = attendance[openTimeIn.field];

        if (openScanTime) {
          const minutesSinceScan = getMinutesSince(new Date(openScanTime), now);

          if (minutesSinceScan < SCAN_WINDOW_MINUTES) {
            const remainingMinutes = Math.ceil(SCAN_WINDOW_MINUTES - minutesSinceScan);
            return NextResponse.json({
              success: true,
              unchanged: true,
              attendanceId: attendance.id,
              action: openTimeIn.label,
              time: openScanTime,
              status: attendance.status,
              message: `${openTimeIn.label} remains recorded at ${fmtTime(new Date(openScanTime))}. Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} before scanning again.`,
              nextAction: openTimeIn.field === "amIn" ? "am-in" : "pm-in",
              workHours: attendance.workHours,
              user: {
                name: user.name,
                department: user.department,
                position: user.position,
                profileImage: user.profileImage,
              },
            });
          }

          action = openTimeIn.field === "amIn" ? "am-out" : "pm-out";
          updateData[openTimeIn.field === "amIn" ? "amOut" : "pmOut"] = now;

          if (action === "pm-out") {
            let totalHours = 0;
            if (attendance.amIn && attendance.amOut) {
              totalHours += (new Date(attendance.amOut).getTime() - new Date(attendance.amIn).getTime()) / (1000 * 60 * 60);
            }
            totalHours += (now.getTime() - new Date(openScanTime).getTime()) / (1000 * 60 * 60);
            updateData.workHours = Math.round(totalHours * 100) / 100;
          }
        }
      }
    }

    // Parse time boundaries from settings
    const amEnd = parseTimeString(settings.amEndTime);
    const pmStart = parseTimeString(settings.pmStartTime);

    // Helper functions
    const isBeforeTime = (hour: number, minute: number): boolean => {
      return currentHour * 60 + currentMinute < hour * 60 + minute;
    };

    const isAfterOrAtTime = (hour: number, minute: number): boolean => {
      return currentHour * 60 + currentMinute >= hour * 60 + minute;
    };

    const isInAMPeriod = isBeforeTime(amEnd.hour, amEnd.minute);
    const isInLunchPeriod = isAfterOrAtTime(amEnd.hour, amEnd.minute) && isBeforeTime(pmStart.hour, pmStart.minute);
    const isInPMPeriod = isAfterOrAtTime(pmStart.hour, pmStart.minute);
    
    if (!attendance) {
      // Double-check to prevent race condition duplicates
      const existingCheck = await prisma.attendance.findFirst({
        where: {
          userId: user.id,
          date: { gte: attendanceDate, lte: endOfDay(attendanceDate) },
        },
        orderBy: { updatedAt: 'desc' },
      });
      if (existingCheck) {
        attendance = existingCheck;
      }
    }

    if (!attendance) {
      // First scan of the day - create new attendance record
      
      if (isInAMPeriod) {
        action = "am-in";
        
        attendance = await prisma.attendance.create({
          data: {
            userId: user.id,
            userName: user.name,
            date: attendanceDate,
            amIn: now,
            status,
          },
        });

        broadcastAttendanceUpdate(attendance as ExtendedAttendance);

        await logActivity({
          userId: user.id,
          userName: user.name || "Unknown",
          action: ActivityActions.SCAN_AM_IN,
          description: `${user.name} scanned AM In at ${fmtTime(now)}`,
          type: "SUCCESS",
          metadata: {
            attendanceId: attendance.id,
            time: now.toISOString(),
            status,
          },
          scanPhoto: scanPhoto || undefined,
        });

        return NextResponse.json({
          success: true,
          attendanceId: attendance.id,
          action: "AM In",
          time: now,
          status,
          message: `Good morning, ${user.name}! AM In recorded at ${fmtTime(now)}.`,
          nextAction: "am-out",
          user: {
            name: user.name,
            department: user.department,
            position: user.position,
            profileImage: user.profileImage,
          },
        });
      } else if (isInLunchPeriod) {
        action = "pm-in";
        
        attendance = await prisma.attendance.create({
          data: {
            userId: user.id,
            userName: user.name,
            date: attendanceDate,
            pmIn: now,
            status: "HALF_DAY",
          },
        });

        broadcastAttendanceUpdate(attendance as ExtendedAttendance);

        await logActivity({
          userId: user.id,
          userName: user.name || "Unknown",
          action: ActivityActions.SCAN_PM_IN,
          description: `${user.name} scanned PM In at ${fmtTime(now)} (Morning session missed - Half Day)`,
          type: "SUCCESS",
          metadata: {
            attendanceId: attendance.id,
            time: now.toISOString(),
            status: "HALF_DAY",
          },
          scanPhoto: scanPhoto || undefined,
        });

        return NextResponse.json({
          success: true,
          attendanceId: attendance.id,
          action: "PM In",
          time: now,
          status: "HALF_DAY",
          message: `Good afternoon, ${user.name}! PM In recorded at ${fmtTime(now)}. (Morning session missed - Half Day)`,
          nextAction: "pm-out",
          user: {
            name: user.name,
            department: user.department,
            position: user.position,
            profileImage: user.profileImage,
          },
        });
      } else if (currentTimeMinutes > pmEndMinutes) {
        // After PM end time - this is an overnight shift start
        action = "pm-in";
        
        attendance = await prisma.attendance.create({
          data: {
            userId: user.id,
            userName: user.name,
            date: attendanceDate,
            pmIn: now,
            status: "PRESENT",
          },
        });

        broadcastAttendanceUpdate(attendance as ExtendedAttendance);

        await logActivity({
          userId: user.id,
          userName: user.name || "Unknown",
          action: ActivityActions.SCAN_PM_IN,
          description: `${user.name} scanned PM In (overnight shift) at ${fmtTime(now)}`,
          type: "SUCCESS",
          metadata: {
            attendanceId: attendance.id,
            time: now.toISOString(),
            status: "PRESENT",
            overnight: true,
          },
          scanPhoto: scanPhoto || undefined,
        });

        return NextResponse.json({
          success: true,
          attendanceId: attendance.id,
          action: "PM In",
          time: now,
          status: "PRESENT",
          message: `Good evening, ${user.name}! PM In (overnight shift) recorded at ${fmtTime(now)}.`,
          nextAction: "am-out",
          user: {
            name: user.name,
            department: user.department,
            position: user.position,
            profileImage: user.profileImage,
          },
        });
      } else {
        action = "pm-in";
        
        attendance = await prisma.attendance.create({
          data: {
            userId: user.id,
            userName: user.name,
            date: attendanceDate,
            pmIn: now,
            status: "HALF_DAY",
          },
        });

        broadcastAttendanceUpdate(attendance as ExtendedAttendance);

        const statusMsg = " (Morning session missed - Half Day)";

        await logActivity({
          userId: user.id,
          userName: user.name || "Unknown",
          action: ActivityActions.SCAN_PM_IN,
          description: `${user.name} scanned PM In at ${fmtTime(now)}.${statusMsg}`,
          type: "SUCCESS",
          metadata: {
            attendanceId: attendance.id,
            time: now.toISOString(),
            status: "HALF_DAY",
          },
          scanPhoto: scanPhoto || undefined,
        });

        return NextResponse.json({
          success: true,
          attendanceId: attendance.id,
          action: "PM In",
          time: now,
          status: "HALF_DAY",
          message: `Good afternoon, ${user.name}! PM In recorded at ${fmtTime(now)}.${statusMsg}`,
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

    if (!action) {
      // Existing attendance record - determine next action
      if (attendance.amIn && !attendance.amOut && !attendance.pmIn && !attendance.pmOut) {
        if (isInAMPeriod || isInLunchPeriod) {
          action = "am-out";
          updateData.amOut = now;
        } else {
          action = "pm-in";
          updateData.pmIn = now;
        }
      } else if (attendance.amIn && attendance.amOut && !attendance.pmIn && !attendance.pmOut) {
        action = "pm-in";
        updateData.pmIn = now;
      } else if (attendance.pmIn && !attendance.pmOut) {
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
        if (isInAMPeriod) {
          action = "am-in";
          if (attendance.status === "ABSENT") {
            updateData.status = "PRESENT";
          }
          updateData.amIn = now;
        } else {
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

    // Final safety gate: never allow AM Out/PM Out before the 15-minute window.
    if (action === "am-out" && attendance.amIn) {
      const minutesSinceAmIn = getMinutesSince(new Date(attendance.amIn), now);
      if (minutesSinceAmIn < SCAN_WINDOW_MINUTES) {
        const remainingMinutes = Math.ceil(SCAN_WINDOW_MINUTES - minutesSinceAmIn);
        return NextResponse.json({
          success: true,
          unchanged: true,
          attendanceId: attendance.id,
          action: "AM In",
          time: attendance.amIn,
          status: attendance.status,
          message: `AM In remains recorded at ${fmtTime(new Date(attendance.amIn))}. Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} before scanning out.`,
          nextAction: "am-in",
          workHours: attendance.workHours,
          user: {
            name: user.name,
            department: user.department,
            position: user.position,
            profileImage: user.profileImage,
          },
        });
      }
    }

    if (action === "pm-out" && attendance.pmIn) {
      const minutesSincePmIn = getMinutesSince(new Date(attendance.pmIn), now);
      if (minutesSincePmIn < SCAN_WINDOW_MINUTES) {
        const remainingMinutes = Math.ceil(SCAN_WINDOW_MINUTES - minutesSincePmIn);
        return NextResponse.json({
          success: true,
          unchanged: true,
          attendanceId: attendance.id,
          action: "PM In",
          time: attendance.pmIn,
          status: attendance.status,
          message: `PM In remains recorded at ${fmtTime(new Date(attendance.pmIn))}. Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} before scanning out.`,
          nextAction: "pm-in",
          workHours: attendance.workHours,
          user: {
            name: user.name,
            department: user.department,
            position: user.position,
            profileImage: user.profileImage,
          },
        });
      }
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData,
    });

    broadcastAttendanceUpdate(updatedAttendance as ExtendedAttendance);

    // Format action labels and messages
    const actionLabels: Record<string, string> = {
      "am-in": "AM In",
      "am-out": "AM Out",
      "pm-in": "PM In",
      "pm-out": "PM Out",
    };

    const activityActionMap: Record<string, string> = {
      "am-in": ActivityActions.SCAN_AM_IN,
      "am-out": ActivityActions.SCAN_AM_OUT,
      "pm-in": ActivityActions.SCAN_PM_IN,
      "pm-out": ActivityActions.SCAN_PM_OUT,
    };

    const messages: Record<string, string> = {
      "am-in": `Good morning, ${user.name}! AM In recorded at ${fmtTime(now)}.`,
      "am-out": `See you later, ${user.name}! AM Out recorded at ${fmtTime(now)}.`,
      "pm-in": `Welcome back, ${user.name}! PM In recorded at ${fmtTime(now)}.`,
      "pm-out": `Goodbye, ${user.name}! PM Out recorded at ${fmtTime(now)}. Have a great evening!`,
    };

    const nextActions: Record<string, string> = {
      "am-in": "am-out",
      "am-out": "pm-in",
      "pm-in": "pm-out",
      "pm-out": "complete",
    };

    const resolvedAction = action as keyof typeof actionLabels;

    // Log the scan activity
    await logActivity({
      userId: user.id,
      userName: user.name,
      action: activityActionMap[resolvedAction] || resolvedAction.toUpperCase().replace("-", "_"),
      description: `${user.name} scanned ${actionLabels[resolvedAction]} at ${fmtTime(now)}`,
      type: "SUCCESS",
      metadata: {
        attendanceId: updatedAttendance.id,
        status: updatedAttendance.status,
        department: user.department,
        position: user.position,
      },
      scanPhoto,
    });

    return NextResponse.json({
      success: true,
      attendanceId: updatedAttendance.id,
      action: actionLabels[resolvedAction],
      time: now,
      status: updatedAttendance.status,
      message: messages[resolvedAction],
      nextAction: nextActions[resolvedAction],
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
