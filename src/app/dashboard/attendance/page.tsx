"use client";

import { useEffect, useState } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import AttendanceTable from "@/components/AttendanceTable";
import { Attendance } from "@/types";

export default function AttendancePage() {
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

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setDateRange({
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    });
  };

  const setThisMonth = () => {
    const now = new Date();
    setDateRange({
      startDate: format(startOfMonth(now), "yyyy-MM-dd"),
      endDate: format(endOfMonth(now), "yyyy-MM-dd"),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-600">View your attendance records</p>
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
          <div className="flex gap-2">
            <button
              onClick={() => setQuickRange(7)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Last 30 Days
            </button>
            <button
              onClick={setThisMonth}
              className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-md p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <AttendanceTable attendances={attendances} />
        )}
      </div>
    </div>
  );
}
