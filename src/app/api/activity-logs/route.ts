import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Fetch activity logs with optional sorting and filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const type = searchParams.get("type"); // Filter by type (INFO, SUCCESS, WARNING, ERROR)
    const action = searchParams.get("action"); // Filter by action type
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search");

    // Build where clause
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (action) {
      where.action = { contains: action };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { userName: { contains: search } },
        { description: { contains: search } },
        { action: { contains: search } },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    const validSortFields = ["createdAt", "userName", "action", "type"];
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === "asc" ? "asc" : "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    // Get total count for pagination
    const total = await prisma.activityLog.count({ where });

    // Fetch logs
    const logs = await prisma.activityLog.findMany({
      where,
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
    });

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}

// POST: Create a new activity log entry (internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      userName,
      action,
      description,
      type = "INFO",
      metadata,
      scanPhoto,
      ipAddress,
      userAgent,
    } = body;

    const log = await prisma.activityLog.create({
      data: {
        userId,
        userName,
        action,
        description,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null,
        scanPhoto,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("Error creating activity log:", error);
    return NextResponse.json(
      { error: "Failed to create activity log" },
      { status: 500 }
    );
  }
}
