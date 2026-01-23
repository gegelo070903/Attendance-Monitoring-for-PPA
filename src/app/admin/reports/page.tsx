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
          
          body * {
            visibility: hidden;
          }
          
          #print-area, #print-area * {
            visibility: visible;
          }
          
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-break {
            page-break-before: always;
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
        <div id="print-area" ref={printRef} className="bg-white rounded-xl shadow-md p-8">
          {/* Report Header */}
          <div className="mb-8 border-b-2 border-ppa-navy pb-6">
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
                <h1 className="text-2xl font-bold text-ppa-navy">PHILIPPINE PORTS AUTHORITY</h1>
                <p className="text-gray-600 text-sm">Attendance Monitoring System</p>
                <h2 className="text-xl font-semibold text-gray-800 mt-4">
                  Monthly Attendance Sheet
                </h2>
                <p className="text-gray-600">For the Month of {monthName}</p>
              </div>
            </div>
          </div>

          {reportType === "organization" ? (
            // Organization Report
            <>
              {/* Summary Stats */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-ppa-navy mb-4 border-b pb-2">Summary Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const stats = calculateOrgStats();
                    return (
                      <>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <p className="text-sm text-green-600 font-medium">Total Present Days</p>
                          <p className="text-2xl font-bold text-green-700">{stats.presentDays}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <p className="text-sm text-red-600 font-medium">Total Absent Days</p>
                          <p className="text-2xl font-bold text-red-700">{stats.absentDays}</p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <p className="text-sm text-yellow-600 font-medium">Total Late Days</p>
                          <p className="text-2xl font-bold text-yellow-700">{stats.lateDays}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-600 font-medium">Avg. Attendance Rate</p>
                          <p className="text-2xl font-bold text-blue-700">{stats.attendanceRate}%</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Employee Summary Table */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-ppa-navy mb-4 border-b pb-2">Employee Attendance Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-ppa-navy text-white">
                        <th className="border border-gray-300 px-3 py-2 text-left text-sm">Employee Name</th>
                        <th className="border border-gray-300 px-3 py-2 text-left text-sm">Department</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm">Present</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm">Late</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm">Half Day</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm">Absent</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm">Total Hours</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp, idx) => {
                        const stats = calculateEmployeeStats(emp.id);
                        return (
                          <tr key={emp.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="border border-gray-300 px-3 py-2 text-sm font-medium">{emp.name}</td>
                            <td className="border border-gray-300 px-3 py-2 text-sm">{emp.department || "N/A"}</td>
                            <td className="border border-gray-300 px-3 py-2 text-center text-sm text-green-600 font-medium">{stats.presentDays}</td>
                            <td className="border border-gray-300 px-3 py-2 text-center text-sm text-yellow-600 font-medium">{stats.lateDays}</td>
                            <td className="border border-gray-300 px-3 py-2 text-center text-sm text-orange-600 font-medium">{stats.halfDays}</td>
                            <td className="border border-gray-300 px-3 py-2 text-center text-sm text-red-600 font-medium">{stats.absentDays}</td>
                            <td className="border border-gray-300 px-3 py-2 text-center text-sm">{stats.totalWorkHours}h</td>
                            <td className="border border-gray-300 px-3 py-2 text-center text-sm font-bold">{stats.attendanceRate}%</td>
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
                  return <p className="text-center text-gray-500">No employee selected</p>;
                }

                return (
                  <>
                    {/* Employee Info */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Employee Name</p>
                          <p className="font-semibold text-ppa-navy">{employee.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-semibold text-ppa-navy">{employee.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Department</p>
                          <p className="font-semibold text-ppa-navy">{employee.department || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Position</p>
                          <p className="font-semibold text-ppa-navy">{employee.position || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Individual Stats */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-ppa-navy mb-4 border-b pb-2">Monthly Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <p className="text-sm text-green-600 font-medium">Present Days</p>
                          <p className="text-2xl font-bold text-green-700">{stats.presentDays}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <p className="text-sm text-red-600 font-medium">Absent Days</p>
                          <p className="text-2xl font-bold text-red-700">{stats.absentDays}</p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <p className="text-sm text-yellow-600 font-medium">Late Days</p>
                          <p className="text-2xl font-bold text-yellow-700">{stats.lateDays}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-600 font-medium">Total Work Hours</p>
                          <p className="text-2xl font-bold text-blue-700">{stats.totalWorkHours}h</p>
                        </div>
                      </div>
                      <div className="mt-4 p-4 bg-ppa-light/30 rounded-lg border border-ppa-blue/30">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-ppa-navy">Attendance Rate:</span>
                          <span className="text-2xl font-bold text-ppa-navy">{stats.attendanceRate}%</span>
                        </div>
                        <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-ppa-navy to-ppa-blue rounded-full transition-all duration-500"
                            style={{ width: `${stats.attendanceRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Daily Attendance Table */}
                    <div>
                      <h3 className="text-lg font-semibold text-ppa-navy mb-4 border-b pb-2">Daily Attendance Record</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                          <thead>
                            <tr className="bg-ppa-navy text-white">
                              <th className="border border-gray-300 px-2 py-2 text-left">Date</th>
                              <th className="border border-gray-300 px-2 py-2 text-left">Day</th>
                              <th className="border border-gray-300 px-2 py-2 text-center">AM In</th>
                              <th className="border border-gray-300 px-2 py-2 text-center">AM Out</th>
                              <th className="border border-gray-300 px-2 py-2 text-center">PM In</th>
                              <th className="border border-gray-300 px-2 py-2 text-center">PM Out</th>
                              <th className="border border-gray-300 px-2 py-2 text-center">Status</th>
                              <th className="border border-gray-300 px-2 py-2 text-center">Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthlyData.map((day, idx) => (
                              <tr 
                                key={day.dateStr} 
                                className={
                                  day.isWeekend 
                                    ? "bg-gray-100 text-gray-400" 
                                    : idx % 2 === 0 
                                      ? "bg-white" 
                                      : "bg-gray-50"
                                }
                              >
                                <td className="border border-gray-300 px-2 py-1">
                                  {format(day.date, "MMM dd, yyyy")}
                                </td>
                                <td className="border border-gray-300 px-2 py-1">
                                  {format(day.date, "EEEE")}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-center">
                                  {day.isWeekend ? "-" : formatTime(day.attendance?.amIn || null)}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-center">
                                  {day.isWeekend ? "-" : formatTime(day.attendance?.amOut || null)}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-center">
                                  {day.isWeekend ? "-" : formatTime(day.attendance?.pmIn || null)}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-center">
                                  {day.isWeekend ? "-" : formatTime(day.attendance?.pmOut || null)}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-center">
                                  {day.isWeekend ? (
                                    <span className="text-gray-400">Weekend</span>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      day.attendance?.status === "PRESENT" ? "bg-green-100 text-green-700" :
                                      day.attendance?.status === "LATE" ? "bg-yellow-100 text-yellow-700" :
                                      day.attendance?.status === "HALF_DAY" ? "bg-orange-100 text-orange-700" :
                                      "bg-red-100 text-red-700"
                                    }`}>
                                      {day.attendance?.status || "ABSENT"}
                                    </span>
                                  )}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-center">
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
          <div className="mt-8 pt-6 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-600">Generated on: {currentDate}</p>
                <p className="text-sm text-gray-600">Report Period: {monthName}</p>
              </div>
              <div className="text-right">
                <div className="mt-8 pt-4 border-t border-gray-400 inline-block min-w-[200px]">
                  <p className="text-sm text-gray-600">Authorized Signature</p>
                </div>
              </div>
            </div>
            <div className="text-center mt-6 text-xs text-gray-400">
              <p>Philippine Ports Authority - Attendance Monitoring System</p>
              <p>This is a computer-generated report.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
