import { getStatusColor, formatDate, formatTime, formatHoursAndMinutes } from "@/lib/utils";
import { differenceInMinutes, parseISO } from "date-fns";
function toDate(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  return typeof val === 'string' ? parseISO(val) : val;
}

function calcWorkHours(amIn: string | Date | null | undefined, amOut: string | Date | null | undefined, pmIn: string | Date | null | undefined, pmOut: string | Date | null | undefined) {
  let total = 0;
  const ai = toDate(amIn), ao = toDate(amOut);
  const pi = toDate(pmIn), po = toDate(pmOut);
  if (ai && ao) total += differenceInMinutes(ao, ai);
  if (pi && po) total += differenceInMinutes(po, pi);
  return Math.round((total / 60) * 100) / 100;
}
import { Attendance } from "@/types";
import { useEffect, useState } from "react";
import { useAttendanceSocket } from "@/lib/useAttendanceSocket";

interface DisplayAttendanceRow {
  id: string;
  date: Date;
  user: Attendance["user"];
  status: string;
  amIn: Date | string | null;
  amOut: Date | string | null;
  pmIn: Date | string | null;
  pmOut: Date | string | null;
  workHours: number | null;
}

function toLocalDateKey(val: Date | string | null | undefined): string | null {
  const d = toDate(val);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromLocalDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

function buildDisplayRows(attendances: Attendance[], showUser: boolean): DisplayAttendanceRow[] {
  const rowMap = new Map<string, DisplayAttendanceRow>();

  const makeRowKey = (attendance: Attendance, dateKey: string): string => {
    const userKey = showUser ? attendance.userId || "unknown" : "self";
    return `${userKey}|${dateKey}`;
  };

  const ensureRow = (attendance: Attendance, dateKey: string): DisplayAttendanceRow => {
    const key = makeRowKey(attendance, dateKey);
    const existing = rowMap.get(key);
    if (existing) {
      return existing;
    }

    const row: DisplayAttendanceRow = {
      id: key,
      date: fromLocalDateKey(dateKey),
      user: attendance.user,
      status: attendance.status,
      amIn: null,
      amOut: null,
      pmIn: null,
      pmOut: null,
      workHours: null,
    };
    rowMap.set(key, row);
    return row;
  };

  for (const attendance of attendances) {
    const baseDateKey = toLocalDateKey(attendance.date);
    if (!baseDateKey) continue;

    const baseRow = ensureRow(attendance, baseDateKey);
    if (attendance.amIn) baseRow.amIn = attendance.amIn;
    if (attendance.pmIn) baseRow.pmIn = attendance.pmIn;
    if (attendance.pmOut) baseRow.pmOut = attendance.pmOut;

    let rowHours = (attendance.workHours && attendance.workHours > 0)
      ? attendance.workHours
      : calcWorkHours(attendance.amIn ?? null, attendance.amOut ?? null, attendance.pmIn ?? null, attendance.pmOut ?? null);
    rowHours = rowHours > 0 ? rowHours : 0;

    let targetRow = baseRow;
    if (attendance.amOut) {
      const amOutDateKey = toLocalDateKey(attendance.amOut);
      if (amOutDateKey) {
        const amOutRow = ensureRow(attendance, amOutDateKey);
        amOutRow.amOut = attendance.amOut;

        const isOvernightAmOut = Boolean(attendance.pmIn && amOutDateKey !== baseDateKey);
        if (isOvernightAmOut) {
          targetRow = amOutRow;
        }
      }
    }

    if (rowHours > 0) {
      const existingHours = targetRow.workHours ?? 0;
      targetRow.workHours = Math.round((existingHours + rowHours) * 100) / 100;
    }
  }

  return Array.from(rowMap.values()).sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    const aName = a.user?.name || "";
    const bName = b.user?.name || "";
    return aName.localeCompare(bName);
  });
}


interface AttendanceTableProps {
  attendances: Attendance[];
  showUser?: boolean;
}
export default function AttendanceTable({
  attendances,
  showUser = false,
}: AttendanceTableProps) {
  const [liveAttendances, setLiveAttendances] = useState(attendances);
  useEffect(() => {
    setLiveAttendances(attendances);
  }, [attendances]);
  useAttendanceSocket((data) => {
    if ((data?.type === "attendance-update" || data?.type === "attendance-photo-update") && data.attendance) {
      setLiveAttendances((prev) => {
        const idx = prev.findIndex((a) => a.id === data.attendance.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...prev[idx], ...data.attendance };
          return updated;
        }
        return [data.attendance, ...prev];
      });
    }
  });
  const displayRows = buildDisplayRows(liveAttendances, showUser);

  if (displayRows.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <svg
          className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-3"
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
        <p className="text-sm text-gray-500 dark:text-gray-400">No attendance records found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
              Date
            </th>
            {showUser && (
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
                Employee
              </th>
            )}
            <th className="text-center py-2 px-3 text-xs font-semibold text-green-600 dark:text-green-400">
              AM In
            </th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
              AM Out
            </th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400">
              PM In
            </th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-purple-600 dark:text-purple-400">
              PM Out
            </th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
              Hours
            </th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((attendance) => (
            <tr
              key={attendance.id}
              className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <td className="py-2 px-3 text-xs text-gray-900 dark:text-gray-100">
                {formatDate(attendance.date)}
              </td>
              {showUser && (
                <td className="py-2 px-3 text-xs text-gray-900 dark:text-gray-100">
                  {attendance.user?.name || "Unknown"}
                </td>
              )}
              <td className="py-2 px-3 text-xs text-center text-green-600 dark:text-green-400 font-medium">
                {formatTime(attendance.amIn)}
              </td>
              <td className="py-2 px-3 text-xs text-center text-yellow-600 dark:text-yellow-400 font-medium">
                {formatTime(attendance.amOut)}
              </td>
              <td className="py-2 px-3 text-xs text-center text-blue-600 dark:text-blue-400 font-medium">
                {formatTime(attendance.pmIn)}
              </td>
              <td className="py-2 px-3 text-xs text-center text-purple-600 dark:text-purple-400 font-medium">
                {formatTime(attendance.pmOut)}
              </td>
              <td className="py-2 px-3 text-xs text-center text-gray-600 dark:text-gray-300">
                {(attendance.workHours && attendance.workHours > 0)
                  ? formatHoursAndMinutes(attendance.workHours)
                  : (attendance.amIn && attendance.amOut) || (attendance.pmIn && attendance.pmOut)
                    ? formatHoursAndMinutes(
                        calcWorkHours(
                          attendance.amIn ?? null,
                          attendance.amOut ?? null,
                          attendance.pmIn ?? null,
                          attendance.pmOut ?? null
                        )
                      )
                    : "-"}
              </td>
              <td className="py-2 px-3 text-center">
                <span
                  className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor(
                    attendance.status
                  )}`}
                >
                  {attendance.status === "NO_RECORD" ? "NO RECORD" : attendance.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
