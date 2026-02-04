import { getStatusColor, formatDate, formatTime } from "@/lib/utils";
import { Attendance } from "@/types";

interface AttendanceTableProps {
  attendances: Attendance[];
  showUser?: boolean;
}

export default function AttendanceTable({
  attendances,
  showUser = false,
}: AttendanceTableProps) {
  if (attendances.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <svg
          className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4"
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
        <p className="text-gray-500 dark:text-gray-400">No attendance records found</p>
      </div>
    );
  }

  // Check if any attendance has night shift data
  const hasNightShift = attendances.some(
    (a) => a.shiftType === 'NIGHT' || a.nightIn || a.nightOut
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
              Date
            </th>
            {showUser && (
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                Employee
              </th>
            )}
            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
              Shift
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-green-600 dark:text-green-400">
              AM In
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-yellow-600 dark:text-yellow-400">
              AM Out
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
              PM In
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-purple-600 dark:text-purple-400">
              PM Out
            </th>
            {hasNightShift && (
              <>
                <th className="text-center py-3 px-4 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  Night In
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Night Out
                </th>
              </>
            )}
            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
              Hours
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {attendances.map((attendance) => (
            <tr
              key={attendance.id}
              className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                {formatDate(attendance.date)}
              </td>
              {showUser && (
                <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                  {attendance.user?.name || "Unknown"}
                </td>
              )}
              <td className="py-3 px-4 text-sm text-center">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  attendance.shiftType === 'NIGHT' 
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {attendance.shiftType || 'DAY'}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-center text-green-600 dark:text-green-400 font-medium">
                {formatTime(attendance.amIn)}
              </td>
              <td className="py-3 px-4 text-sm text-center text-yellow-600 dark:text-yellow-400 font-medium">
                {formatTime(attendance.amOut)}
              </td>
              <td className="py-3 px-4 text-sm text-center text-blue-600 dark:text-blue-400 font-medium">
                {formatTime(attendance.pmIn)}
              </td>
              <td className="py-3 px-4 text-sm text-center text-purple-600 dark:text-purple-400 font-medium">
                {formatTime(attendance.pmOut)}
              </td>
              {hasNightShift && (
                <>
                  <td className="py-3 px-4 text-sm text-center text-indigo-600 dark:text-indigo-400 font-medium">
                    {formatTime(attendance.nightIn)}
                  </td>
                  <td className="py-3 px-4 text-sm text-center text-slate-600 dark:text-slate-400 font-medium">
                    {formatTime(attendance.nightOut)}
                  </td>
                </>
              )}
              <td className="py-3 px-4 text-sm text-center text-gray-600 dark:text-gray-300">
                {attendance.workHours ? `${attendance.workHours.toFixed(2)}h` : "-"}
              </td>
              <td className="py-3 px-4 text-center">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    attendance.status
                  )}`}
                >
                  {attendance.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
