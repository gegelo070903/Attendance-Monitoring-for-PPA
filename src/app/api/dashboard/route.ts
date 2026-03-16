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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const baseMonthlyWhere = {
      userId: session.user.id,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    };

    const [
      todayAttendance,
      presentDays,
      lateDays,
      absentDays,
      monthlyAgg,
      totalDays,
    ] = await Promise.all([
      prisma.attendance.findFirst({
        where: {
          userId: session.user.id,
          date: {
            gte: today,
            lte: todayEnd,
          },
        },
      }),
      prisma.attendance.count({
        where: { ...baseMonthlyWhere, status: "PRESENT" },
      }),
      prisma.attendance.count({
        where: { ...baseMonthlyWhere, status: "LATE" },
      }),
      prisma.attendance.count({
        where: { ...baseMonthlyWhere, status: "ABSENT" },
      }),
      prisma.attendance.aggregate({
        where: baseMonthlyWhere,
        _sum: { workHours: true },
      }),
      prisma.attendance.count({ where: baseMonthlyWhere }),
    ]);

    const totalWorkHours = monthlyAgg._sum.workHours || 0;

    // Admin-only stats
    let adminStats = null;
    if (session.user.role === "ADMIN") {
      const [totalEmployees, todayPresentCount] = await Promise.all([
        prisma.user.count({
          where: { role: "EMPLOYEE" },
        }),
        prisma.attendance.count({
          where: {
            date: {
              gte: today,
              lte: todayEnd,
            },
            status: { in: ["PRESENT", "LATE", "HALF_DAY"] },
            user: {
              role: "EMPLOYEE",
            },
          },
        }),
      ]);

      const todayAbsent = Math.max(0, totalEmployees - todayPresentCount);

      adminStats = {
        totalEmployees,
        todayPresent: todayPresentCount,
        todayAbsent,
      };
    }

    return NextResponse.json({
      todayAttendance,
      monthlyStats: {
        presentDays,
        lateDays,
        absentDays,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        totalDays,
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
