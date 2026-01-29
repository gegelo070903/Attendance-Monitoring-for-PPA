"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatsCard from "@/components/StatsCard";

interface DashboardData {
  todayAttendance: {
    amIn: string | null;
    amOut: string | null;
    pmIn: string | null;
    pmOut: string | null;
  } | null;
  monthlyStats: {
    presentDays: number;
    lateDays: number;
    absentDays: number;
    totalWorkHours: number;
    totalDays: number;
  };
  adminStats: {
    totalEmployees: number;
    todayPresent: number;
    todayAbsent: number;
    todayLate: number;
  } | null;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchData = async () => {
    try {
      const response = await fetch("/api/dashboard");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-ppa-navy dark:text-blue-400">
            {currentTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Time</p>
        </div>
      </div>

      {/* Admin Stats */}
      {isAdmin && data?.adminStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Employees"
            value={data.adminStats.totalEmployees}
            icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            color="blue"
          />
          <StatsCard
            title="Present Today"
            value={data.adminStats.todayPresent}
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            color="green"
          />
          <StatsCard
            title="Absent Today"
            value={data.adminStats.todayAbsent}
            icon="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            color="red"
          />
          <StatsCard
            title="Late Today"
            value={data.adminStats.todayLate}
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            color="yellow"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* QR Code Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              My QR Code
            </h3>
            
            {/* Today's Status - AM/PM */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Today&apos;s Attendance:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">AM In</p>
                  <p className={`text-sm font-semibold ${data?.todayAttendance?.amIn ? 'text-green-700 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {data?.todayAttendance?.amIn 
                      ? new Date(data.todayAttendance.amIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                      : '--:--'}
                  </p>
                </div>
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">AM Out</p>
                  <p className={`text-sm font-semibold ${data?.todayAttendance?.amOut ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {data?.todayAttendance?.amOut 
                      ? new Date(data.todayAttendance.amOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                      : '--:--'}
                  </p>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">PM In</p>
                  <p className={`text-sm font-semibold ${data?.todayAttendance?.pmIn ? 'text-blue-700 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {data?.todayAttendance?.pmIn 
                      ? new Date(data.todayAttendance.pmIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                      : '--:--'}
                  </p>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">PM Out</p>
                  <p className={`text-sm font-semibold ${data?.todayAttendance?.pmOut ? 'text-purple-700 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {data?.todayAttendance?.pmOut 
                      ? new Date(data.todayAttendance.pmOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                      : '--:--'}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/my-qr"
              className="block w-full py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View My QR Code
            </Link>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
              Show your QR code at the scanning station
            </p>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              This Month&apos;s Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard
                title="Present Days"
                value={data?.monthlyStats.presentDays || 0}
                icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                color="green"
              />
              <StatsCard
                title="Late Days"
                value={data?.monthlyStats.lateDays || 0}
                icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                color="yellow"
              />
              <StatsCard
                title="Absent Days"
                value={data?.monthlyStats.absentDays || 0}
                icon="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                color="red"
              />
              <StatsCard
                title="Work Hours"
                value={`${data?.monthlyStats.totalWorkHours || 0}h`}
                icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                color="purple"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push("/dashboard/attendance")}
            className="p-4 bg-gradient-to-br from-ppa-navy/5 to-ppa-blue/10 dark:from-ppa-navy/20 dark:to-ppa-blue/30 rounded-lg hover:from-ppa-navy/10 hover:to-ppa-blue/20 dark:hover:from-ppa-navy/30 dark:hover:to-ppa-blue/40 transition-all text-left border border-ppa-navy/10 dark:border-ppa-navy/30"
          >
            <svg
              className="w-8 h-8 text-ppa-navy dark:text-blue-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="font-medium text-gray-900 dark:text-white">View Attendance</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Check your records</p>
          </button>

          <button
            onClick={() => router.push("/dashboard/reports")}
            className="p-4 bg-gradient-to-br from-ppa-navy/5 to-ppa-blue/10 dark:from-ppa-navy/20 dark:to-ppa-blue/30 rounded-lg hover:from-ppa-navy/10 hover:to-ppa-blue/20 dark:hover:from-ppa-navy/30 dark:hover:to-ppa-blue/40 transition-all text-left border border-ppa-navy/10 dark:border-ppa-navy/30"
          >
            <svg
              className="w-8 h-8 text-ppa-blue dark:text-blue-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="font-medium text-gray-900 dark:text-white">Reports</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">View analytics</p>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => router.push("/admin/employees")}
                className="p-4 bg-gradient-to-br from-accent-gold/5 to-accent-red/10 dark:from-accent-gold/20 dark:to-accent-red/30 rounded-lg hover:from-accent-gold/10 hover:to-accent-red/20 dark:hover:from-accent-gold/30 dark:hover:to-accent-red/40 transition-all text-left border border-accent-gold/20 dark:border-accent-gold/40"
              >
                <svg
                  className="w-8 h-8 text-accent-red mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <p className="font-medium text-gray-900 dark:text-white">Employees</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage staff</p>
              </button>

              <button
                onClick={() => router.push("/admin/attendance")}
                className="p-4 bg-gradient-to-br from-accent-gold/5 to-accent-red/10 dark:from-accent-gold/20 dark:to-accent-red/30 rounded-lg hover:from-accent-gold/10 hover:to-accent-red/20 dark:hover:from-accent-gold/30 dark:hover:to-accent-red/40 transition-all text-left border border-accent-gold/20 dark:border-accent-gold/40"
              >
                <svg
                  className="w-8 h-8 text-accent-gold mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                <p className="font-medium text-gray-900 dark:text-white">All Attendance</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">View all records</p>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
