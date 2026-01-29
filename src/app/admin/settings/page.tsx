"use client";

import { useState, useEffect } from "react";

interface Settings {
  amStartTime: string;
  amEndTime: string;
  pmStartTime: string;
  pmEndTime: string;
  nightStartTime: string;
  nightEndTime: string;
  amGracePeriod: number;
  pmGracePeriod: number;
  nightGracePeriod: number;
  lateThreshold: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

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
            nightStartTime: data.nightStartTime || "22:00",
            nightEndTime: data.nightEndTime || "06:00",
            amGracePeriod: data.amGracePeriod || 15,
            pmGracePeriod: data.pmGracePeriod || 15,
            nightGracePeriod: data.nightGracePeriod || 15,
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
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save settings");
      }
    } catch (err) {
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Configure attendance system settings and shift schedules</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Success Message */}
        {saved && (
          <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Settings saved successfully!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Day Shift Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800/50 rounded-lg flex items-center justify-center">
              <span className="text-xl">☀️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Day Shift Schedule</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure morning and afternoon shift times</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Morning Shift */}
            <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                <span>🌅</span> Morning (AM) Session
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AM Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.amStartTime}
                    onChange={(e) => setSettings({ ...settings, amStartTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AM End Time
                  </label>
                  <input
                    type="time"
                    value={settings.amEndTime}
                    onChange={(e) => setSettings({ ...settings, amEndTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AM Grace Period (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.amGracePeriod}
                  onChange={(e) => setSettings({ ...settings, amGracePeriod: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Employees arriving within {settings.amGracePeriod} minutes after {settings.amStartTime} are on-time
                </p>
              </div>
            </div>

            {/* Afternoon Shift */}
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <span>☀️</span> Afternoon (PM) Session
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    PM Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.pmStartTime}
                    onChange={(e) => setSettings({ ...settings, pmStartTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    PM End Time
                  </label>
                  <input
                    type="time"
                    value={settings.pmEndTime}
                    onChange={(e) => setSettings({ ...settings, pmEndTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  PM Grace Period (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.pmGracePeriod}
                  onChange={(e) => setSettings({ ...settings, pmGracePeriod: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Employees arriving within {settings.pmGracePeriod} minutes after {settings.pmStartTime} are on-time
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Night Shift Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800/50 rounded-lg flex items-center justify-center">
              <span className="text-xl">🌙</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Night Shift Schedule</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure overnight shift times (may cross midnight)</p>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Night Shift Start Time
                </label>
                <input
                  type="time"
                  value={settings.nightStartTime}
                  onChange={(e) => setSettings({ ...settings, nightStartTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Night Shift End Time (Next Day)
                </label>
                <input
                  type="time"
                  value={settings.nightEndTime}
                  onChange={(e) => setSettings({ ...settings, nightEndTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Night Shift Grace Period (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.nightGracePeriod}
                onChange={(e) => setSettings({ ...settings, nightGracePeriod: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Employees arriving within {settings.nightGracePeriod} minutes after {settings.nightStartTime} are on-time
              </p>
            </div>
            <div className="bg-indigo-100 dark:bg-indigo-800/30 p-3 rounded-lg">
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                <strong>Note:</strong> Night shift attendance is anchored to the shift start date. 
                If a shift starts at {settings.nightStartTime} and ends at {settings.nightEndTime} the next day, 
                the attendance will be recorded for the date when the shift started.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Attendance Status</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li><span className="font-medium text-green-600">PRESENT:</span> Arrived within grace period</li>
                <li><span className="font-medium text-yellow-600">LATE:</span> Arrived after grace period</li>
                <li><span className="font-medium text-orange-600">HALF_DAY:</span> Arrived 2+ hours late</li>
                <li><span className="font-medium text-red-600">ABSENT:</span> No check-in recorded</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Grace Period Explained</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
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
