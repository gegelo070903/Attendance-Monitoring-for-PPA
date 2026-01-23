import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

// Time window configuration (in 24-hour format)
const TIME_WINDOWS = {
  amIn: { start: 6, end: 11, endMinute: 59 },   // 6:00 AM - 11:59 AM
  amOut: { start: 11, end: 13, endMinute: 59 }, // 11:00 AM - 1:59 PM (overlaps for flexibility)
  pmIn: { start: 12, end: 17, endMinute: 59 },  // 12:00 PM - 5:59 PM (overlaps for flexibility)
  pmOut: { start: 16, end: 23, endMinute: 59 }, // 4:00 PM - 11:59 PM
};

// Minimum seconds between scans for the same user (cooldown)
const SCAN_COOLDOWN_SECONDS = 3;

// Helper function to check if current time is within a window
function isWithinTimeWindow(window: { start: number; end: number; endMinute: number }): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  if (currentHour < window.start) return false;
  if (currentHour > window.end) return false;
  if (currentHour === window.end && currentMinute > window.endMinute) return false;
  
  return true;
}

// Helper function to get the allowed action based on current time
function getAllowedActionForCurrentTime(): string[] {
  const allowed: string[] = [];
  
  if (isWithinTimeWindow(TIME_WINDOWS.amIn)) allowed.push("am-in");
  if (isWithinTimeWindow(TIME_WINDOWS.amOut)) allowed.push("am-out");
  if (isWithinTimeWindow(TIME_WINDOWS.pmIn)) allowed.push("pm-in");
  if (isWithinTimeWindow(TIME_WINDOWS.pmOut)) allowed.push("pm-out");
  
  return allowed;
}

// Helper to format time window for display
function formatTimeWindow(action: string): string {
  const windows: Record<string, string> = {
    "am-in": "6:00 AM - 11:59 AM",
    "am-out": "11:00 AM - 1:59 PM",
    "pm-in": "12:00 PM - 5:59 PM",
    "pm-out": "4:00 PM onwards",
  };
  return windows[action] || "";
}

// GET - Check attendance status for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Verify user exists by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const today = new Date();
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
    });

    // Determine next action
    let nextAction: "am-in" | "am-out" | "pm-in" | "pm-out" | "complete" = "am-in";
    
    if (attendance) {
      if (!attendance.amIn) {
        nextAction = "am-in";
      } else if (!attendance.amOut) {
        nextAction = "am-out";
      } else if (!attendance.pmIn) {
        nextAction = "pm-in";
      } else if (!attendance.pmOut) {
        nextAction = "pm-out";
      } else {
        nextAction = "complete";
      }
    }

    return NextResponse.json({
      attendance,
      nextAction,
      amIn: attendance?.amIn || null,
      amOut: attendance?.amOut || null,
      pmIn: attendance?.pmIn || null,
      pmOut: attendance?.pmOut || null,
      allowedActions: getAllowedActionForCurrentTime(),
    });
  } catch (error) {
    console.error("Error checking attendance:", error);
    return NextResponse.json(
      { error: "Failed to check attendance status" },
      { status: 500 }
    );
  }
}

// POST - Record AM/PM check-in/out via QR scan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId } = body;

    // Support both email (new) and userId (legacy) for backwards compatibility
    const identifier = email || userId;

    if (!identifier) {
      return NextResponse.json(
        { error: "Email or User ID is required" },
        { status: 400 }
      );
    }

    console.log("QR Scan - Looking up user with identifier:", identifier);

    // Try to find user by email first, then by ID
    let user = await prisma.user.findUnique({
      where: { email: identifier },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        position: true,
        profileImage: true,
      },
    });

    // If not found by email, try by ID (legacy QR codes)
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: identifier },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          position: true,
          profileImage: true,
        },
      });
    }

    console.log("QR Scan - User found:", user ? user.email : "NOT FOUND");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const today = new Date();
    const now = new Date();

    // Get settings for time thresholds
    const settings = await prisma.settings.findFirst();
    const amStartTime = settings?.amStartTime || "08:00";
    const lateThreshold = settings?.lateThreshold || 15;

    // Find or create today's attendance record
    let attendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
    });

    // Check for scan cooldown - prevent rapid double scans
    if (attendance) {
      const lastScanTime = attendance.pmOut || attendance.pmIn || attendance.amOut || attendance.amIn;
      if (lastScanTime) {
        const secondsSinceLastScan = (now.getTime() - new Date(lastScanTime).getTime()) / 1000;
        if (secondsSinceLastScan < SCAN_COOLDOWN_SECONDS) {
          const waitTime = Math.ceil(SCAN_COOLDOWN_SECONDS - secondsSinceLastScan);
          return NextResponse.json({
            success: false,
            message: `Please wait ${waitTime} seconds before scanning again.`,
            cooldown: true,
            waitTime,
          });
        }
      }
    }

    // Determine which action to take based on current state
    let action: string;
    let updateData: Record<string, unknown> = {};

    // Get allowed actions based on current time
    const allowedActions = getAllowedActionForCurrentTime();

    if (!attendance) {
      // First scan of the day - should be AM In
      action = "am-in";
      
      // Check if AM In is allowed at current time
      if (!allowedActions.includes("am-in")) {
        const currentHour = now.getHours();
        if (currentHour < 6) {
          return NextResponse.json({
            success: false,
            message: `Too early for AM In. AM In is available from ${formatTimeWindow("am-in")}.`,
            timeRestriction: true,
          });
        } else {
          // After AM In window, check if they can still check in
          return NextResponse.json({
            success: false,
            message: `AM In time window has passed (${formatTimeWindow("am-in")}). Please contact admin.`,
            timeRestriction: true,
          });
        }
      }
      
      // Check if late
      const [startHour, startMinute] = amStartTime.split(":").map(Number);
      const workStart = new Date(today);
      workStart.setHours(startHour, startMinute + lateThreshold, 0, 0);
      const status = now > workStart ? "LATE" : "PRESENT";

      attendance = await prisma.attendance.create({
        data: {
          userId: user.id,
          date: startOfDay(today),
          amIn: now,
          status,
        },
      });

      return NextResponse.json({
        success: true,
        action: "AM In",
        time: attendance.amIn,
        status: attendance.status,
        message: `Good morning, ${user.name}! AM In recorded at ${now.toLocaleTimeString()}.`,
        nextAction: "am-out",
        user: {
          name: user.name,
          department: user.department,
          position: user.position,
          profileImage: user.profileImage,
        },
      });
    }

    // Determine next action based on existing record
    if (!attendance.amIn) {
      action = "am-in";
      
      if (!allowedActions.includes("am-in")) {
        return NextResponse.json({
          success: false,
          message: `AM In is only available from ${formatTimeWindow("am-in")}. Current time is outside this window.`,
          timeRestriction: true,
        });
      }
      
      updateData = { amIn: now };
      
      const [startHour, startMinute] = amStartTime.split(":").map(Number);
      const workStart = new Date(today);
      workStart.setHours(startHour, startMinute + lateThreshold, 0, 0);
      if (now > workStart && attendance.status === "ABSENT") {
        updateData.status = "LATE";
      } else if (attendance.status === "ABSENT") {
        updateData.status = "PRESENT";
      }
    } else if (!attendance.amOut) {
      action = "am-out";
      
      if (!allowedActions.includes("am-out")) {
        const currentHour = now.getHours();
        if (currentHour < 11) {
          return NextResponse.json({
            success: false,
            message: `Too early for AM Out. AM Out is available from ${formatTimeWindow("am-out")}.`,
            timeRestriction: true,
            nextAction: "am-out",
          });
        } else {
          return NextResponse.json({
            success: false,
            message: `AM Out time window has passed. Window: ${formatTimeWindow("am-out")}.`,
            timeRestriction: true,
          });
        }
      }
      
      updateData = { amOut: now };
    } else if (!attendance.pmIn) {
      action = "pm-in";
      
      if (!allowedActions.includes("pm-in")) {
        const currentHour = now.getHours();
        if (currentHour < 12) {
          return NextResponse.json({
            success: false,
            message: `Too early for PM In. PM In is available from ${formatTimeWindow("pm-in")}.`,
            timeRestriction: true,
            nextAction: "pm-in",
          });
        } else {
          return NextResponse.json({
            success: false,
            message: `PM In time window has passed. Window: ${formatTimeWindow("pm-in")}.`,
            timeRestriction: true,
          });
        }
      }
      
      updateData = { pmIn: now };
    } else if (!attendance.pmOut) {
      action = "pm-out";
      
      if (!allowedActions.includes("pm-out")) {
        return NextResponse.json({
          success: false,
          message: `Too early for PM Out. PM Out is available from ${formatTimeWindow("pm-out")}.`,
          timeRestriction: true,
          nextAction: "pm-out",
        });
      }
      
      updateData = { pmOut: now };
      
      // Calculate total work hours
      const amHours = attendance.amOut && attendance.amIn
        ? (new Date(attendance.amOut).getTime() - new Date(attendance.amIn).getTime()) / (1000 * 60 * 60)
        : 0;
      const pmHours = attendance.pmIn
        ? (now.getTime() - new Date(attendance.pmIn).getTime()) / (1000 * 60 * 60)
        : 0;
      updateData.workHours = Math.round((amHours + pmHours) * 100) / 100;
    } else {
      return NextResponse.json({
        success: false,
        message: `${user.name} has already completed all attendance for today.`,
        nextAction: "complete",
      });
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData,
    });

    // Format action name and message
    const actionLabels: Record<string, string> = {
      "am-in": "AM In",
      "am-out": "AM Out",
      "pm-in": "PM In",
      "pm-out": "PM Out",
    };

    const messages: Record<string, string> = {
      "am-in": `Good morning, ${user.name}! AM In recorded at ${now.toLocaleTimeString()}.`,
      "am-out": `See you later, ${user.name}! AM Out recorded at ${now.toLocaleTimeString()}.`,
      "pm-in": `Welcome back, ${user.name}! PM In recorded at ${now.toLocaleTimeString()}.`,
      "pm-out": `Goodbye, ${user.name}! PM Out recorded at ${now.toLocaleTimeString()}. Have a great evening!`,
    };

    const nextActions: Record<string, string> = {
      "am-in": "am-out",
      "am-out": "pm-in",
      "pm-in": "pm-out",
      "pm-out": "complete",
    };

    return NextResponse.json({
      success: true,
      action: actionLabels[action],
      time: now,
      message: messages[action],
      nextAction: nextActions[action],
      workHours: updatedAttendance.workHours,
      user: {
        name: user.name,
        department: user.department,
        position: user.position,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Error processing QR attendance:", error);
    return NextResponse.json(
      { error: "Failed to process attendance" },
      { status: 500 }
    );
  }
}
