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
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Today&apos;s Attendance
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Check In</p>
          <p className="text-xl font-semibold text-green-700">
            {formatTime(checkInTime)}
          </p>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Check Out</p>
          <p className="text-xl font-semibold text-red-700">
            {formatTime(checkOutTime)}
          </p>
        </div>
      </div>

      {isComplete ? (
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <svg
            className="w-12 h-12 text-green-500 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-green-700 font-medium">
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
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
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
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
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
