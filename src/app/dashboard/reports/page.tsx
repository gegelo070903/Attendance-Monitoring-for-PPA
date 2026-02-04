"use client";

import { useEffect, useState } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import StatsCard from "@/components/StatsCard";
import { Attendance, AttendanceStats } from "@/types";

export default function ReportsPage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "custom">("month");
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const response = await fetch(`/api/attendance?${params}`);
      const data: Attendance[] = await response.json();
      setAttendances(data);

      // Calculate stats
      const presentDays = data.filter((a) => a.status === "PRESENT").length;
      const lateDays = data.filter((a) => a.status === "LATE").length;
      const absentDays = data.filter((a) => a.status === "ABSENT").length;
      const halfDays = data.filter((a) => a.status === "HALF_DAY").length;
      const totalWorkHours = data.reduce((sum, a) => sum + (a.workHours || 0), 0);
      const workingDays = data.filter((a) => a.workHours && a.workHours > 0).length;

      setStats({
        totalDays: data.length,
        presentDays,
        absentDays,
        lateDays,
        halfDays,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        averageWorkHours: workingDays > 0 ? Math.round((totalWorkHours / workingDays) * 100) / 100 : 0,
      });
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handlePeriodChange = (newPeriod: "week" | "month" | "custom") => {
    setPeriod(newPeriod);
    const now = new Date();

    if (newPeriod === "week") {
      setDateRange({
        startDate: format(subDays(now, 7), "yyyy-MM-dd"),
        endDate: format(now, "yyyy-MM-dd"),
      });
    } else if (newPeriod === "month") {
      setDateRange({
        startDate: format(startOfMonth(now), "yyyy-MM-dd"),
        endDate: format(endOfMonth(now), "yyyy-MM-dd"),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const attendanceRate = stats && stats.totalDays > 0
    ? Math.round(((stats.presentDays + stats.lateDays) / stats.totalDays) * 100)
    : 0;

  const punctualityRate = stats && (stats.presentDays + stats.lateDays) > 0
    ? Math.round((stats.presentDays / (stats.presentDays + stats.lateDays)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">View your attendance analytics and reports</p>
      </div>

      {/* Period Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => handlePeriodChange("week")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === "week"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Last Week
            </button>
            <button
              onClick={() => handlePeriodChange("month")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === "month"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => handlePeriodChange("custom")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === "custom"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Custom
            </button>
          </div>

          {period === "custom" && (
            <div className="flex gap-4">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          subtitle={`${(stats?.presentDays || 0) + (stats?.lateDays || 0)} of ${stats?.totalDays || 0} days`}
          icon="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          color="green"
        />
        <StatsCard
          title="Punctuality Rate"
          value={`${punctualityRate}%`}
          subtitle={`${stats?.presentDays || 0} on-time arrivals`}
          icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          color="blue"
        />
        <StatsCard
          title="Total Work Hours"
          value={`${stats?.totalWorkHours || 0}h`}
          subtitle={`Avg: ${stats?.averageWorkHours || 0}h/day`}
          icon="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          color="purple"
        />
        <StatsCard
          title="Absent Days"
          value={stats?.absentDays || 0}
          subtitle={`${stats?.halfDays || 0} half days`}
          icon="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          color="red"
        />
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Attendance Breakdown
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-700 dark:text-gray-300">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold dark:text-white">{stats?.presentDays || 0}</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">days</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-700 dark:text-gray-300">Late</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold dark:text-white">{stats?.lateDays || 0}</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">days</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-gray-700 dark:text-gray-300">Half Day</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold dark:text-white">{stats?.halfDays || 0}</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">days</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-700 dark:text-gray-300">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold dark:text-white">{stats?.absentDays || 0}</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">days</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Work Hours Summary
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Hours Worked</p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                {stats?.totalWorkHours || 0}h
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average per Day</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {stats?.averageWorkHours || 0}h
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Working Days</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {attendances.filter((a) => a.workHours && a.workHours > 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
