"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
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

interface DailyDisplayAttendance {
  amIn: string | null;
  amOut: string | null;
  pmIn: string | null;
  pmOut: string | null;
  workHours: number | null;
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
// Utility function to format hours and minutes
import { differenceInMinutes, parseISO } from "date-fns";
function formatHoursAndMinutes(hours: number | undefined | null) {
  if (!hours || isNaN(hours)) return "0h 0m";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function calcWorkHours(amIn: string | null, amOut: string | null, pmIn: string | null, pmOut: string | null) {
  let total = 0;
  if (amIn && amOut) {
    total += differenceInMinutes(parseISO(amOut), parseISO(amIn));
  }
  if (pmIn && pmOut) {
    total += differenceInMinutes(parseISO(pmOut), parseISO(pmIn));
  }
  return Math.round((total / 60) * 100) / 100;
}

function toLocalDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminReportsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [reportType, setReportType] = useState<"organization" | "individual">("organization");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [individualDepartment, setIndividualDepartment] = useState<string>("all");
  const printRef = useRef<HTMLDivElement>(null);

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

  // Filter employees by selected department
  const filteredEmployees = useMemo(() => {
    if (selectedDepartment === "all") {
      // Sort by department name for grouping
      return [...employees].sort((a, b) => {
        const deptA = a.department || "Unassigned";
        const deptB = b.department || "Unassigned";
        return deptA.localeCompare(deptB);
      });
    }
    return employees.filter(emp => emp.department === selectedDepartment);
  }, [employees, selectedDepartment]);

  // Filter employees by department for individual report
  const individualFilteredEmployees = useMemo(() => {
    if (individualDepartment === "all") {
      return [...employees].sort((a, b) => {
        const deptA = a.department || "Unassigned";
        const deptB = b.department || "Unassigned";
        if (deptA !== deptB) return deptA.localeCompare(deptB);
        return a.name.localeCompare(b.name);
      });
    }
    return employees.filter(emp => emp.department === individualDepartment).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, individualDepartment]);

  // Group employees by department
  const employeesByDepartment = useMemo(() => {
    const grouped: { [key: string]: Employee[] } = {};
    filteredEmployees.forEach(emp => {
      const dept = emp.department || "Unassigned";
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(emp);
    });
    return grouped;
  }, [filteredEmployees]);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/employees");
        const data = await res.json();
        // Include all users (employees and admins)
        setEmployees(data);
        if (data.length > 0) {
          setSelectedEmployee(data[0].id);
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

  // Get effective display status for monthly report
  // Determines the correct status based on actual attendance data:
  // Determines the correct status based on actual attendance data:
  // HALF_DAY: only one session completed (AM in+out only, or PM in+out only)
  // LATE on report → displayed as PRESENT
  const getReportStatus = (a: AttendanceRecord): string => {
    const hasCompletedAM = a.amIn && a.amOut;
    const hasCompletedPM = a.pmIn && a.pmOut;
    const hasAnyAM = a.amIn || a.amOut;
    const hasAnyPM = a.pmIn || a.pmOut;

    // HALF_DAY logic: only one session completed
    if (hasCompletedAM && !hasAnyPM) return "HALF_DAY";
    if (hasCompletedPM && !hasAnyAM) return "HALF_DAY";
    // First scan was during PM (missed AM entirely) → HALF_DAY
    if (!hasAnyAM && hasAnyPM) return "HALF_DAY";

    // LATE is displayed as PRESENT on report
    if (a.status === "LATE") return "PRESENT";
    // Fix wrongly stored HALF_DAY (e.g., only amIn, no amOut, no PM = was just late)
    if (a.status === "HALF_DAY" && a.amIn && !hasAnyPM && !hasCompletedAM) return "PRESENT";

    return a.status;
  };

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
    
    const presentDays = employeeAttendance.filter(a => getReportStatus(a) === "PRESENT").length;
    const lateDays = 0; // LATE is now counted as PRESENT
    const halfDays = employeeAttendance.filter(a => getReportStatus(a) === "HALF_DAY").length;
    const absentDays = totalWorkDays - presentDays - lateDays - halfDays;
    const totalWorkHours = employeeAttendance.reduce((sum, a) => {
      // Use workHours from DB if available, otherwise calculate from time fields
      const hours = (a.workHours && a.workHours > 0)
        ? a.workHours
        : calcWorkHours(
            a.amIn ?? null,
            a.amOut ?? null,
            a.pmIn ?? null,
            a.pmOut ?? null
          );
      return sum + (hours || 0);
    }, 0);
    
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

  // Calculate organization stats (based on filtered employees)
  const calculateOrgStats = (): MonthlyStats => {
    const allStats = filteredEmployees.map(emp => calculateEmployeeStats(emp.id));
    
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

  // Calculate department stats
  const calculateDepartmentStats = (deptEmployees: Employee[]): MonthlyStats => {
    const allStats = deptEmployees.map(emp => calculateEmployeeStats(emp.id));
    
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

    const employeeAttendance = attendanceData.filter(a => a.userId === employeeId);
    const dailyDisplayMap: Record<string, DailyDisplayAttendance> = {};

    const ensureDay = (dateKey: string): DailyDisplayAttendance => {
      if (!dailyDisplayMap[dateKey]) {
        dailyDisplayMap[dateKey] = {
          amIn: null,
          amOut: null,
          pmIn: null,
          pmOut: null,
          workHours: null,
        };
      }
      return dailyDisplayMap[dateKey];
    };

    for (const record of employeeAttendance) {
      const recordDateKey = toLocalDateKey(record.date);
      const recordDay = ensureDay(recordDateKey);

      if (record.amIn) recordDay.amIn = record.amIn;
      if (record.pmIn) recordDay.pmIn = record.pmIn;
      if (record.pmOut) recordDay.pmOut = record.pmOut;

      let hours = 0;
      if (record.workHours && record.workHours > 0) {
        hours = record.workHours;
      } else {
        hours = calcWorkHours(record.amIn, record.amOut, record.pmIn, record.pmOut);
      }

      let targetHoursDateKey = recordDateKey;

      if (record.amOut) {
        const amOutDateKey = toLocalDateKey(record.amOut);
        const isOvernightAmOut = Boolean(record.pmIn && amOutDateKey !== recordDateKey);
        const amOutDay = ensureDay(amOutDateKey);
        amOutDay.amOut = record.amOut;

        // For overnight entries (PM In on previous day, AM Out next day),
        // display the worked hours on the actual AM Out day.
        if (isOvernightAmOut) {
          targetHoursDateKey = amOutDateKey;
        }
      }

      if (hours > 0) {
        const hoursDay = ensureDay(targetHoursDateKey);
        const existing = hoursDay.workHours ?? 0;
        hoursDay.workHours = Math.round((existing + hours) * 100) / 100;
      }
    }

    return allDays.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const attendance = dailyDisplayMap[dateStr] || null;
      
      return {
        date: day,
        dateStr,
        isWeekend: isWeekend(day),
        attendance,
      };
    });
  };

  // Format time for display (shorthand: 8a, 1:30p)
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const period = hours >= 12 ? 'p' : 'a';
      const hours12 = hours % 12 || 12;
      return minutes === 0 ? `${hours12}${period}` : `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
    } catch {
      return "-";
    }
  };

  // Build DTR HTML for a single employee (reusable for individual + batch)
  const buildDTRPage = (employee: Employee) => {
    const monthlyData = getEmployeeMonthlyAttendance(employee.id);
    const [year, month] = selectedMonth.split("-");
    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const daysInMonth = getDaysInMonth(startDate);
    const monthLabel = format(startDate, "MMMM");
    const monthRange = monthLabel + " 1-" + daysInMonth + ", " + year;

    const rows = monthlyData.map(day => {
      const mm = format(day.date, "MM");
      const dd = format(day.date, "dd");
      const dateLabel = mm + "-" + dd;
      const dayName = format(day.date, "EEE");
      const a = day.attendance;
      const amIn = a?.amIn ? formatTime(a.amIn) : "";
      const amOut = a?.amOut ? formatTime(a.amOut) : "";
      const pmIn = a?.pmIn ? formatTime(a.pmIn) : "";
      const pmOut = a?.pmOut ? formatTime(a.pmOut) : "";
      const hasRecord = Boolean(a && (a.amIn || a.amOut || a.pmIn || a.pmOut));
      const dayWorkHours = hasRecord
        ? ((a?.workHours && a.workHours > 0)
            ? a.workHours
            : calcWorkHours(a?.amIn ?? null, a?.amOut ?? null, a?.pmIn ?? null, a?.pmOut ?? null))
        : 0;
      const dayWorkHoursStr = hasRecord ? formatHoursAndMinutes(dayWorkHours) : "";
      return "<tr>" +
        '<td class="date-col"><b>' + dateLabel + "</b></td>" +
        '<td class="day-col">' + dayName + "</td>" +
        '<td class="time-col">' + amIn + "</td>" +
        '<td class="time-col">' + amOut + "</td>" +
        '<td class="time-col">' + pmIn + "</td>" +
        '<td class="time-col">' + pmOut + "</td>" +
        '<td class="overtime-col"></td>' +
        '<td class="overtime-col"></td>' +
        '<td class="hours-col">' + dayWorkHoursStr + "</td>" +
        "</tr>";
    });

    const stats = calculateEmployeeStats(employee.id);
    const totalHoursStr = formatHoursAndMinutes(stats.totalWorkHours);

    const totalRow = '<tr class="total-row">' +
      "<td colspan=\"6\"></td>" +
      '<td class="overtime-col" style="text-align:right;padding-right:6px;"><b>Total:</b></td>' +
      '<td class="overtime-col"></td>' +
      '<td class="hours-col">' + totalHoursStr + "</td></tr>";

    return '<div class="page">' +
      '<div class="header">' +
        '<div class="header-logo left"><img src="/images/dotr-logo.png" alt="DOTr Logo" /></div>' +
        '<div class="header-title">' +
          "<h1>PHILIPPINE PORTS AUTHORITY</h1>" +
          "<h2>Employee Daily Time Record</h2>" +
          "<h3>Month of " + monthRange + "</h3>" +
        "</div>" +
        '<div class="header-logo right"><img src="/images/ppa-logo-nobg.png" alt="PPA Logo" /></div>' +
      "</div>" +
      '<div class="info">' +
        '<div class="info-row"><span class="info-label">Name</span><span>: </span><span class="info-value">' + employee.name + "</span></div>" +
        '<div class="info-row"><span class="info-label">Position</span><span>: </span><span class="info-value">' + (employee.position || "N/A") + "</span></div>" +
      "</div>" +
      "<table><colgroup>" +
        '<col class="date-col" />' +
        '<col class="day-col" />' +
        '<col class="time-col" />' +
        '<col class="time-col" />' +
        '<col class="time-col" />' +
        '<col class="time-col" />' +
        '<col class="overtime-col" />' +
        '<col class="overtime-col" />' +
        '<col class="hours-col" />' +
      "</colgroup><thead>" +
        "<tr>" +
          '<th rowspan="2" style="width:50px;">Date</th>' +
          '<th rowspan="2" style="width:50px;">Day</th>' +
          '<th colspan="2">AM</th>' +
          '<th colspan="2">PM</th>' +
          '<th colspan="2">Overtime</th>' +
          '<th rowspan="2">Working<br>Hours</th>' +
        "</tr><tr>" +
          "<th>In</th><th>Out</th><th>In</th><th>Out</th><th>In</th><th>Out</th>" +
        "</tr></thead><tbody>" +
      rows.join("\n") +
      totalRow +
      "</tbody></table>" +
      '<div class="signatures">' +
        '<div class="sig-right"><div class="sig-line">Signature of Employee</div></div>' +
        '<div class="verified">Verified as to the prescribed office hours</div>' +
        '<div class="sig-right"><div class="sig-line">Signature of Immediate Supervisor</div></div>' +
      "</div>" +
      "</div>";
  };

  const getDTRCss = () => {
    return [
      "@page { size: A4 landscape; margin: 0; }",
      "* { margin: 0; padding: 0; box-sizing: border-box; }",
      "body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #000; }",
      ".page { width: 100%; max-width: 297mm; margin: 0 auto; padding: 8mm 12mm; page-break-after: always; }",
      ".page:last-child { page-break-after: auto; }",
      ".header { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px; }",
      ".header-title { text-align: center; }",
      ".header h1 { font-size: 12pt; font-weight: bold; margin: 0; letter-spacing: 1px; }",
      ".header h2 { font-size: 10pt; font-weight: normal; margin: 1px 0; }",
      ".header h3 { font-size: 9pt; font-weight: normal; margin: 1px 0; }",
      ".header-logo { display: flex; align-items: center; justify-content: center; }",
      ".header-logo.left img { height: 44px; width: auto; object-fit: contain; }",
      ".header-logo.right img { height: 58px; width: auto; object-fit: contain; }",
      ".info { margin-bottom: 5px; }",
      ".info-row { display: flex; gap: 8px; margin-bottom: 2px; font-size: 9pt; }",
      ".info-label { min-width: 60px; font-weight: normal; }",
      ".info-value { font-weight: bold; }",
      "table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.5pt; }",
      "th { background: #fff; color: #000; font-weight: bold; border: 1px solid #000; padding: 1px 2px; text-align: center; font-size: 7.5pt; }",
      "td { border: 1px solid #000; padding: 0 2px; text-align: center; font-size: 7.5pt; height: 13px; line-height: 13px; }",
      '.date-col { text-align: left; padding-left: 4px; width: 8%; }',
      ".day-col { text-align: left; width: 7%; }",
      ".time-col { width: 8%; text-align: center; }",
      ".overtime-col { width: 8%; text-align: center; }",
      ".hours-col { width: 37%; text-align: center; }",
      ".total-row td { font-weight: bold; border-top: 2px solid #000; }",
      ".signatures { margin-top: 30px; }",
      ".sig-right { text-align: right; margin-right: 60px; }",
      ".sig-line { display: inline-block; border-top: 1px solid #000; min-width: 200px; padding-top: 2px; font-size: 8pt; text-align: center; }",
      ".verified { text-align: center; margin: 25px 0 20px; font-size: 8pt; }",
      "@media print { body { padding: 0; } .page { padding: 8mm 12mm; max-width: none; } .no-print { display: none !important; } }",
      ".no-print { position: fixed; top: 12px; right: 16px; z-index: 100; }",
      ".no-print button { padding: 8px 24px; font-size: 12pt; cursor: pointer; background: #0d3a5c; color: #fff; border: none; border-radius: 6px; margin: 0 4px; }",
    ].join("\n  ");
  };

  // Download DTR (PPA format) for individual employee
  const handleDownloadDTR = () => {
    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) return;

    const [year, month] = selectedMonth.split("-");
    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const daysInMonth = getDaysInMonth(startDate);
    const monthLabel = format(startDate, "MMMM");
    const monthRange = monthLabel + " 1-" + daysInMonth + ", " + year;

    const css = getDTRCss();
    const html = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>DTR - " + employee.name + " - " + monthRange + "</title>" +
      "<style>" + css + "</style></head><body>" +
      '<div class="no-print"><button onclick="window.print()">Print / Save as PDF</button></div>' +
      buildDTRPage(employee) +
      "</body></html>";

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  // Download DTR for ALL employees (one page per employee)
  const handleDownloadAllDTR = () => {
    if (employees.length === 0) return;
    const [year, month] = selectedMonth.split("-");
    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const daysInMonth = getDaysInMonth(startDate);
    const monthLabel = format(startDate, "MMMM");
    const monthRange = monthLabel + " 1-" + daysInMonth + ", " + year;

    const css = getDTRCss();
    const pages = employees.map(emp => buildDTRPage(emp)).join("\n");
    const html = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>All DTR - " + monthRange + "</title>" +
      "<style>" + css + "</style></head><body>" +
      '<div class="no-print"><button onclick="window.print()">Print All / Save as PDF</button></div>' +
      pages +
      "</body></html>";

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
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
            size: A4 landscape;
            margin: 8mm 10mm;
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
            padding: 0 !important;
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
          
          /* Arial compact font for fitting on one page */
          #print-area {
            font-family: Arial, sans-serif !important;
            font-size: 8pt !important;
          }
          
          #print-area table {
            font-family: Arial, sans-serif !important;
            font-size: 7pt !important;
            width: 100% !important;
          }
          
          #print-area th, #print-area td {
            padding: 1px 3px !important;
            font-size: 7pt !important;
            line-height: 1.2 !important;
          }
          
          /* Compact header */
          #print-area .mb-4 {
            margin-bottom: 4px !important;
          }
          #print-area .pb-4 {
            padding-bottom: 4px !important;
          }
          #print-area .mb-6 {
            margin-bottom: 4px !important;
          }
          #print-area .mt-8 {
            margin-top: 6px !important;
          }
          #print-area .pt-6 {
            padding-top: 4px !important;
          }
          #print-area .mt-3 {
            margin-top: 2px !important;
          }
          
          /* Compact report header text */
          #print-area h1 {
            font-size: 12pt !important;
            margin: 0 !important;
          }
          #print-area h2 {
            font-size: 10pt !important;
            margin: 2px 0 !important;
          }
          #print-area h3 {
            font-size: 9pt !important;
            margin-bottom: 3px !important;
            padding-bottom: 2px !important;
          }
          
          /* Compact logo */
          #print-area img {
            width: 50px !important;
            height: 50px !important;
          }
          
          /* Reduce status badge size */
          #print-area span[class*="rounded"] {
            padding: 0 2px !important;
            font-size: 6pt !important;
          }
          
          /* Compact footer */
          #print-area .grid-cols-2 {
            gap: 8px !important;
          }
          #print-area .mt-6 {
            margin-top: 4px !important;
          }
          
          /* Employee info print styles */
          .employee-info-row {
            display: flex !important;
            gap: 30px !important;
            margin-bottom: 2px !important;
          }
          .employee-info-item {
            display: flex !important;
            gap: 6px !important;
          }
          .employee-info-label {
            font-weight: normal !important;
            color: #6b7280 !important;
            font-size: 8pt !important;
          }
          .employee-info-value {
            font-weight: 600 !important;
            color: #111827 !important;
            font-size: 8pt !important;
          }
          
          /* Force single page - prevent page breaks inside content */
          #print-area table {
            page-break-inside: avoid !important;
          }
          #print-area {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      <div className="space-y-4">
        {/* Controls - Hidden when printing */}
        <div className="no-print">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Reports</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Generate and print attendance reports</p>
            </div>
            <div className="flex gap-2">
              {reportType === "individual" && selectedEmployee && (
                <button
                  onClick={handleDownloadDTR}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download DTR
                </button>
              )}
              <button
                onClick={handleDownloadAllDTR}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Download All DTR
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ppa-navy focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as "organization" | "individual")}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ppa-navy focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="organization">Whole Organization</option>
                  <option value="individual">Individual Employee</option>
                </select>
              </div>
              {reportType === "organization" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Filter by Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ppa-navy focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {reportType === "individual" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Filter by Department
                    </label>
                    <select
                      value={individualDepartment}
                      onChange={(e) => {
                        setIndividualDepartment(e.target.value);
                        // Reset selected employee when department changes
                        const filtered = e.target.value === "all" 
                          ? employees 
                          : employees.filter(emp => emp.department === e.target.value);
                        if (filtered.length > 0) {
                          setSelectedEmployee(filtered[0].id);
                        }
                      }}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ppa-navy focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="all">All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Select Employee
                    </label>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ppa-navy focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {individualFilteredEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} {emp.department ? `- ${emp.department}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Printable Report Area */}
        <div id="print-area" ref={printRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          {/* Report Header */}
          <div className="mb-4 border-b-2 border-ppa-navy dark:border-ppa-light pb-4">
            <div className="relative">
              {/* Logo on far right */}
              <div className="absolute right-0 top-0">
                <img
                  src="/images/download-removebg-preview.png"
                  alt="PPA Logo"
                  className="w-20 h-20 object-contain"
                />
              </div>
              {/* Centered content */}
              <div className="text-center">
                <h1 className="text-xl font-bold text-ppa-navy dark:text-ppa-light">PHILIPPINE PORTS AUTHORITY</h1>
                <p className="text-gray-600 dark:text-gray-400 text-xs">Attendance Monitoring System</p>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-3">
                  Monthly Attendance Sheet
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">For the Month of {monthName}</p>
              </div>
            </div>
          </div>

          {reportType === "organization" ? (
            // Organization Report
            <>
              {/* Employee Summary Table - Grouped by Department */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-ppa-navy dark:text-ppa-light mb-4 border-b border-gray-300 dark:border-gray-600 pb-2">
                  Employee Attendance Summary
                  {selectedDepartment === "all" ? " (Grouped by Department)" : ` - ${selectedDepartment}`}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                    <thead>
                      <tr className="bg-ppa-navy text-white">
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm">Employee Name</th>
                        {selectedDepartment === "all" && (
                          <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm">Position</th>
                        )}
                        {/* Status columns removed */}
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm">Total Hours</th>
                        {/* Rate column removed */}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDepartment === "all" ? (
                        // Grouped by department view
                        Object.entries(employeesByDepartment).map(([dept, deptEmployees]) => {
                          const deptStats = calculateDepartmentStats(deptEmployees);
                          return (
                            <React.Fragment key={dept}>
                              {/* Department Header Row */}
                              <tr className="bg-ppa-blue/10 dark:bg-ppa-blue/20">
                                <td colSpan={8} className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-bold text-ppa-navy dark:text-ppa-light">
                                  {dept} ({deptEmployees.length} employee{deptEmployees.length !== 1 ? "s" : ""})
                                </td>
                              </tr>
                              {/* Department Employees */}
                              {deptEmployees.map((emp, idx) => {
                                const stats = calculateEmployeeStats(emp.id);
                                return (
                                  <tr key={emp.id} className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700"}>
                                    <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 pl-6">{emp.name}</td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{emp.position || "N/A"}</td>
                                    {/* Status cells removed */}
                                    <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm text-gray-700 dark:text-gray-300">{formatHoursAndMinutes(stats.totalWorkHours)}</td>
                                    {/* Rate cell removed */}
                                  </tr>
                                );
                              })}

                            </React.Fragment>
                          );
                        })
                      ) : (
                        // Filtered single department view
                        filteredEmployees.map((emp, idx) => {
                          const stats = calculateEmployeeStats(emp.id);
                          return (
                            <tr key={emp.id} className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700"}>
                              <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{emp.name}</td>
                              {/* Status cells removed */}
                              <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm text-gray-700 dark:text-gray-300">{formatHoursAndMinutes(stats.totalWorkHours)}</td>



                            </tr>
                          );
                        })
                      )}
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
                const monthlyData = getEmployeeMonthlyAttendance(selectedEmployee);

                if (!employee) {
                  return <p className="text-center text-gray-500 dark:text-gray-400">No employee selected</p>;
                }

                return (
                  <>
                    {/* Employee Info - Clean professional format */}
                    <div className="mb-6 border-b border-gray-300 dark:border-gray-600 pb-4">
                      <div className="employee-info-row flex flex-wrap gap-x-10 gap-y-2 text-sm">
                        <div className="employee-info-item flex gap-2">
                          <span className="employee-info-label text-gray-500 dark:text-gray-400">Employee Name:</span>
                          <span className="employee-info-value font-semibold text-gray-900 dark:text-gray-100">{employee.name}</span>
                        </div>
                        <div className="employee-info-item flex gap-2">
                          <span className="employee-info-label text-gray-500 dark:text-gray-400">Email:</span>
                          <span className="employee-info-value font-semibold text-gray-900 dark:text-gray-100">{employee.email}</span>
                        </div>
                      </div>
                      <div className="employee-info-row flex flex-wrap gap-x-10 gap-y-2 text-sm mt-2">
                        <div className="employee-info-item flex gap-2">
                          <span className="employee-info-label text-gray-500 dark:text-gray-400">Department:</span>
                          <span className="employee-info-value font-semibold text-gray-900 dark:text-gray-100">{employee.department || "N/A"}</span>
                        </div>
                        <div className="employee-info-item flex gap-2">
                          <span className="employee-info-label text-gray-500 dark:text-gray-400">Position:</span>
                          <span className="employee-info-value font-semibold text-gray-900 dark:text-gray-100">{employee.position || "N/A"}</span>
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
                                  {day.isWeekend ? "-" :
                                    formatHoursAndMinutes(
                                      (day.attendance?.workHours && day.attendance?.workHours > 0)
                                        ? day.attendance?.workHours
                                        : calcWorkHours(
                                            day.attendance?.amIn ?? null,
                                            day.attendance?.amOut ?? null,
                                            day.attendance?.pmIn ?? null,
                                            day.attendance?.pmOut ?? null
                                          )
                                    )
                                  }
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
