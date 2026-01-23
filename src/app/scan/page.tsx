"use client";

import { useState, useCallback } from "react";
import QRScanner from "@/components/QRScanner";

interface UserInfo {
  name: string;
  department?: string;
  position?: string;
  profileImage?: string;
}

interface ScanResult {
  success: boolean;
  message: string;
  action?: string;
  time?: string;
  nextAction?: string;
  user?: UserInfo;
}

export default function ScanStationPage() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState<
    Array<{ name: string; action: string; time: string; profileImage?: string }>
  >([]);

  const handleScan = useCallback(
    async (data: { email: string; name: string }) => {
      if (isProcessing) return;

      setIsProcessing(true);
      setScanResult(null);

      try {
        // Post to record attendance - send email (supports both new and legacy formats)
        const res = await fetch("/api/attendance/qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email, userId: data.email }),
        });

        const responseData = await res.json();

        if (res.ok && responseData.success) {
          const result: ScanResult = {
            success: true,
            message: responseData.message,
            action: responseData.action,
            time: responseData.time,
            nextAction: responseData.nextAction,
            user: responseData.user,
          };

          setScanResult(result);

          setRecentScans((prev) => [
            {
              name: responseData.user?.name || data.name,
              action: responseData.action,
              time: responseData.time,
              profileImage: responseData.user?.profileImage,
            },
            ...prev.slice(0, 9),
          ]);
        } else {
          setScanResult({
            success: false,
            message: responseData.message || responseData.error || "Failed to record attendance",
          });
        }

        // Clear result after 5 seconds
        setTimeout(() => setScanResult(null), 5000);
      } catch (error) {
        setScanResult({
          success: false,
          message: "Network error. Please try again.",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing]
  );

  const handleError = (error: string) => {
    setScanResult({ success: false, message: error });
    setTimeout(() => setScanResult(null), 3000);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "AM In":
        return "🌅";
      case "AM Out":
        return "🌤️";
      case "PM In":
        return "☀️";
      case "PM Out":
        return "🌙";
      default:
        return "✅";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "AM In":
        return "bg-green-50 border-green-200 text-green-800";
      case "AM Out":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "PM In":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "PM Out":
        return "bg-purple-50 border-purple-200 text-purple-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ppa-navy via-ppa-blue to-ppa-light p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img
              src="/images/download-removebg-preview.png"
              alt="PPA Logo"
              className="w-20 h-20 object-contain drop-shadow-lg"
            />
            <div className="text-left">
              <h1 className="text-3xl font-bold text-white">
                Philippine Ports Authority
              </h1>
              <p className="text-blue-200 text-lg">
                Attendance Monitoring System
              </p>
            </div>
          </div>
          <p className="text-blue-300 text-sm mt-2">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Time Slots Display */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6">
          <div className="grid grid-cols-4 gap-4 text-center text-white">
            <div className="p-3 rounded-lg bg-green-500/20">
              <span className="text-2xl">🌅</span>
              <p className="text-sm font-medium mt-1">AM In</p>
              <p className="text-xs opacity-75">Morning Arrival</p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/20">
              <span className="text-2xl">🌤️</span>
              <p className="text-sm font-medium mt-1">AM Out</p>
              <p className="text-xs opacity-75">Lunch Break</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/20">
              <span className="text-2xl">☀️</span>
              <p className="text-sm font-medium mt-1">PM In</p>
              <p className="text-xs opacity-75">After Lunch</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/20">
              <span className="text-2xl">🌙</span>
              <p className="text-sm font-medium mt-1">PM Out</p>
              <p className="text-xs opacity-75">End of Day</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              📷 QR Code Scanner
            </h2>
            <QRScanner onScan={handleScan} onError={handleError} />

            {/* Scan Result */}
            {scanResult && (
              <div
                className={`mt-6 p-6 rounded-xl text-center ${
                  scanResult.success
                    ? "bg-green-100 border-2 border-green-500"
                    : "bg-red-100 border-2 border-red-500"
                }`}
              >
                {/* Profile Image Display */}
                {scanResult.success && scanResult.user && (
                  <div className="mb-4">
                    <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200">
                      {scanResult.user.profileImage ? (
                        <img
                          src={scanResult.user.profileImage}
                          alt={scanResult.user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">
                          👤
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mt-3">
                      {scanResult.user.name}
                    </h3>
                    {scanResult.user.department && (
                      <p className="text-gray-600 text-sm">
                        {scanResult.user.department} {scanResult.user.position && `• ${scanResult.user.position}`}
                      </p>
                    )}
                  </div>
                )}
                
                <div
                  className={`text-4xl mb-2`}
                >
                  {scanResult.success ? getActionIcon(scanResult.action || "") : "❌"}
                </div>
                <p
                  className={`text-lg font-semibold ${
                    scanResult.success ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {scanResult.message}
                </p>
                {scanResult.success && scanResult.action && (
                  <div className="mt-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getActionColor(scanResult.action)}`}>
                      {scanResult.action}
                    </span>
                    <p className="text-gray-600 text-sm mt-1">
                      {new Date(scanResult.time || "").toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="mt-6 flex items-center justify-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span>Processing...</span>
              </div>
            )}
          </div>

          {/* Recent Scans */}
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📋 Recent Activity
            </h2>
            {recentScans.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">🕐</div>
                <p>No scans yet today</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentScans.map((scan, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getActionColor(scan.action)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Profile Thumbnail */}
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow bg-gray-200 flex-shrink-0">
                          {scan.profileImage ? (
                            <img
                              src={scan.profileImage}
                              alt={scan.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg text-gray-400">
                              👤
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium block">
                            {scan.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getActionIcon(scan.action)} {scan.action}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs opacity-75">
                          {new Date(scan.time).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white/10 backdrop-blur rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-3">📖 Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-100">
            <li>Click &quot;Start Camera Scanner&quot; to activate the webcam</li>
            <li>Hold your QR code in front of the camera</li>
            <li>Wait for the confirmation message</li>
            <li>Attendance is recorded in sequence: AM In → AM Out → PM In → PM Out</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
