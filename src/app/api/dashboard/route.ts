import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { startOfDay, endOfDay } from "date-fns";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Get today's attendance for current user
    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: today,
          lte: todayEnd,
        },
      },
    });

    // Get this month's stats for current user
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyAttendance = await prisma.attendance.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const presentDays = monthlyAttendance.filter(
      (a) => a.status === "PRESENT"
    ).length;
    const lateDays = monthlyAttendance.filter((a) => a.status === "LATE").length;
    const absentDays = monthlyAttendance.filter(
      (a) => a.status === "ABSENT"
    ).length;
    const totalWorkHours = monthlyAttendance.reduce(
      (sum, a) => sum + (a.workHours || 0),
      0
    );

    // Admin-only stats
    let adminStats = null;
    if (session.user.role === "ADMIN") {
      const totalEmployees = await prisma.user.count({
        where: { role: "EMPLOYEE" },
      });

      // Count only EMPLOYEE attendance (not admins)
      const todayPresentCount = await prisma.attendance.count({
        where: {
          date: {
            gte: today,
            lte: todayEnd,
          },
          status: { in: ["PRESENT", "LATE"] },
          user: {
            role: "EMPLOYEE",
          },
        },
      });

      const todayLateCount = await prisma.attendance.count({
        where: {
          date: {
            gte: today,
            lte: todayEnd,
          },
          status: "LATE",
          user: {
            role: "EMPLOYEE",
          },
        },
      });

      // Ensure absent count is never negative
      const todayAbsent = Math.max(0, totalEmployees - todayPresentCount);

      adminStats = {
        totalEmployees,
        todayPresent: todayPresentCount,
        todayAbsent,
        todayLate: todayLateCount,
      };
    }

    return NextResponse.json({
      todayAttendance,
      monthlyStats: {
        presentDays,
        lateDays,
        absentDays,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        totalDays: monthlyAttendance.length,
      },
      adminStats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
