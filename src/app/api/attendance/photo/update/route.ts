import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitAttendanceUpdate } from "@/lib/socketServer";

function normalizeAction(action: string): string {
  const normalized = action.trim().toUpperCase();
  if (normalized.startsWith("SCAN_")) {
    return normalized;
  }

  const compact = normalized.replace(/[\s-]+/g, "_");
  const actionMap: Record<string, string> = {
    AM_IN: "SCAN_AM_IN",
    AM_OUT: "SCAN_AM_OUT",
    PM_IN: "SCAN_PM_IN",
    PM_OUT: "SCAN_PM_OUT",
  };

  return actionMap[compact] || "";
}

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

    const scanAction = normalizeAction(action);
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

    const metadataNeedle = `"attendanceId":"${attendanceId}"`;

    // Prefer exact match by attendanceId metadata and action.
    let recentLog = await prisma.activityLog.findFirst({
      where: {
        userId: attendance.user.id,
        action: scanAction,
        metadata: { contains: metadataNeedle },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fallback for older entries that may not include metadata.
    if (!recentLog) {
      recentLog = await prisma.activityLog.findFirst({
        where: {
          userId: attendance.user.id,
          action: scanAction,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Last-resort fallback: any scan log for this attendanceId.
    if (!recentLog) {
      recentLog = await prisma.activityLog.findFirst({
        where: {
          userId: attendance.user.id,
          action: { startsWith: "SCAN_" },
          metadata: { contains: metadataNeedle },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!recentLog) {
      return NextResponse.json(
        { error: "Activity log entry not found for this scan" },
        { status: 404 }
      );
    }

    await prisma.activityLog.update({
      where: { id: recentLog.id },
      data: { scanPhoto: photoUrl },
    });

    // Emit real-time update event
    emitAttendanceUpdate({
      type: "attendance-photo-update",
      attendanceId,
      action,
      photoUrl,
      activityLogId: recentLog.id,
    });

    return NextResponse.json({
      success: true,
      photoUrl,
      activityLogId: recentLog.id,
    });
  } catch (error) {
    console.error("Error updating scan photo:", error);
    return NextResponse.json(
      { error: "Failed to update scan photo" },
      { status: 500 }
    );
  }
}
