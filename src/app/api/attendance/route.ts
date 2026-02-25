import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { startOfDay, endOfDay } from "date-fns";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

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
      // Append T00:00:00 to parse as local time instead of UTC
      where.date = {
        gte: startOfDay(new Date(startDate + 'T00:00:00')),
        lte: endOfDay(new Date(endDate + 'T00:00:00')),
      };
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

    // Correct HALF_DAY statuses based on actual attendance data.
    // HALF_DAY rules:
    //   DAY shift: only one session completed (AM in+out without PM, or PM in+out without AM)
    //   NIGHT shift: never HALF_DAY (single session - either complete or not)
    // If a record is wrongly marked HALF_DAY but doesn't meet these criteria, fix it:
    //   - Night shift with nightIn+nightOut completed → LATE (if was HALF_DAY)
    //   - Day shift with only amIn (no amOut, no PM) → LATE (arrived late, still in progress or incomplete)
    const today = startOfDay(new Date());
    const updatedAttendances = attendances.map((att) => {
      const recordDate = startOfDay(new Date(att.date));
      const isPastDay = recordDate < today;

      if (att.shiftType === "NIGHT" || (!att.shiftType && (att.nightIn || att.nightOut))) {
        // NIGHT shift: never HALF_DAY
        // If nightIn and nightOut are both present and status is HALF_DAY, correct to LATE
        if (att.status === "HALF_DAY" && att.nightIn && att.nightOut) {
          return { ...att, status: "LATE" };
        }
        // If nightIn and nightOut are both present and status is still HALF_DAY for some reason
        if (att.status === "HALF_DAY" && att.nightIn) {
          return { ...att, status: "LATE" };
        }
        return att;
      }

      // DAY shift logic
      if (att.shiftType === "DAY" || !att.shiftType) {
        const hasCompletedAM = att.amIn && att.amOut;
        const hasCompletedPM = att.pmIn && att.pmOut;
        const hasAnyAM = att.amIn || att.amOut;
        const hasAnyPM = att.pmIn || att.pmOut;

        // For past days: determine HALF_DAY based on completed sessions
        if (isPastDay) {
          if (hasCompletedAM && !hasAnyPM) {
            return { ...att, status: "HALF_DAY" };
          }
          if (hasCompletedPM && !hasAnyAM) {
            return { ...att, status: "HALF_DAY" };
          }
          // If status was wrongly set to HALF_DAY but both sessions exist, or neither is complete
          // e.g., only amIn (no amOut) → not a half day, it's LATE (incomplete)
          if (att.status === "HALF_DAY" && !hasCompletedAM && !hasCompletedPM) {
            return { ...att, status: "LATE" };
          }
        }

        // For today: fix records that were wrongly marked HALF_DAY by old code
        // If only amIn exists (no amOut, no PM), the employee just arrived late — not half day
        if (!isPastDay && att.status === "HALF_DAY") {
          // Only keep HALF_DAY if employee first scanned during PM (missed AM entirely)
          if (!hasAnyAM && hasAnyPM) {
            // Correctly HALF_DAY: missed AM, only has PM
            return att;
          }
          // If has AM In but no PM, and no completed AM session → was just late arrival
          if (att.amIn && !hasAnyPM) {
            return { ...att, status: "LATE" };
          }
        }
      }

      return att;
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

    // Get user's default shift type
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { shiftType: true }
    });
    const shiftType = user?.shiftType || "DAY";

    // Find or create today's attendance record
    let attendance = await prisma.attendance.findUnique({
      where: {
        userId_date_shiftType: {
          userId: session.user.id,
          date: today,
          shiftType: shiftType,
        },
      },
    });

    if (!attendance) {
      attendance = await prisma.attendance.create({
        data: {
          userId: session.user.id,
          date: today,
          shiftType: shiftType,
          status: "PRESENT",
        },
      });
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
    function parseDate(val) {
      if (!val) return null;
      return typeof val === 'string' ? new Date(val) : val;
    }
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

    // Emit socket event for real-time update
    try {
      const res = await fetch("http://localhost:3000/api/socket_io");
      if (res.ok && (global as any).io) {
        (global as any).io.emit("attendance-update", { type: "attendance-update", attendance: updatedAttendance });
      }
    } catch (e) {
      // Ignore socket errors
    }

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
