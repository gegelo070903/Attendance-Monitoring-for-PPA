"use client";

import { useEffect, useState } from "react";
import StatsCard from "@/components/StatsCard";

interface AdminStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard?admin=true");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon="👥"
          color="blue"
        />
        <StatsCard
          title="Present Today"
          value={stats.presentToday}
          icon="✅"
          color="green"
        />
        <StatsCard
          title="Absent Today"
          value={stats.absentToday}
          icon="❌"
          color="red"
        />
        <StatsCard
          title="Late Today"
          value={stats.lateToday}
          icon="⏰"
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/admin/employees"
              className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">👥</span>
                <div>
                  <p className="font-medium text-gray-800">Manage Employees</p>
                  <p className="text-sm text-gray-600">Add, edit, or remove employees</p>
                </div>
              </div>
            </a>
            <a
              href="/admin/attendance"
              className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">📋</span>
                <div>
                  <p className="font-medium text-gray-800">View Attendance</p>
                  <p className="text-sm text-gray-600">Monitor all employee attendance</p>
                </div>
              </div>
            </a>
            <a
              href="/admin/settings"
              className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">⚙️</span>
                <div>
                  <p className="font-medium text-gray-800">Settings</p>
                  <p className="text-sm text-gray-600">Configure system settings</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Database</span>
              <span className="flex items-center text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Server</span>
              <span className="flex items-center text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Running
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Last Updated</span>
              <span className="text-gray-800">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
