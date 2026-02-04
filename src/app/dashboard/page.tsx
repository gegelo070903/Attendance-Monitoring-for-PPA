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
            icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            color="blue"
          />
          <StatsCard
            title="Present Today"
            value={data.adminStats.todayPresent}
            icon="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            color="green"
          />
          <StatsCard
            title="Absent Today"
            value={data.adminStats.todayAbsent}
            icon="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            color="red"
          />
          <StatsCard
            title="Late Today"
            value={data.adminStats.todayLate}
            icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
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
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
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
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
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
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
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
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
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
