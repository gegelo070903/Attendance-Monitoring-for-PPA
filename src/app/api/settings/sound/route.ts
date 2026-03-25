import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import path from "path";
import { promises as fs } from "fs";
import { authOptions } from "@/lib/auth";
import { logActivity, ActivityActions } from "@/lib/activityLogger";

const MAX_SOUND_SIZE_BYTES = 3 * 1024 * 1024;
const SOUND_DIRECTORY = path.join(process.cwd(), "public", "uploads", "sounds");
const SOUND_FILENAME = "scan-notification.mp3";
const SOUND_ABSOLUTE_PATH = path.join(SOUND_DIRECTORY, SOUND_FILENAME);
const SOUND_PUBLIC_URL = "/uploads/sounds/scan-notification.mp3";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No MP3 file provided" }, { status: 400 });
    }

    const isMp3Mime = file.type === "audio/mpeg" || file.type === "audio/mp3";
    const isMp3Name = file.name.toLowerCase().endsWith(".mp3");

    if (!isMp3Mime && !isMp3Name) {
      return NextResponse.json({ error: "Invalid file type. Only MP3 is allowed." }, { status: 400 });
    }

    if (file.size > MAX_SOUND_SIZE_BYTES) {
      return NextResponse.json({ error: "MP3 file is too large. Maximum size is 3MB." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.mkdir(SOUND_DIRECTORY, { recursive: true });
    await fs.writeFile(SOUND_ABSOLUTE_PATH, bytes);
    const stats = await fs.stat(SOUND_ABSOLUTE_PATH);

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Admin",
      action: ActivityActions.SETTINGS_UPDATE,
      description: `${session.user.name || "Admin"} uploaded QR scan notification sound`,
      type: "SUCCESS",
      metadata: {
        soundFile: SOUND_FILENAME,
        sizeBytes: file.size,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Scan notification MP3 uploaded successfully.",
      scanSoundFileUrl: `${SOUND_PUBLIC_URL}?v=${Math.floor(stats.mtimeMs)}`,
    });
  } catch (error) {
    console.error("Upload scan sound error:", error);
    return NextResponse.json({ error: "Failed to upload scan sound" }, { status: 500 });
  }
}
