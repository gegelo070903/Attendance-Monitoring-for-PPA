import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activityLogger";

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { department, position } = body;

    // Validate input
    if (department !== undefined && typeof department !== "string") {
      return NextResponse.json({ error: "Invalid department" }, { status: 400 });
    }

    if (position !== undefined && typeof position !== "string") {
      return NextResponse.json({ error: "Invalid position" }, { status: 400 });
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(department !== undefined && { department: department.trim() || null }),
        ...(position !== undefined && { position: position.trim() || null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        position: true,
      },
    });

    // Log profile update activity
    await logActivity({
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
      action: "PROFILE_UPDATE",
      description: `${session.user.name || session.user.email} updated their profile`,
      type: "SUCCESS",
      metadata: {
        department: updatedUser.department,
        position: updatedUser.position,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// GET - Get user's profile info
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        position: true,
        profileImage: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
