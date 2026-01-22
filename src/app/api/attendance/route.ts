import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { startOfDay, endOfDay } from "date-fns";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { calculateWorkHours, getAttendanceStatus } from "@/lib/utils";

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

    const where: any = {};

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

// POST - Check in
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Check if already checked in today
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: today,
          lte: todayEnd,
        },
      },
    });

    if (existingAttendance?.checkIn) {
      return NextResponse.json(
        { error: "Already checked in today" },
        { status: 400 }
      );
    }

    // Get settings for late threshold
    const settings = await prisma.settings.findFirst();
    const workStartTime = settings?.workStartTime || "09:00";
    const lateThreshold = settings?.lateThreshold || 15;

    const status = getAttendanceStatus(now, workStartTime, lateThreshold);

    const attendance = await prisma.attendance.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        },
      },
      update: {
        checkIn: now,
        status,
      },
      create: {
        userId: session.user.id,
        date: today,
        checkIn: now,
        status,
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Check in error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Check out
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Find today's attendance record
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: today,
          lte: todayEnd,
        },
      },
    });

    if (!existingAttendance) {
      return NextResponse.json(
        { error: "Please check in first" },
        { status: 400 }
      );
    }

    if (existingAttendance.checkOut) {
      return NextResponse.json(
        { error: "Already checked out today" },
        { status: 400 }
      );
    }

    const workHours = calculateWorkHours(existingAttendance.checkIn, now);

    const attendance = await prisma.attendance.update({
      where: { id: existingAttendance.id },
      data: {
        checkOut: now,
        workHours,
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Check out error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
