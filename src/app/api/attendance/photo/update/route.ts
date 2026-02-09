import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - Update attendance record with photo URL
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

    // Map action to the correct photo field
    const photoFieldMap: Record<string, string> = {
      "am-in": "amInPhoto",
      "am-out": "amOutPhoto",
      "pm-in": "pmInPhoto",
      "pm-out": "pmOutPhoto",
      "night-in": "nightInPhoto",
      "night-out": "nightOutPhoto",
    };

    const photoField = photoFieldMap[action];
    if (!photoField) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    // Update the attendance record with the photo URL
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: { [photoField]: photoUrl },
    });

    return NextResponse.json({
      success: true,
      attendance: updatedAttendance,
    });
  } catch (error) {
    console.error("Error updating attendance photo:", error);
    return NextResponse.json(
      { error: "Failed to update attendance photo" },
      { status: 500 }
    );
  }
}
