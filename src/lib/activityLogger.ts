import { prisma } from "@/lib/prisma";

export type ActivityType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface LogActivityParams {
  userId?: string;
  userName?: string;
  action: string;
  description: string;
  type?: ActivityType;
  metadata?: Record<string, any>;
  scanPhoto?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity(params: LogActivityParams) {
  try {
    const log = await prisma.activityLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        description: params.description,
        type: params.type || "INFO",
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        scanPhoto: params.scanPhoto,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
    return log;
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw - logging should not break the main flow
    return null;
  }
}

// Common activity actions
export const ActivityActions = {
  // Scan actions
  SCAN_AM_IN: "SCAN_AM_IN",
  SCAN_AM_OUT: "SCAN_AM_OUT",
  SCAN_PM_IN: "SCAN_PM_IN",
  SCAN_PM_OUT: "SCAN_PM_OUT",
  SCAN_NIGHT_IN: "SCAN_NIGHT_IN",
  SCAN_NIGHT_OUT: "SCAN_NIGHT_OUT",
  
  // Auth actions
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  REGISTER: "REGISTER",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
  
  // Admin actions
  EMPLOYEE_CREATE: "EMPLOYEE_CREATE",
  EMPLOYEE_UPDATE: "EMPLOYEE_UPDATE",
  EMPLOYEE_DELETE: "EMPLOYEE_DELETE",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
  
  // System actions
  SYSTEM_ERROR: "SYSTEM_ERROR",
};
