import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

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
      settings = await prisma.settings.create({
        data: {
          amStartTime: "08:00",
          amEndTime: "12:00",
          pmStartTime: "13:00",
          pmEndTime: "17:00",
          nightStartTime: "22:00",
          nightEndTime: "06:00",
          amGracePeriod: 15,
          pmGracePeriod: 15,
          nightGracePeriod: 15,
          lateThreshold: 15,
        },
      });
    }

    return NextResponse.json(settings);
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
      nightStartTime,
      nightEndTime,
      amGracePeriod,
      pmGracePeriod,
      nightGracePeriod,
      lateThreshold,
    } = body;

    // Get existing settings or create new
    let settings = await prisma.settings.findFirst();

    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          amStartTime: amStartTime || settings.amStartTime,
          amEndTime: amEndTime || settings.amEndTime,
          pmStartTime: pmStartTime || settings.pmStartTime,
          pmEndTime: pmEndTime || settings.pmEndTime,
          nightStartTime: nightStartTime || settings.nightStartTime,
          nightEndTime: nightEndTime || settings.nightEndTime,
          amGracePeriod: amGracePeriod !== undefined ? amGracePeriod : settings.amGracePeriod,
          pmGracePeriod: pmGracePeriod !== undefined ? pmGracePeriod : settings.pmGracePeriod,
          nightGracePeriod: nightGracePeriod !== undefined ? nightGracePeriod : settings.nightGracePeriod,
          lateThreshold: lateThreshold !== undefined ? lateThreshold : settings.lateThreshold,
        },
      });
    } else {
      settings = await prisma.settings.create({
        data: {
          amStartTime: amStartTime || "08:00",
          amEndTime: amEndTime || "12:00",
          pmStartTime: pmStartTime || "13:00",
          pmEndTime: pmEndTime || "17:00",
          nightStartTime: nightStartTime || "22:00",
          nightEndTime: nightEndTime || "06:00",
          amGracePeriod: amGracePeriod || 15,
          pmGracePeriod: pmGracePeriod || 15,
          nightGracePeriod: nightGracePeriod || 15,
          lateThreshold: lateThreshold || 15,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
