import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import path from "path";
import { promises as fs } from "fs";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { logActivity, ActivityActions } from "@/lib/activityLogger";

const SCAN_SOUND_RELATIVE_PATH = "/uploads/sounds/scan-notification.mp3";

async function getScanSoundFileUrl(): Promise<string | null> {
  try {
    const absolutePath = path.join(process.cwd(), "public", "uploads", "sounds", "scan-notification.mp3");
    const stats = await fs.stat(absolutePath);
    return `${SCAN_SOUND_RELATIVE_PATH}?v=${Math.floor(stats.mtimeMs)}`;
  } catch {
    return null;
  }
}

// GET - Get current settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create default settings
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await (prisma.settings as any).create({
        data: {
          amStartTime: "00:00",
          amEndTime: "12:00",
          pmStartTime: "13:00",
          pmEndTime: "23:59",
          amGracePeriod: 15,
          pmGracePeriod: 15,
          lateThreshold: 15,
          scanSoundEnabled: true,
          scanSoundVolume: 60,
        },
      });
    }

    const scanSoundFileUrl = await getScanSoundFileUrl();
    return NextResponse.json({ ...settings, scanSoundFileUrl });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      amStartTime,
      amEndTime,
      pmStartTime,
      pmEndTime,
      amGracePeriod,
      pmGracePeriod,
      lateThreshold,
      scanSoundEnabled,
      scanSoundVolume,
    } = body;

    const normalizedScanSoundVolume =
      scanSoundVolume !== undefined
        ? Math.max(0, Math.min(100, Number(scanSoundVolume)))
        : undefined;

    // Get existing settings or create new
    let settings = await prisma.settings.findFirst();
    const existingSettings = settings as (typeof settings & {
      scanSoundEnabled?: boolean;
      scanSoundVolume?: number;
    }) | null;

    if (settings) {
      settings = await (prisma.settings as any).update({
        where: { id: settings.id },
        data: {
          amStartTime: amStartTime || settings.amStartTime,
          amEndTime: amEndTime || settings.amEndTime,
          pmStartTime: pmStartTime || settings.pmStartTime,
          pmEndTime: pmEndTime || settings.pmEndTime,
          amGracePeriod: amGracePeriod !== undefined ? amGracePeriod : settings.amGracePeriod,
          pmGracePeriod: pmGracePeriod !== undefined ? pmGracePeriod : settings.pmGracePeriod,
          lateThreshold: lateThreshold !== undefined ? lateThreshold : settings.lateThreshold,
          scanSoundEnabled:
            scanSoundEnabled !== undefined ? Boolean(scanSoundEnabled) : existingSettings?.scanSoundEnabled ?? true,
          scanSoundVolume:
            normalizedScanSoundVolume !== undefined
              ? normalizedScanSoundVolume
              : existingSettings?.scanSoundVolume ?? 60,
        },
      });
    } else {
      settings = await (prisma.settings as any).create({
        data: {
          amStartTime: amStartTime || "00:00",
          amEndTime: amEndTime || "12:00",
          pmStartTime: pmStartTime || "13:00",
          pmEndTime: pmEndTime || "23:59",
          amGracePeriod: amGracePeriod || 15,
          pmGracePeriod: pmGracePeriod || 15,
          lateThreshold: lateThreshold || 15,
          scanSoundEnabled:
            scanSoundEnabled !== undefined ? Boolean(scanSoundEnabled) : true,
          scanSoundVolume:
            normalizedScanSoundVolume !== undefined ? normalizedScanSoundVolume : 60,
        },
      });
    }

    if (!settings) {
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 }
      );
    }

    // Log settings update activity
    await logActivity({
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Admin",
      action: ActivityActions.SETTINGS_UPDATE,
      description: `${session.user.name || "Admin"} updated system settings`,
      type: "SUCCESS",
      metadata: {
        amStartTime: settings.amStartTime,
        amEndTime: settings.amEndTime,
        pmStartTime: settings.pmStartTime,
        pmEndTime: settings.pmEndTime,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
