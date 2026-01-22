"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import StatsCard from "@/components/StatsCard";
import CheckInOutButton from "@/components/CheckInOutButton";

interface DashboardData {
  todayAttendance: {
    checkIn: string | null;
    checkOut: string | null;
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

  const handleCheckIn = async () => {
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Check in failed:", error);
    }
  };

  const handleCheckOut = async () => {
    try {
      const response = await fetch("/api/attendance", {
        method: "PUT",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Check out failed:", error);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="text-gray-600">
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-primary-600">
            {currentTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-sm text-gray-500">Current Time</p>
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
        {/* Check In/Out Card */}
        <div className="lg:col-span-1">
          <CheckInOutButton
            hasCheckedIn={!!data?.todayAttendance?.checkIn}
            hasCheckedOut={!!data?.todayAttendance?.checkOut}
            checkInTime={
              data?.todayAttendance?.checkIn
                ? new Date(data.todayAttendance.checkIn)
                : null
            }
            checkOutTime={
              data?.todayAttendance?.checkOut
                ? new Date(data.todayAttendance.checkOut)
                : null
            }
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
          />
        </div>

        {/* Monthly Stats */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push("/dashboard/attendance")}
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <svg
              className="w-8 h-8 text-primary-600 mb-2"
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
            <p className="font-medium text-gray-900">View Attendance</p>
            <p className="text-sm text-gray-500">Check your records</p>
          </button>

          <button
            onClick={() => router.push("/dashboard/reports")}
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <svg
              className="w-8 h-8 text-primary-600 mb-2"
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
            <p className="font-medium text-gray-900">Reports</p>
            <p className="text-sm text-gray-500">View analytics</p>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => router.push("/admin/employees")}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <svg
                  className="w-8 h-8 text-primary-600 mb-2"
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
                <p className="font-medium text-gray-900">Employees</p>
                <p className="text-sm text-gray-500">Manage staff</p>
              </button>

              <button
                onClick={() => router.push("/admin/attendance")}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <svg
                  className="w-8 h-8 text-primary-600 mb-2"
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
                <p className="font-medium text-gray-900">All Attendance</p>
                <p className="text-sm text-gray-500">View all records</p>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
