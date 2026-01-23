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
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-gray-500 dark:text-gray-400">No attendance records found</p>
      </div>
    );
  }

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
              <span className="text-green-600 dark:text-green-400">🌅 AM In</span>
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
              <span className="text-yellow-600 dark:text-yellow-400">🌤️ AM Out</span>
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
              <span className="text-blue-600 dark:text-blue-400">☀️ PM In</span>
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
              <span className="text-purple-600 dark:text-purple-400">🌙 PM Out</span>
            </th>
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
