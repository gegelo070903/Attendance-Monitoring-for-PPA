"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

interface Settings {
  amStartTime: string;
  amEndTime: string;
  pmStartTime: string;
  pmEndTime: string;
  amGracePeriod: number;
  pmGracePeriod: number;
  lateThreshold: number;
}

interface BackupInfo {
  filename: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
}

interface BackupData {
  backups: BackupInfo[];
  totalBackups: number;
  currentDbSize: number;
  currentDbSizeFormatted: string;
  totalBackupSize: number;
  totalBackupSizeFormatted: string;
}

export default function SettingsPage() {
  const { showSuccess, showError: showErrorToast } = useToast();
  const [settings, setSettings] = useState<Settings>({
    amStartTime: "08:00",
    amEndTime: "12:00",
    pmStartTime: "13:00",
    pmEndTime: "17:00",
    amGracePeriod: 15,
    pmGracePeriod: 15,
    lateThreshold: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Backup state
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
  const [deletingBackup, setDeletingBackup] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [uploadingBackup, setUploadingBackup] = useState(false);

  // Fetch settings on load
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings({
            amStartTime: data.amStartTime || "08:00",
            amEndTime: data.amEndTime || "12:00",
            pmStartTime: data.pmStartTime || "13:00",
            pmEndTime: data.pmEndTime || "17:00",
            amGracePeriod: data.amGracePeriod || 15,
            pmGracePeriod: data.pmGracePeriod || 15,
            lateThreshold: data.lateThreshold || 15,
          });
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
    fetchBackups();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaved(true);
        showSuccess("Settings saved successfully!");
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save settings");
        showErrorToast(data.error || "Failed to save settings");
      }
    } catch (err) {
      setError("Failed to save settings. Please try again.");
      showErrorToast("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Backup functions
  const fetchBackups = async () => {
    setBackupLoading(true);
    try {
      const res = await fetch("/api/backup");
      if (res.ok) {
        const data = await res.json();
        setBackupData(data);
      }
    } catch (err) {
      console.error("Failed to fetch backups:", err);
    } finally {
      setBackupLoading(false);
    }
  };

  const createBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Backup created: ${data.filename} (${data.sizeFormatted})`);
        fetchBackups();
      } else {
        showErrorToast(data.error || "Failed to create backup");
      }
    } catch (err) {
      showErrorToast("Failed to create backup");
    } finally {
      setCreatingBackup(false);
    }
  };

  const deleteBackup = async (filename: string) => {
    setDeletingBackup(filename);
    try {
      const res = await fetch("/api/backup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Backup deleted: ${filename}`);
        setConfirmDelete(null);
        fetchBackups();
      } else {
        showErrorToast(data.error || "Failed to delete backup");
      }
    } catch (err) {
      showErrorToast("Failed to delete backup");
    } finally {
      setDeletingBackup(null);
    }
  };

  const restoreBackup = async (filename: string) => {
    setRestoringBackup(filename);
    try {
      const res = await fetch("/api/backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message);
        setConfirmRestore(null);
        fetchBackups();
      } else {
        showErrorToast(data.error || "Failed to restore backup");
      }
    } catch (err) {
      showErrorToast("Failed to restore backup");
    } finally {
      setRestoringBackup(null);
    }
  };

  const downloadBackup = (filename: string) => {
    const a = document.createElement("a");
    a.href = "/api/backup?action=download&filename=" + encodeURIComponent(filename);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const uploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".db")) {
      showErrorToast("Invalid file type. Only .db files are accepted.");
      e.target.value = "";
      return;
    }
    setUploadingBackup(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/backup", { method: "PATCH", body: formData });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message);
        fetchBackups();
      } else {
        showErrorToast(data.error || "Failed to upload backup");
      }
    } catch (err) {
      showErrorToast("Failed to upload backup");
    } finally {
      setUploadingBackup(false);
      e.target.value = "";
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Configure attendance system settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Success Message */}
        {saved && (
          <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Settings saved successfully!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Day Shift Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-800/50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Schedule Settings</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure morning and afternoon session times</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Morning Shift */}
            <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
                Morning (AM) Session
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    AM Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.amStartTime}
                    onChange={(e) => setSettings({ ...settings, amStartTime: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    AM End Time
                  </label>
                  <input
                    type="time"
                    value={settings.amEndTime}
                    onChange={(e) => setSettings({ ...settings, amEndTime: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  AM Grace Period (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.amGracePeriod}
                  onChange={(e) => setSettings({ ...settings, amGracePeriod: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Employees arriving within {settings.amGracePeriod} minutes after {settings.amStartTime} are on-time
                </p>
              </div>
            </div>

            {/* Afternoon Shift */}
            <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
                Afternoon (PM) Session
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    PM Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.pmStartTime}
                    onChange={(e) => setSettings({ ...settings, pmStartTime: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    PM End Time
                  </label>
                  <input
                    type="time"
                    value={settings.pmEndTime}
                    onChange={(e) => setSettings({ ...settings, pmEndTime: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PM Grace Period (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.pmGracePeriod}
                  onChange={(e) => setSettings({ ...settings, pmGracePeriod: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Employees arriving within {settings.pmGracePeriod} minutes after {settings.pmStartTime} are on-time
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* Database Backup & Storage Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Database Backup & Storage</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Create, manage, and restore database backups</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className={`px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer ${uploadingBackup ? "opacity-50 pointer-events-none" : ""}`}>
              {uploadingBackup ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
                  </svg>
                  Upload Backup
                </>
              )}
              <input
                type="file"
                accept=".db"
                onChange={uploadBackup}
                className="hidden"
                disabled={uploadingBackup}
              />
            </label>
            <button
              onClick={createBackup}
              disabled={creatingBackup}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
            {creatingBackup ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Create Backup Now
              </>
            )}
            </button>
          </div>
        </div>

        {/* Storage Info */}
        {backupData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Current Database Size</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{backupData.currentDbSizeFormatted}</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Backups</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{backupData.totalBackups}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Backup Storage Used</p>
              <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{backupData.totalBackupSizeFormatted}</p>
            </div>
          </div>
        )}

        {/* Backup List */}
        {backupLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
          </div>
        ) : backupData && backupData.backups.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {backupData.backups.map((backup) => (
              <div
                key={backup.filename}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{backup.filename}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(backup.createdAt)} · {backup.sizeFormatted}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Download button */}
                  <button
                    onClick={() => downloadBackup(backup.filename)}
                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Download this backup"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </button>
                  {/* Restore button */}
                  {confirmRestore === backup.filename ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-orange-600 dark:text-orange-400 mr-1">Restore?</span>
                      <button
                        onClick={() => restoreBackup(backup.filename)}
                        disabled={restoringBackup === backup.filename}
                        className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                      >
                        {restoringBackup === backup.filename ? "..." : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmRestore(null)}
                        className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRestore(backup.filename)}
                      className="p-1.5 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                      title="Restore this backup"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                      </svg>
                    </button>
                  )}

                  {/* Delete button */}
                  {confirmDelete === backup.filename ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-red-600 dark:text-red-400 mr-1">Delete?</span>
                      <button
                        onClick={() => deleteBackup(backup.filename)}
                        disabled={deletingBackup === backup.filename}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingBackup === backup.filename ? "..." : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(backup.filename)}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Delete this backup"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
            </svg>
            <p className="text-sm">No backups yet</p>
            <p className="text-xs mt-1">Click &quot;Create Backup Now&quot; to create your first backup</p>
          </div>
        )}

        {/* Backup Info */}
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="text-xs text-amber-700 dark:text-amber-300">
              <p className="font-medium mb-1">Backup Information:</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Backups are stored in the <strong>backups/</strong> folder inside the project directory</li>
                <li>The system automatically keeps the <strong>latest 100 backups</strong> — older ones are auto-deleted</li>
                <li>Before restoring, a <strong>safety backup</strong> of the current database is automatically created</li>
                <li>After restoring, <strong>restart the server</strong> for changes to take full effect</li>
                <li>For extra safety, also copy backup files to a <strong>USB drive</strong> periodically</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Attendance Status</h4>
              <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                <li><span className="font-medium text-green-600">PRESENT:</span> Arrived within grace period</li>
                <li><span className="font-medium text-yellow-600">LATE:</span> Arrived after grace period</li>
                <li><span className="font-medium text-orange-600">HALF_DAY:</span> Arrived 2+ hours late</li>
                <li><span className="font-medium text-red-600">ABSENT:</span> No check-in recorded</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Grace Period Explained</h4>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                The grace period allows employees to arrive slightly after the scheduled start time 
                without being marked as late. For example, with a 15-minute grace period and 8:00 AM start, 
                employees arriving before 8:15 AM are marked as on-time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
