"use client";

import { useEffect, useState, useRef } from "react";
import { format, startOfMonth, endOfMonth, getDaysInMonth, eachDayOfInterval, isWeekend } from "date-fns";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string | null;
  position: string | null;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  amIn: string | null;
  amOut: string | null;
  pmIn: string | null;
  pmOut: string | null;
  status: string;
  workHours: number | null;
  user: {
    name: string;
    email: string;
    department: string | null;
    position: string | null;
  };
}

interface MonthlyStats {
  totalWorkDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  totalWorkHours: number;
  attendanceRate: number;
}

export default function AdminReportsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [reportType, setReportType] = useState<"organization" | "individual">("organization");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/employees");
        const data = await res.json();
        // Filter only employees (not admins)
        const employeeList = data.filter((e: Employee & { role: string }) => e.role === "EMPLOYEE");
        setEmployees(employeeList);
        if (employeeList.length > 0) {
          setSelectedEmployee(employeeList[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch attendance data
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const [year, month] = selectedMonth.split("-");
        const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
        const endDate = endOfMonth(startDate);

        const params = new URLSearchParams({
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
          all: "true", // Get all employees' attendance
        });

        const res = await fetch(`/api/attendance?${params}`);
        const data = await res.json();
        setAttendanceData(data);
      } catch (error) {
        console.error("Failed to fetch attendance:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [selectedMonth]);

  // Calculate stats for an employee
  const calculateEmployeeStats = (employeeId: string): MonthlyStats => {
    const [year, month] = selectedMonth.split("-");
    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const endDate = endOfMonth(startDate);
    
    // Calculate working days (exclude weekends)
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const workDays = allDays.filter(day => !isWeekend(day));
    const totalWorkDays = workDays.length;

    const employeeAttendance = attendanceData.filter(a => a.userId === employeeId);
    
    const presentDays = employeeAttendance.filter(a => a.status === "PRESENT").length;
    const lateDays = employeeAttendance.filter(a => a.status === "LATE").length;
    const halfDays = employeeAttendance.filter(a => a.status === "HALF_DAY").length;
    const absentDays = totalWorkDays - presentDays - lateDays - halfDays;
    const totalWorkHours = employeeAttendance.reduce((sum, a) => sum + (a.workHours || 0), 0);
    
    const attendanceRate = totalWorkDays > 0 
      ? Math.round(((presentDays + lateDays + halfDays) / totalWorkDays) * 100) 
      : 0;

    return {
      totalWorkDays,
      presentDays,
      absentDays: Math.max(0, absentDays),
      lateDays,
      halfDays,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      attendanceRate,
    };
  };

  // Calculate organization stats
  const calculateOrgStats = (): MonthlyStats => {
    const allStats = employees.map(emp => calculateEmployeeStats(emp.id));
    
    if (allStats.length === 0) {
      return {
        totalWorkDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        halfDays: 0,
        totalWorkHours: 0,
        attendanceRate: 0,
      };
    }

    return {
      totalWorkDays: allStats[0]?.totalWorkDays || 0,
      presentDays: allStats.reduce((sum, s) => sum + s.presentDays, 0),
      absentDays: allStats.reduce((sum, s) => sum + s.absentDays, 0),
      lateDays: allStats.reduce((sum, s) => sum + s.lateDays, 0),
      halfDays: allStats.reduce((sum, s) => sum + s.halfDays, 0),
      totalWorkHours: Math.round(allStats.reduce((sum, s) => sum + s.totalWorkHours, 0) * 100) / 100,
      attendanceRate: Math.round(allStats.reduce((sum, s) => sum + s.attendanceRate, 0) / allStats.length),
    };
  };

  // Get employee attendance for the month
  const getEmployeeMonthlyAttendance = (employeeId: string) => {
    const [year, month] = selectedMonth.split("-");
    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const endDate = endOfMonth(startDate);
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return allDays.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const attendance = attendanceData.find(
        a => a.userId === employeeId && a.date.startsWith(dateStr)
      );
      
      return {
        date: day,
        dateStr,
        isWeekend: isWeekend(day),
        attendance,
      };
    });
  };

  // Format time for display
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "hh:mm a");
    } catch {
      return "-";
    }
  };

  // Print function
  const handlePrint = () => {
    setGenerating(true);
    setTimeout(() => {
      window.print();
      setGenerating(false);
    }, 500);
  };

  const monthName = format(new Date(selectedMonth + "-01"), "MMMM yyyy");
  const currentDate = format(new Date(), "MMMM dd, yyyy");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ppa-navy"></div>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          
          /* Remove dark class from html when printing */
          html.dark {
            color-scheme: light !important;
          }
          
          /* Hide everything except print area */
          body * {
            visibility: hidden;
          }
          
          #print-area, #print-area * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          
          /* Force white background for main container */
          #print-area,
          #print-area > div,
          #print-area .rounded-md,
          #print-area .rounded-lg,
          #print-area .rounded-xl {
            background-color: white !important;
          }
          
          /* Override dark mode table rows */
          #print-area tr[class*="dark:bg-gray"] {
            background-color: white !important;
          }
          #print-area tr:nth-child(even) {
            background-color: #f9fafb !important;
          }
          
          /* Force black text for all elements */
          #print-area,
          #print-area div,
          #print-area p,
          #print-area span,
          #print-area td,
          #print-area h1,
          #print-area h2,
          #print-area h3,
          #print-area .dark\\:text-white,
          #print-area .dark\\:text-gray-100,
          #print-area .dark\\:text-gray-200,
          #print-area .dark\\:text-gray-300,
          #print-area .dark\\:text-gray-400,
          #print-area .dark\\:text-ppa-light {
            color: black !important;
          }
          
          /* Keep table header navy */
          #print-area thead tr,
          #print-area thead tr.bg-ppa-navy {
            background-color: #0d3a5c !important;
          }
          
          #print-area thead th {
            background-color: #0d3a5c !important;
            color: white !important;
          }
          
          /* Table rows - force white/light gray */
          #print-area tbody tr {
            background-color: white !important;
            color: black !important;
          }
          
          #print-area tbody tr:nth-child(even) {
            background-color: #f9fafb !important;
          }
          
          /* Stats cards with colored left border - use attribute selector for dark mode */
          #print-area div[class*="bg-green-50"],
          #print-area div[class*="bg-green-900"] {
            background-color: #dcfce7 !important;
            border-left: 4px solid #22c55e !important;
          }
          #print-area div[class*="bg-red-50"],
          #print-area div[class*="bg-red-900"] {
            background-color: #fee2e2 !important;
            border-left: 4px solid #ef4444 !important;
          }
          #print-area div[class*="bg-yellow-50"],
          #print-area div[class*="bg-yellow-900"] {
            background-color: #fef9c3 !important;
            border-left: 4px solid #eab308 !important;
          }
          #print-area div[class*="bg-blue-50"],
          #print-area div[class*="bg-blue-900"] {
            background-color: #dbeafe !important;
            border-left: 4px solid #3b82f6 !important;
          }
          #print-area div[class*="border-ppa-navy"][class*="bg-ppa"] {
            background-color: #e0f2fe !important;
            border-left: 4px solid #0d3a5c !important;
          }
          
          /* Stats card text colors - use attribute selectors */
          #print-area [class*="text-green-600"],
          #print-area [class*="text-green-700"],
          #print-area [class*="text-green-300"],
          #print-area [class*="text-green-400"] {
            color: #15803d !important;
          }
          #print-area [class*="text-red-600"],
          #print-area [class*="text-red-700"],
          #print-area [class*="text-red-300"],
          #print-area [class*="text-red-400"] {
            color: #b91c1c !important;
          }
          #print-area [class*="text-yellow-600"],
          #print-area [class*="text-yellow-700"],
          #print-area [class*="text-yellow-300"],
          #print-area [class*="text-yellow-400"] {
            color: #a16207 !important;
          }
          #print-area [class*="text-blue-600"],
          #print-area [class*="text-blue-700"],
          #print-area [class*="text-blue-300"],
          #print-area [class*="text-blue-400"] {
            color: #1d4ed8 !important;
          }
          
          /* All other text should be black */
          #print-area [class*="text-gray"],
          #print-area [class*="dark:text-gray"],
          #print-area [class*="dark:text-white"] {
            color: #111827 !important;
          }
          
          /* Navy titles */
          #print-area [class*="text-ppa-navy"],
          #print-area [class*="text-ppa-light"] {
            color: #0d3a5c !important;
          }
          
          /* Status badges in table */
          #print-area span[class*="bg-green-100"] {
            background-color: #dcfce7 !important;
            color: #15803d !important;
          }
          #print-area span[class*="bg-red-100"] {
            background-color: #fee2e2 !important;
            color: #b91c1c !important;
          }
          #print-area span[class*="bg-yellow-100"] {
            background-color: #fef9c3 !important;
            color: #a16207 !important;
          }
          #print-area span[class*="bg-orange-100"] {
            background-color: #ffedd5 !important;
            color: #c2410c !important;
          }
          
          /* Table cell borders */
          #print-area td,
          #print-area th {
            border-color: #d1d5db !important;
          }
          
          /* Employee info box */
          #print-area [class*="bg-gray-50"],
          #print-area [class*="bg-gray-700"],
          #print-area [class*="bg-gray-800"] {
            background-color: #f9fafb !important;
          }
          
          /* Border colors */
          #print-area [class*="border-gray"],
          #print-area [class*="border-ppa"] {
            border-color: #d1d5db !important;
          }
          
          /* Table header border - keep navy bottom */
          #print-area .border-b-2[class*="border-ppa"] {
            border-bottom-color: #0d3a5c !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-break {
            page-break-before: always;
          }
          
          /* Print-specific stat card overrides - these have highest priority */
          .print-stat-green {
            background-color: #dcfce7 !important;
            border-left: 4px solid #22c55e !important;
          }
          .print-stat-green p {
            color: #15803d !important;
          }
          
          .print-stat-red {
            background-color: #fee2e2 !important;
            border-left: 4px solid #ef4444 !important;
          }
          .print-stat-red p {
            color: #b91c1c !important;
          }
          
          .print-stat-yellow {
            background-color: #fef9c3 !important;
            border-left: 4px solid #eab308 !important;
          }
          .print-stat-yellow p {
            color: #a16207 !important;
          }
          
          .print-stat-blue {
            background-color: #dbeafe !important;
            border-left: 4px solid #3b82f6 !important;
          }
          .print-stat-blue p {
            color: #1d4ed8 !important;
          }
          
          .print-stat-navy {
            background-color: #e0f2fe !important;
            border-left: 4px solid #0d3a5c !important;
          }
          .print-stat-navy span {
            color: #0d3a5c !important;
          }
          
          /* Table row overrides */
          #print-area table tbody tr {
            background-color: white !important;
          }
          #print-area table tbody tr:nth-child(even) {
            background-color: #f9fafb !important;
          }
          #print-area table tbody tr td {
            color: #111827 !important;
          }
          
          /* Weekend rows - light gray */
          #print-area table tbody tr.bg-gray-100,
          #print-area table tbody tr[class*="bg-gray-100"] {
            background-color: #f3f4f6 !important;
          }
          #print-area table tbody tr[class*="bg-gray-100"] td {
            color: #9ca3af !important;
          }
          
          /* Print row classes with highest specificity */
          #print-area .print-row-even {
            background-color: white !important;
          }
          #print-area .print-row-even td {
            color: #111827 !important;
          }
          #print-area .print-row-odd {
            background-color: #f9fafb !important;
          }
          #print-area .print-row-odd td {
            color: #111827 !important;
          }
          #print-area .print-row-weekend {
            background-color: #f3f4f6 !important;
          }
          #print-area .print-row-weekend td {
            color: #9ca3af !important;
          }
          
          /* Status badges in print */
          #print-area span[class*="bg-green-100"],
          #print-area span[class*="bg-green-900"] {
            background-color: #dcfce7 !important;
            color: #15803d !important;
          }
          #print-area span[class*="bg-red-100"],
          #print-area span[class*="bg-red-900"] {
            background-color: #fee2e2 !important;
            color: #b91c1c !important;
          }
          #print-area span[class*="bg-yellow-100"],
          #print-area span[class*="bg-yellow-900"] {
            background-color: #fef9c3 !important;
            color: #a16207 !important;
          }
          #print-area span[class*="bg-orange-100"],
          #print-area span[class*="bg-orange-900"] {
            background-color: #ffedd5 !important;
            color: #c2410c !important;
          }
          
          table {
            font-size: 9pt;
          }
          
          th, td {
            padding: 4px 6px !important;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Controls - Hidden when printing */}
        <div className="no-print">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Reports</h1>
              <p className="text-gray-600 dark:text-gray-400">Generate and print attendance reports</p>
            </div>
            <button
              onClick={handlePrint}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-ppa-navy text-white rounded-lg hover:bg-ppa-blue transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {generating ? "Preparing..." : "Print Report"}
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ppa-navy focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as "organization" | "individual")}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ppa-navy focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="organization">Whole Organization</option>
                  <option value="individual">Individual Employee</option>
                </select>
              </div>
              {reportType === "individual" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Employee
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ppa-navy focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} - {emp.department || "N/A"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Printable Report Area */}
        <div id="print-area" ref={printRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
          {/* Report Header */}
          <div className="mb-8 border-b-2 border-ppa-navy dark:border-ppa-light pb-6">
            <div className="relative">
              {/* Logo on far right */}
              <div className="absolute right-0 top-0">
                <img
                  src="/images/download-removebg-preview.png"
                  alt="PPA Logo"
                  className="w-24 h-24 object-contain"
                />
              </div>
              {/* Centered content */}
              <div className="text-center">
                <h1 className="text-2xl font-bold text-ppa-navy dark:text-ppa-light">PHILIPPINE PORTS AUTHORITY</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Attendance Monitoring System</p>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-4">
                  Monthly Attendance Sheet
                </h2>
                <p className="text-gray-600 dark:text-gray-400">For the Month of {monthName}</p>
              </div>
            </div>
          </div>

          {reportType === "organization" ? (
            // Organization Report
            <>
              {/* Summary Stats */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-ppa-navy dark:text-ppa-light mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">Summary Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print-stats-grid">
                  {(() => {
                    const stats = calculateOrgStats();
                    return (
                      <>
                        <div className="print-stat-green bg-green-50 dark:bg-green-900/30 p-3 rounded-md border-l-4 border-green-500">
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Total Present Days</p>
                          <p className="text-xl font-bold text-green-700 dark:text-green-300">{stats.presentDays}</p>
                        </div>
                        <div className="print-stat-red bg-red-50 dark:bg-red-900/30 p-3 rounded-md border-l-4 border-red-500">
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium">Total Absent Days</p>
                          <p className="text-xl font-bold text-red-700 dark:text-red-300">{stats.absentDays}</p>
                        </div>
                        <div className="print-stat-yellow bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md border-l-4 border-yellow-500">
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Total Late Days</p>
                          <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{stats.lateDays}</p>
                        </div>
                        <div className="print-stat-blue bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md border-l-4 border-blue-500">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Avg. Attendance Rate</p>
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.attendanceRate}%</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Employee Summary Table */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-ppa-navy dark:text-ppa-light mb-4 border-b border-gray-300 dark:border-gray-600 pb-2">Employee Attendance Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                    <thead>
                      <tr className="bg-ppa-navy text-white">
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm">Employee Name</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm">Department</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm">Present</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm">Late</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm">Half Day</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm">Absent</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm">Total Hours</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp, idx) => {
                        const stats = calculateEmployeeStats(emp.id);
                        return (
                          <tr key={emp.id} className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700"}>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{emp.name}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{emp.department || "N/A"}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm text-green-600 dark:text-green-400 font-medium">{stats.presentDays}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400 font-medium">{stats.lateDays}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm text-orange-600 dark:text-orange-400 font-medium">{stats.halfDays}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm text-red-600 dark:text-red-400 font-medium">{stats.absentDays}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm text-gray-700 dark:text-gray-300">{stats.totalWorkHours}h</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-bold text-gray-900 dark:text-gray-100">{stats.attendanceRate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            // Individual Report
            <>
              {(() => {
                const employee = employees.find(e => e.id === selectedEmployee);
                const stats = calculateEmployeeStats(selectedEmployee);
                const monthlyData = getEmployeeMonthlyAttendance(selectedEmployee);

                if (!employee) {
                  return <p className="text-center text-gray-500 dark:text-gray-400">No employee selected</p>;
                }

                return (
                  <>
                    {/* Employee Info */}
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Employee Name</p>
                          <p className="font-semibold text-ppa-navy dark:text-ppa-light">{employee.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                          <p className="font-semibold text-ppa-navy dark:text-ppa-light">{employee.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                          <p className="font-semibold text-ppa-navy dark:text-ppa-light">{employee.department || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Position</p>
                          <p className="font-semibold text-ppa-navy dark:text-ppa-light">{employee.position || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Individual Stats */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-ppa-navy dark:text-ppa-light mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">Monthly Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print-stats-grid">
                        <div className="print-stat-green bg-green-50 dark:bg-green-900/30 p-3 rounded-md border-l-4 border-green-500">
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Present Days</p>
                          <p className="text-xl font-bold text-green-700 dark:text-green-300">{stats.presentDays}</p>
                        </div>
                        <div className="print-stat-red bg-red-50 dark:bg-red-900/30 p-3 rounded-md border-l-4 border-red-500">
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium">Absent Days</p>
                          <p className="text-xl font-bold text-red-700 dark:text-red-300">{stats.absentDays}</p>
                        </div>
                        <div className="print-stat-yellow bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md border-l-4 border-yellow-500">
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Late Days</p>
                          <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{stats.lateDays}</p>
                        </div>
                        <div className="print-stat-blue bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md border-l-4 border-blue-500">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Work Hours</p>
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.totalWorkHours}h</p>
                        </div>
                      </div>
                      <div className="mt-3 p-3 print-stat-navy bg-ppa-light/30 dark:bg-ppa-navy/30 rounded-md border-l-4 border-ppa-navy">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-ppa-navy dark:text-ppa-light">Attendance Rate:</span>
                          <span className="text-xl font-bold text-ppa-navy dark:text-ppa-light">{stats.attendanceRate}%</span>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-ppa-navy to-ppa-blue rounded-full transition-all duration-500"
                            style={{ width: `${stats.attendanceRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Daily Attendance Table */}
                    <div>
                      <h3 className="text-lg font-semibold text-ppa-navy dark:text-ppa-light mb-4 border-b border-gray-300 dark:border-gray-600 pb-2">Daily Attendance Record</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 text-sm">
                          <thead>
                            <tr className="bg-ppa-navy text-white">
                              <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left">Date</th>
                              <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left">Day</th>
                              <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center">AM In</th>
                              <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center">AM Out</th>
                              <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center">PM In</th>
                              <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center">PM Out</th>
                              <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center">Status</th>
                              <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center">Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthlyData.map((day, idx) => (
                              <tr 
                                key={day.dateStr} 
                                className={
                                  day.isWeekend 
                                    ? "print-row-weekend bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500" 
                                    : idx % 2 === 0 
                                      ? "print-row-even bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                      : "print-row-odd bg-gray-50 dark:bg-gray-750 text-gray-900 dark:text-gray-100"
                                }
                              >
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                                  {format(day.date, "MMM dd, yyyy")}
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                                  {format(day.date, "EEEE")}
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                                  {day.isWeekend ? "-" : formatTime(day.attendance?.amIn || null)}
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                                  {day.isWeekend ? "-" : formatTime(day.attendance?.amOut || null)}
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                                  {day.isWeekend ? "-" : formatTime(day.attendance?.pmIn || null)}
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                                  {day.isWeekend ? "-" : formatTime(day.attendance?.pmOut || null)}
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                                  {day.isWeekend ? (
                                    <span className="text-gray-400 dark:text-gray-500">Weekend</span>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      day.attendance?.status === "PRESENT" ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" :
                                      day.attendance?.status === "LATE" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400" :
                                      day.attendance?.status === "HALF_DAY" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400" :
                                      "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                                    }`}>
                                      {day.attendance?.status || "ABSENT"}
                                    </span>
                                  )}
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                                  {day.isWeekend ? "-" : (day.attendance?.workHours?.toFixed(1) || "0") + "h"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          )}

          {/* Report Footer */}
          <div className="mt-8 pt-6 border-t border-gray-300 dark:border-gray-600">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Generated on: {currentDate}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Report Period: {monthName}</p>
              </div>
              <div className="text-right">
                <div className="mt-8 pt-4 border-t border-gray-400 dark:border-gray-500 inline-block min-w-[200px]">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Authorized Signature</p>
                </div>
              </div>
            </div>
            <div className="text-center mt-6 text-xs text-gray-400 dark:text-gray-500">
              <p>Philippine Ports Authority - Attendance Monitoring System</p>
              <p>This is a computer-generated report.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
