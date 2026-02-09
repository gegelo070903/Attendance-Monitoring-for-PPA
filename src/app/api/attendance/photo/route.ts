import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

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

    // Create uploads directory for scan photos if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "scans");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `scan_${attendanceId}_${action}_${timestamp}.jpg`;
    const filepath = path.join(uploadsDir, filename);

    // Convert File to Buffer and save
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return the public URL path
    const photoUrl = `/uploads/scans/${filename}`;

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
