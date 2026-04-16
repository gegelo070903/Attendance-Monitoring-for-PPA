import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { startOfDay, endOfDay } from "date-fns";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { emitAttendanceUpdate } from "@/lib/socketServer";

const SCAN_WINDOW_MINUTES = 15;
const DUPLICATE_ACTION_COOLDOWN_SECONDS = 5;

function getMinutesSince(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60);
}

function getSecondsSince(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 1000;
}

// GET - Get attendance records
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || session.user.id;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const all = searchParams.get("all") === "true";

    // Only admins can view all attendance or other users' attendance
    if ((all || userId !== session.user.id) && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where: Record<string, unknown> = {};

    if (!all) {
      where.userId = userId;
    }

    if (startDate && endDate) {
      // Include records by record date and overnight records that close via AM Out within range.
      const rangeStart = startOfDay(new Date(startDate + 'T00:00:00'));
      const rangeEnd = endOfDay(new Date(endDate + 'T00:00:00'));

      where.OR = [
        {
          date: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        {
          amOut: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
      ];
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            position: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Normalize statuses for no-schedule mode.
    // Allowed statuses: PRESENT, HALF_DAY, NO_RECORD.
    const today = startOfDay(new Date());
    const updatedAttendances = attendances.map((att) => {
      const recordDate = startOfDay(new Date(att.date));
      const isPastDay = recordDate < today;

      const hasCompletedAM = att.amIn && att.amOut;
      const hasCompletedPM = att.pmIn && att.pmOut;
      const hasAnyAM = att.amIn || att.amOut;
      const hasAnyPM = att.pmIn || att.pmOut;
      const hasAnyRecord = Boolean(hasAnyAM || hasAnyPM);

      if (!hasAnyRecord || att.status === "ABSENT") {
        return { ...att, status: "NO_RECORD" };
      }

      // HALF_DAY: only one session completed, or PM-only attendance.
      if (hasCompletedAM && !hasAnyPM) {
        return { ...att, status: "HALF_DAY" };
      }
      if (hasCompletedPM && !hasAnyAM) {
        return { ...att, status: "HALF_DAY" };
      }
      if (!hasAnyAM && hasAnyPM) {
        return { ...att, status: "HALF_DAY" };
      }

      // For in-progress same-day records, treat as PRESENT when there is any scan.
      if (!isPastDay && (att.amIn || att.pmIn) && !hasCompletedAM && !hasCompletedPM) {
        return { ...att, status: "PRESENT" };
      }

      return { ...att, status: "PRESENT" };
    });

    return NextResponse.json(updatedAttendances);
  } catch (error) {
    console.error("Get attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Record attendance (used by QR scanner or manual entry)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'amIn', 'amOut', 'pmIn', 'pmOut'

    const now = new Date();
    const today = startOfDay(now);

    // Find or create today's attendance record
    let attendance = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: today,
          lte: endOfDay(today),
        },
      },
    });

    if (!attendance) {
      attendance = await prisma.attendance.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Unknown",
          date: today,
          status: "PRESENT",
        },
      });
    }

    const duplicateCooldownMap: Record<string, Date | null> = {
      amIn: attendance.amIn,
      amOut: attendance.amOut,
      pmIn: attendance.pmIn,
      pmOut: attendance.pmOut,
    };
    const previousSameActionTime = duplicateCooldownMap[action as keyof typeof duplicateCooldownMap];
    if (previousSameActionTime) {
      const secondsSinceAction = getSecondsSince(new Date(previousSameActionTime), now);
      if (secondsSinceAction < DUPLICATE_ACTION_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(DUPLICATE_ACTION_COOLDOWN_SECONDS - secondsSinceAction);
        return NextResponse.json(
          {
            success: true,
            unchanged: true,
            message: `Action already recorded. Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before trying again.`,
            waitSeconds,
            action,
          },
          { status: 200 }
        );
      }
    }

    // Keep a recent scan-in unchanged until the 15-minute window has passed.
    if (action === "amOut" && attendance.amIn && !attendance.amOut) {
      const minutesSinceIn = getMinutesSince(new Date(attendance.amIn), now);
      if (minutesSinceIn < SCAN_WINDOW_MINUTES) {
        const remainingMinutes = Math.ceil(SCAN_WINDOW_MINUTES - minutesSinceIn);
        return NextResponse.json(
          {
            success: true,
            unchanged: true,
            message: `AM In remains recorded. Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} before timing out.`,
            waitMinutes: remainingMinutes,
            action: "amIn",
          },
          { status: 200 }
        );
      }
    }

    if (action === "pmOut" && attendance.pmIn && !attendance.pmOut) {
      const minutesSinceIn = getMinutesSince(new Date(attendance.pmIn), now);
      if (minutesSinceIn < SCAN_WINDOW_MINUTES) {
        const remainingMinutes = Math.ceil(SCAN_WINDOW_MINUTES - minutesSinceIn);
        return NextResponse.json(
          {
            success: true,
            unchanged: true,
            message: `PM In remains recorded. Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} before timing out.`,
            waitMinutes: remainingMinutes,
            action: "pmIn",
          },
          { status: 200 }
        );
      }
    }

    // Update the appropriate field based on action
    const updateData: Record<string, Date> = {};
    
    if (action === 'amIn' && !attendance.amIn) {
      updateData.amIn = now;
    } else if (action === 'amOut' && !attendance.amOut) {
      updateData.amOut = now;
    } else if (action === 'pmIn' && !attendance.pmIn) {
      updateData.pmIn = now;
    } else if (action === 'pmOut' && !attendance.pmOut) {
      updateData.pmOut = now;
    } else {
      return NextResponse.json(
        { error: `Already recorded ${action} for today` },
        { status: 400 }
      );
    }

    // Calculate work hours from available time fields
    const parseDate = (val: Date | string | null | undefined) => {
      if (!val) return null;
      return typeof val === "string" ? new Date(val) : val;
    };
    const amIn = updateData.amIn || attendance.amIn;
    const amOut = updateData.amOut || attendance.amOut;
    const pmIn = updateData.pmIn || attendance.pmIn;
    const pmOut = updateData.pmOut || attendance.pmOut;

    // Parse to Date objects
    const amInDate = parseDate(amIn);
    const amOutDate = parseDate(amOut);
    const pmInDate = parseDate(pmIn);
    const pmOutDate = parseDate(pmOut);

    // Import calculateWorkHours
    const { calculateWorkHours } = await import("@/lib/utils");
    let workHours = 0;
    if (amInDate && amOutDate) workHours += calculateWorkHours(amInDate, amOutDate);
    if (pmInDate && pmOutDate) workHours += calculateWorkHours(pmInDate, pmOutDate);
    
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        ...updateData,
        workHours,
      },
    });

    emitAttendanceUpdate({ type: "attendance-update", attendance: updatedAttendance });

    return NextResponse.json(updatedAttendance);
  } catch (error) {
    console.error("Attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update attendance record (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, amIn, amOut, pmIn, pmOut, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Attendance ID required" }, { status: 400 });
    }

    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        amIn: amIn ? new Date(amIn) : undefined,
        amOut: amOut ? new Date(amOut) : undefined,
        pmIn: pmIn ? new Date(pmIn) : undefined,
        pmOut: pmOut ? new Date(pmOut) : undefined,
        status: status || undefined,
        notes: notes || undefined,
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Update attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
