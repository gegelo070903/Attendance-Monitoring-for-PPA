"use client";

import { useEffect, useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import AttendanceTable from "@/components/AttendanceTable";
import { Attendance } from "@/types";

interface Employee {
  id: string;
  name: string;
  department: string | null;
}

export default function AdminAttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  // Get unique departments from employees
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    employees.forEach(emp => {
      if (emp.department) {
        deptSet.add(emp.department);
      }
    });
    return Array.from(deptSet).sort();
  }, [employees]);

  // Filter attendances by selected department
  const filteredAttendances = useMemo(() => {
    if (selectedDepartment === "all") {
      return attendances;
    }
    // Find employee IDs that belong to the selected department
    const deptEmployeeIds = employees
      .filter(emp => emp.department === selectedDepartment)
      .map(emp => emp.id);
    return attendances.filter(a => deptEmployeeIds.includes(a.userId));
  }, [attendances, employees, selectedDepartment]);

  // Fetch employees for department filtering
  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      const data = await response.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

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
      if (Array.isArray(data)) {
        setAttendances(data);
      } else {
        setAttendances([]);
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [dateRange]);

  // Calculate summary stats based on filtered attendances
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayAttendances = filteredAttendances.filter(
    (a) => format(new Date(a.date), "yyyy-MM-dd") === todayStr
  );

  const presentToday = todayAttendances.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  ).length;
  const lateToday = todayAttendances.filter((a) => a.status === "LATE").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Attendance</h1>
        <p className="text-gray-600 dark:text-gray-400">View attendance records for all employees</p>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Present Today</p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-400">{presentToday}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-800/50 rounded-xl flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Late Today</p>
              <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{lateToday}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-800/50 rounded-xl flex items-center justify-center">
              <svg
                className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Records</p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {filteredAttendances.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800/50 rounded-xl flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
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
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
            className="px-4 py-2 bg-primary-100 dark:bg-ppa-navy/30 text-primary-700 dark:text-blue-300 rounded-lg hover:bg-primary-200 dark:hover:bg-ppa-navy/50 transition-colors"
          >
            This Month
          </button>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[180px]"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        {selectedDepartment !== "all" && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              📁 Showing attendance for <strong>{selectedDepartment}</strong> department ({filteredAttendances.length} records)
            </p>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <AttendanceTable attendances={filteredAttendances} showUser={true} />
        )}
      </div>
    </div>
  );
}
