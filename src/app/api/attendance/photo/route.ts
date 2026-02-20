import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Upload scan photo
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get("photo") as File;
    const attendanceId = formData.get("attendanceId") as string;
    const action = formData.get("action") as string;

    if (!photo || !attendanceId || !action) {
      return NextResponse.json(
        { error: "Photo, attendanceId, and action are required" },
        { status: 400 }
      );
    }

    // Convert File to Buffer and save to database
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const timestamp = Date.now();
    const filename = `scan_${attendanceId}_${action}_${timestamp}.jpg`;

    const fileUpload = await prisma.fileUpload.create({
      data: {
        data: buffer,
        mimeType: photo.type || "image/jpeg",
        filename,
      },
    });

    // Return the API URL path
    const photoUrl = `/api/files/${fileUpload.id}`;

    return NextResponse.json({
      success: true,
      photoUrl,
    });
  } catch (error) {
    console.error("Error uploading scan photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}
