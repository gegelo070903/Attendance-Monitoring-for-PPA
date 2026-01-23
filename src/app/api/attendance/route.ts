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
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
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

    // Find or create today's attendance record
    let attendance = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        },
      },
    });

    if (!attendance) {
      attendance = await prisma.attendance.create({
        data: {
          userId: session.user.id,
          date: today,
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

    // Calculate work hours if we have both AM and PM times
    let workHours = attendance.workHours || 0;
    
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        ...updateData,
        workHours,
      },
    });

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
