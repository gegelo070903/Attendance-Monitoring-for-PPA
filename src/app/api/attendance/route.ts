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

    return NextResponse.json(attendances);
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
