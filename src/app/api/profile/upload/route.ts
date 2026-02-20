import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activityLogger";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Only admins can update other users' photos
    const targetUserId = userId || session.user.id;
    if (targetUserId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image." },
        { status: 400 }
      );
    }

    // Max file size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Save file to database
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${targetUserId}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileUpload = await prisma.fileUpload.create({
      data: {
        data: buffer,
        mimeType: file.type,
        filename,
      },
    });

    // Update user profile with image URL
    const imageUrl = `/api/files/${fileUpload.id}`;
    const targetUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { profileImage: imageUrl },
    });

    // Log profile image upload activity
    await logActivity({
      userId: targetUserId,
      userName: targetUser.name || targetUser.email || "Unknown",
      action: "PROFILE_IMAGE_UPLOAD",
      description: `${session.user.name || session.user.email} ${targetUserId !== session.user.id ? `updated profile image for ${targetUser.name}` : "updated their profile image"}`,
      type: "SUCCESS",
      metadata: {
        imageUrl,
        updatedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      message: "Profile image uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

// GET - Get user's profile image
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Use session user if no userId provided
    const targetUserId = userId || session?.user?.id;

    if (!targetUserId) {
      return NextResponse.json({ error: "User ID required or must be logged in" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        profileImage: true,
        department: true,
        position: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Failed to get profile" },
      { status: 500 }
    );
  }
}
