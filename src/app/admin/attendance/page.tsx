"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import AttendanceTable from "@/components/AttendanceTable";
import { Attendance } from "@/types";

export default function AdminAttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        all: "true",
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const response = await fetch(`/api/attendance?${params}`);
      const data = await response.json();
      setAttendances(data);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [dateRange]);

  // Calculate summary stats
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayAttendances = attendances.filter(
    (a) => format(new Date(a.date), "yyyy-MM-dd") === todayStr
  );

  const presentToday = todayAttendances.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  ).length;
  const lateToday = todayAttendances.filter((a) => a.status === "LATE").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Attendance</h1>
        <p className="text-gray-600">View attendance records for all employees</p>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Present Today</p>
              <p className="text-3xl font-bold text-green-700">{presentToday}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
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
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Late Today</p>
              <p className="text-3xl font-bold text-yellow-700">{lateToday}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-yellow-600"
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
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Records</p>
              <p className="text-3xl font-bold text-blue-700">
                {attendances.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              const now = new Date();
              setDateRange({
                startDate: format(startOfMonth(now), "yyyy-MM-dd"),
                endDate: format(endOfMonth(now), "yyyy-MM-dd"),
              });
            }}
            className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
          >
            This Month
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-md p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <AttendanceTable attendances={attendances} showUser={true} />
        )}
      </div>
    </div>
  );
}
