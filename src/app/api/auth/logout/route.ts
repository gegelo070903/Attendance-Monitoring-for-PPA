import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity, ActivityActions } from "@/lib/activityLogger";

// POST - Log the logout activity before the client signs out
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
      action: ActivityActions.LOGOUT,
      description: `${session.user.name || session.user.email} logged out`,
      type: "INFO",
      metadata: {
        role: session.user.role,
        department: session.user.department,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout logging error:", error);
    return NextResponse.json({ error: "Failed to log logout" }, { status: 500 });
  }
}
