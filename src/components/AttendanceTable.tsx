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
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg
          className="w-12 h-12 text-gray-400 mx-auto mb-4"
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
        <p className="text-gray-500">No attendance records found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
              Date
            </th>
            {showUser && (
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                Employee
              </th>
            )}
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
              Check In
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
              Check Out
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
              Work Hours
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {attendances.map((attendance) => (
            <tr
              key={attendance.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 px-4 text-sm text-gray-900">
                {formatDate(attendance.date)}
              </td>
              {showUser && (
                <td className="py-3 px-4 text-sm text-gray-900">
                  {attendance.user?.name || "Unknown"}
                </td>
              )}
              <td className="py-3 px-4 text-sm text-gray-600">
                {formatTime(attendance.checkIn)}
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {formatTime(attendance.checkOut)}
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {attendance.workHours ? `${attendance.workHours.toFixed(2)}h` : "-"}
              </td>
              <td className="py-3 px-4">
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
