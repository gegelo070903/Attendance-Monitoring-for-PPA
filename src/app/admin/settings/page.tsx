"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    workStartTime: "09:00",
    workEndTime: "17:00",
    lateThreshold: 15,
  });
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would save to the database
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure attendance system settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl">
        {saved && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Settings saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Work Schedule
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Start Time
                </label>
                <input
                  type="time"
                  value={settings.workStartTime}
                  onChange={(e) =>
                    setSettings({ ...settings, workStartTime: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work End Time
                </label>
                <input
                  type="time"
                  value={settings.workEndTime}
                  onChange={(e) =>
                    setSettings({ ...settings, workEndTime: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Attendance Rules
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Late Threshold (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.lateThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lateThreshold: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Employees arriving within this many minutes after start time are
                still considered on-time
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="bg-blue-50 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                Attendance Status
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  <span className="font-medium">PRESENT:</span> On-time arrival
                </li>
                <li>
                  <span className="font-medium">LATE:</span> Arrived after
                  threshold
                </li>
                <li>
                  <span className="font-medium">HALF_DAY:</span> Arrived 2+ hours
                  late
                </li>
                <li>
                  <span className="font-medium">ABSENT:</span> No check-in
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Work Hours</h4>
              <p className="text-sm text-gray-600">
                Work hours are automatically calculated from check-in to check-out
                time. Make sure employees check out to record accurate hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
