import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitAttendanceUpdate } from "@/lib/socketServer";

// POST - Update activity log with scan photo URL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attendanceId, action, photoUrl } = body;

    if (!attendanceId || !action || !photoUrl) {
      return NextResponse.json(
        { error: "attendanceId, action, and photoUrl are required" },
        { status: 400 }
      );
    }

    // Map action to the activity log action name
    const actionMap: Record<string, string> = {
      "am-in": "SCAN_AM_IN",
      "am-out": "SCAN_AM_OUT",
      "pm-in": "SCAN_PM_IN",
      "pm-out": "SCAN_PM_OUT",
    };

    const scanAction = actionMap[action];
    if (!scanAction) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    // Get the attendance record to find the user
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    if (!attendance.user) {
      return NextResponse.json(
        { error: "Attendance user not found" },
        { status: 404 }
      );
    }

    // Update the most recent activity log for this scan with the photo
    const recentLog = await prisma.activityLog.findFirst({
      where: {
        userId: attendance.user.id,
        action: scanAction,
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentLog) {
      await prisma.activityLog.update({
        where: { id: recentLog.id },
        data: { scanPhoto: photoUrl },
      });
    }

    // Emit real-time update event
    emitAttendanceUpdate({
      type: "attendance-photo-update",
      attendanceId,
      action,
      photoUrl,
    });

    return NextResponse.json({
      success: true,
      photoUrl,
    });
  } catch (error) {
    console.error("Error updating scan photo:", error);
    return NextResponse.json(
      { error: "Failed to update scan photo" },
      { status: 500 }
    );
  }
}
