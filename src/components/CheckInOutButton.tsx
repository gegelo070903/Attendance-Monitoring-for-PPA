"use client";

import { useState } from "react";
import { formatTime } from "@/lib/utils";

interface CheckInOutButtonProps {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  onCheckIn: () => Promise<void>;
  onCheckOut: () => Promise<void>;
}

export default function CheckInOutButton({
  hasCheckedIn,
  hasCheckedOut,
  checkInTime,
  checkOutTime,
  onCheckIn,
  onCheckOut,
}: CheckInOutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (!hasCheckedIn) {
        await onCheckIn();
      } else if (!hasCheckedOut) {
        await onCheckOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const isComplete = hasCheckedIn && hasCheckedOut;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Today&apos;s Attendance
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Check In</p>
          <p className="text-xl font-semibold text-green-700 dark:text-green-400">
            {formatTime(checkInTime)}
          </p>
        </div>
        <div className="text-center p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Check Out</p>
          <p className="text-xl font-semibold text-red-700 dark:text-red-400">
            {formatTime(checkOutTime)}
          </p>
        </div>
      </div>

      {isComplete ? (
        <div className="text-center py-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <svg
            className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-2"
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
          <p className="text-green-700 dark:text-green-400 font-medium">
            Attendance complete for today!
          </p>
        </div>
      ) : (
        <button
          onClick={handleClick}
          disabled={loading}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : !hasCheckedIn
              ? "bg-green-600 hover:bg-green-700 hover:shadow-lg"
              : "bg-red-600 hover:bg-red-700 hover:shadow-lg"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : !hasCheckedIn ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
              Check In
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25"
                />
              </svg>
              Check Out
            </span>
          )}
        </button>
      )}
    </div>
  );
}
