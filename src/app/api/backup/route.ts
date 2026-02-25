import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity, ActivityActions } from "@/lib/activityLogger";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "prisma", "dev.db");
const BACKUP_DIR = path.join(process.cwd(), "backups");

// Ensure backup directory exists
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// GET - List all backups
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    ensureBackupDir();

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".db"))
      .map(filename => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Get current database size
    const dbStats = fs.statSync(DB_PATH);
    const dbSize = dbStats.size;

    // Get total backup folder size
    const totalBackupSize = files.reduce((sum, f) => sum + f.size, 0);

    return NextResponse.json({
      backups: files,
      totalBackups: files.length,
      currentDbSize: dbSize,
      currentDbSizeFormatted: formatFileSize(dbSize),
      totalBackupSize,
      totalBackupSizeFormatted: formatFileSize(totalBackupSize),
      backupDir: BACKUP_DIR,
    });
  } catch (error) {
    console.error("List backups error:", error);
    return NextResponse.json({ error: "Failed to list backups" }, { status: 500 });
  }
}

// POST - Create a new backup
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    ensureBackupDir();

    // Check if database file exists
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ error: "Database file not found" }, { status: 404 });
    }

    // Generate backup filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .slice(0, 19);
    const backupFilename = `backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    // Copy the database file
    fs.copyFileSync(DB_PATH, backupPath);

    // Verify the backup was created
    const backupStats = fs.statSync(backupPath);
    const dbStats = fs.statSync(DB_PATH);

    if (backupStats.size !== dbStats.size) {
      // Backup size mismatch - delete and report error
      fs.unlinkSync(backupPath);
      return NextResponse.json({ error: "Backup verification failed - size mismatch" }, { status: 500 });
    }

    // Log the backup activity
    await logActivity({
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Admin",
      action: "DATABASE_BACKUP",
      description: `Database backup created: ${backupFilename} (${formatFileSize(backupStats.size)})`,
      type: "SUCCESS",
      metadata: {
        filename: backupFilename,
        size: backupStats.size,
        sizeFormatted: formatFileSize(backupStats.size),
      },
    });

    // Auto-cleanup: keep only the latest 20 backups
    const allBackups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".db") && f.startsWith("backup_"))
      .sort()
      .reverse();

    if (allBackups.length > 20) {
      const toDelete = allBackups.slice(20);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
      }
    }

    return NextResponse.json({
      success: true,
      filename: backupFilename,
      size: backupStats.size,
      sizeFormatted: formatFileSize(backupStats.size),
      createdAt: now.toISOString(),
      message: `Backup created successfully: ${backupFilename}`,
    });
  } catch (error) {
    console.error("Create backup error:", error);
    return NextResponse.json({ error: "Failed to create backup" }, { status: 500 });
  }
}

// DELETE - Delete a specific backup
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await request.json();

    if (!filename || !filename.endsWith(".db")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Prevent path traversal attacks
    const safeName = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
    }

    fs.unlinkSync(filePath);

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Admin",
      action: "DATABASE_BACKUP_DELETE",
      description: `Database backup deleted: ${safeName}`,
      type: "WARNING",
    });

    return NextResponse.json({ success: true, message: `Backup ${safeName} deleted` });
  } catch (error) {
    console.error("Delete backup error:", error);
    return NextResponse.json({ error: "Failed to delete backup" }, { status: 500 });
  }
}

// PUT - Restore from a backup
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await request.json();

    if (!filename || !filename.endsWith(".db")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const safeName = path.basename(filename);
    const backupPath = path.join(BACKUP_DIR, safeName);

    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
    }

    // Create a safety backup of current database before restoring
    ensureBackupDir();
    const safetyTimestamp = new Date().toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .slice(0, 19);
    const safetyBackup = path.join(BACKUP_DIR, `pre-restore_${safetyTimestamp}.db`);
    fs.copyFileSync(DB_PATH, safetyBackup);

    // Restore the backup
    fs.copyFileSync(backupPath, DB_PATH);

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Admin",
      action: "DATABASE_RESTORE",
      description: `Database restored from backup: ${safeName}. Safety backup saved as: pre-restore_${safetyTimestamp}.db`,
      type: "WARNING",
      metadata: {
        restoredFrom: safeName,
        safetyBackup: `pre-restore_${safetyTimestamp}.db`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Database restored from ${safeName}. A safety backup of the previous database was saved. Please restart the server for changes to take effect.`,
      safetyBackup: `pre-restore_${safetyTimestamp}.db`,
    });
  } catch (error) {
    console.error("Restore backup error:", error);
    return NextResponse.json({ error: "Failed to restore backup" }, { status: 500 });
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
