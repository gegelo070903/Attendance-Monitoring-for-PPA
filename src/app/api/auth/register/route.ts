import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { logActivity, ActivityActions } from "@/lib/activityLogger";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, department, position } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "EMPLOYEE",
        department,
        position,
      },
    });

    // Log new user registration
    await logActivity({
      userId: user.id,
      userName: user.name,
      action: ActivityActions.REGISTER,
      description: `New employee ${user.name} (${user.email}) registered`,
      type: "SUCCESS",
      metadata: {
        email: user.email,
        role: user.role,
        department: user.department || null,
        position: user.position || null,
      },
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
