"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  shiftType?: string;
}

interface RecentScan {
  name: string;
  action: string;
  time: string;
  profileImage?: string;
  shiftType: string;
}

type ShiftType = "DAY" | "NIGHT";

const DAY_SHIFT_ACTIONS = ["AM In", "AM Out", "PM In", "PM Out"];
const NIGHT_SHIFT_ACTIONS = ["Night In", "Night Out"];

export default function ScanStationPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>("DAY");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Set mounted and initialize time on client only
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Auto-detect shift based on time
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      setSelectedShift("NIGHT");
    }
    
    return () => clearInterval(timer);
  }, []);

  const handleScan = useCallback(
    async (data: { email: string; name: string }) => {
      if (isProcessing) return;

      setIsProcessing(true);
      setScanResult(null);

      try {
        const res = await fetch("/api/attendance/qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: data.email, 
            userId: data.email,
            shiftType: selectedShift 
          }),
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
            shiftType: selectedShift,
          };

          setScanResult(result);

          setRecentScans((prev) => [
            {
              name: responseData.user?.name || data.name,
              action: responseData.action,
              time: responseData.time,
              profileImage: responseData.user?.profileImage,
              shiftType: selectedShift,
            },
            ...prev.slice(0, 9),
          ]);
        } else {
          setScanResult({
            success: false,
            message: responseData.message || responseData.error || "Failed to record attendance",
          });
        }

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
    [isProcessing, selectedShift]
  );

  const handleError = (error: string) => {
    setScanResult({ success: false, message: error });
    setTimeout(() => setScanResult(null), 3000);
  };

  const getActionColor = (action: string, isActive: boolean = true) => {
    if (!isActive) return "bg-gray-100 border-gray-300 text-gray-400";
    switch (action) {
      case "AM In":
        return "bg-emerald-50 border-emerald-400 text-emerald-700";
      case "AM Out":
        return "bg-amber-50 border-amber-400 text-amber-700";
      case "PM In":
        return "bg-sky-50 border-sky-400 text-sky-700";
      case "PM Out":
        return "bg-violet-50 border-violet-400 text-violet-700";
      case "Night In":
        return "bg-indigo-50 border-indigo-400 text-indigo-700";
      case "Night Out":
        return "bg-slate-50 border-slate-400 text-slate-700";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getTileBgColor = (action: string, isActive: boolean) => {
    if (!isActive) return "bg-gray-200/50";
    switch (action) {
      case "AM In":
        return "bg-gradient-to-br from-emerald-500 to-emerald-600";
      case "AM Out":
        return "bg-gradient-to-br from-amber-500 to-amber-600";
      case "PM In":
        return "bg-gradient-to-br from-sky-500 to-sky-600";
      case "PM Out":
        return "bg-gradient-to-br from-violet-500 to-violet-600";
      case "Night In":
        return "bg-gradient-to-br from-indigo-600 to-indigo-700";
      case "Night Out":
        return "bg-gradient-to-br from-slate-600 to-slate-700";
      default:
        return "bg-gray-500";
    }
  };

  const getShiftBadgeColor = (shiftType: string) => {
    return shiftType === "NIGHT" 
      ? "bg-indigo-100 text-indigo-800 border-indigo-300" 
      : "bg-amber-100 text-amber-800 border-amber-300";
  };

  // Define mode tiles with icons
  const dayShiftTiles = [
    { action: "AM In", label: "Morning Arrival", description: "Start of work day", time: "6:00 AM - 11:59 AM", icon: "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" },
    { action: "AM Out", label: "Lunch Break", description: "Break time out", time: "11:00 AM - 1:59 PM", icon: "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" },
    { action: "PM In", label: "After Lunch", description: "Return from break", time: "12:00 PM - 5:59 PM", icon: "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" },
    { action: "PM Out", label: "End of Day", description: "Work day complete", time: "4:00 PM - 11:59 PM", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  const nightShiftTiles = [
    { action: "Night In", label: "Night Arrival", description: "Start of night shift", time: "10:00 PM - 2:00 AM", icon: "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" },
    { action: "Night Out", label: "Night End", description: "Night shift complete", time: "4:00 AM - 8:00 AM", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  const activeTiles = selectedShift === "DAY" ? dayShiftTiles : nightShiftTiles;

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto bg-white">
      {/* Watercolor gradient background - same as landing page */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Blue watercolor at top */}
        <div 
          className="absolute top-0 left-0 right-0 h-[35%]"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 56, 168, 0.25) 0%, rgba(100, 149, 237, 0.15) 50%, transparent 100%)',
          }}
        />
        {/* Softer blue blobs */}
        <div className="absolute top-0 left-0 w-full h-[30%] opacity-30">
          <div className="absolute top-0 left-[5%] w-48 h-48 bg-[#0038A8]/20 rounded-full blur-3xl"></div>
          <div className="absolute top-0 right-[10%] w-64 h-64 bg-[#4169E1]/15 rounded-full blur-3xl"></div>
        </div>
        
        {/* Red watercolor at bottom */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[35%]"
          style={{
            background: 'linear-gradient(to top, rgba(206, 17, 38, 0.2) 0%, rgba(220, 53, 69, 0.1) 50%, transparent 100%)',
          }}
        />
        {/* Softer red blobs */}
        <div className="absolute bottom-0 left-0 w-full h-[30%] opacity-30">
          <div className="absolute bottom-0 right-[5%] w-48 h-48 bg-[#CE1126]/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-[10%] w-64 h-64 bg-[#DC143C]/15 rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Back Button */}
        <div className="absolute top-0 left-0 z-20">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm border border-gray-200"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="text-sm sm:text-base font-medium">Back</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 pt-12 sm:pt-0">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-3 sm:mb-4">
            <img
              src="/images/ppa-logo-nobg.png"
              alt="PPA Logo"
              className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 object-contain"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0038A8]">
                Philippine Ports Authority
              </h1>
              <p className="text-[#CE1126] text-sm sm:text-base md:text-lg font-medium">
                Attendance Monitoring System
              </p>
            </div>
          </div>
          
          {/* Date & Time Display */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mt-3 sm:mt-4">
            <div className="bg-[#0038A8]/10 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#0038A8]/20">
              <span className="text-[#0038A8] text-xs sm:text-sm" suppressHydrationWarning>
                {mounted && currentTime ? currentTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }) : "Loading..."}
              </span>
            </div>
            <div className="bg-[#FCD116]/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#FCD116]/50">
              <span className="text-[#0038A8] text-xs sm:text-sm font-mono font-bold" suppressHydrationWarning>
                {mounted && currentTime ? currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }) : "--:--:-- --"}
              </span>
            </div>
          </div>
        </div>

        {/* Shift Selector */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs sm:text-sm font-medium">Current Shift:</span>
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold border ${
                selectedShift === "NIGHT" 
                  ? "bg-indigo-100 text-indigo-700 border-indigo-300" 
                  : "bg-amber-100 text-amber-700 border-amber-300"
              }`}>
                {selectedShift === "DAY" ? "Day Shift" : "Night Shift"}
              </span>
            </div>
            <div className="flex bg-gray-100 rounded-lg sm:rounded-xl p-1 gap-1">
              <button
                onClick={() => setSelectedShift("DAY")}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  selectedShift === "DAY"
                    ? "bg-[#FCD116] text-[#0038A8] shadow-lg"
                    : "text-gray-500 hover:bg-gray-200"
                }`}
              >
                Day Shift
              </button>
              <button
                onClick={() => setSelectedShift("NIGHT")}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  selectedShift === "NIGHT"
                    ? "bg-indigo-500 text-white shadow-lg"
                    : "text-gray-500 hover:bg-gray-200"
                }`}
              >
                Night Shift
              </button>
            </div>
          </div>
        </div>

        {/* Time Action Mode Tiles */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 border border-gray-200 shadow-lg">
          <h2 className="text-[#0038A8] font-semibold text-sm sm:text-base lg:text-lg mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#FCD116] rounded-full"></span>
            Attendance Actions
          </h2>
          <div className={`grid gap-2 sm:gap-3 md:gap-4 ${selectedShift === "DAY" ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}>
            {activeTiles.map((tile) => {
              const isActive = selectedShift === "DAY" 
                ? DAY_SHIFT_ACTIONS.includes(tile.action) 
                : NIGHT_SHIFT_ACTIONS.includes(tile.action);
              
              return (
                <div
                  key={tile.action}
                  className={`relative overflow-hidden rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-300 ${
                    isActive 
                      ? `${getTileBgColor(tile.action, true)} shadow-lg hover:shadow-xl hover:scale-[1.02] cursor-default` 
                      : "bg-gray-400/30 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-md sm:rounded-lg mb-2 sm:mb-3 flex items-center justify-center ${
                    isActive ? "bg-white/20" : "bg-gray-300/30"
                  }`}>
                    <svg className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ${isActive ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={tile.icon} />
                    </svg>
                  </div>
                  
                  <h3 className={`font-bold text-xs sm:text-sm md:text-base ${isActive ? "text-white" : "text-gray-500"}`}>
                    {tile.action}
                  </h3>
                  <p className={`text-[10px] sm:text-xs md:text-sm ${isActive ? "text-white/80" : "text-gray-400"}`}>
                    {tile.label}
                  </p>
                  <p className={`text-[9px] sm:text-[10px] md:text-xs mt-0.5 sm:mt-1 ${isActive ? "text-white/60" : "text-gray-400"} hidden sm:block`}>
                    {tile.time}
                  </p>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content - Scanner & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Scanner Section */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-3 sm:p-4 md:p-6 border border-gray-200">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-gradient-to-br from-[#0038A8] to-[#1a5f8a] flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                </svg>
              </div>
              QR Code Scanner
            </h2>
            
            <QRScanner onScan={handleScan} onError={handleError} />

            {/* Scan Result */}
            {scanResult && (
              <div
                className={`mt-4 sm:mt-6 p-4 sm:p-6 rounded-lg sm:rounded-xl text-center transition-all duration-300 ${
                  scanResult.success
                    ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-400"
                    : "bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-400"
                }`}
              >
                {/* Profile Image Display */}
                {scanResult.success && scanResult.user && (
                  <div className="mb-3 sm:mb-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-200">
                      {scanResult.user.profileImage ? (
                        <img
                          src={scanResult.user.profileImage}
                          alt={scanResult.user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl text-gray-400 bg-gray-100">
                          👤
                        </div>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mt-2 sm:mt-3">
                      {scanResult.user.name}
                    </h3>
                    {scanResult.user.department && (
                      <p className="text-gray-600 text-xs sm:text-sm">
                        {scanResult.user.department} {scanResult.user.position && `• ${scanResult.user.position}`}
                      </p>
                    )}
                  </div>
                )}
                
                <div className={`text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 ${scanResult.success ? "animate-bounce" : ""}`}>
                  {scanResult.success ? "✅" : "❌"}
                </div>
                <p className={`text-sm sm:text-base md:text-lg font-semibold ${
                  scanResult.success ? "text-emerald-800" : "text-red-800"
                }`}>
                  {scanResult.message}
                </p>
                {scanResult.success && scanResult.action && (
                  <div className="mt-2 sm:mt-3">
                    <span className={`inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border-2 ${getActionColor(scanResult.action)}`}>
                      {scanResult.action}
                    </span>
                    {scanResult.shiftType && (
                      <span className={`ml-1 sm:ml-2 inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border ${getShiftBadgeColor(scanResult.shiftType)}`}>
                        {scanResult.shiftType === "NIGHT" ? "Night" : "Day"}
                      </span>
                    )}
                    <p className="text-gray-600 text-xs sm:text-sm mt-1 sm:mt-2">
                      {new Date(scanResult.time || "").toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2 sm:gap-3 text-[#0038A8] bg-blue-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-2 sm:border-3 border-[#0038A8] border-t-transparent"></div>
                <span className="font-medium text-sm sm:text-base">Processing scan...</span>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-3 sm:p-4 md:p-6 border border-gray-200">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-gradient-to-br from-[#FCD116] to-[#d4a418] flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Recent Activity
            </h2>
            
            {recentScans.length === 0 ? (
              <div className="text-center text-gray-500 py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-medium text-sm sm:text-base">No scans yet today</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Scanned attendance will appear here</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2">
                {recentScans.map((scan, index) => (
                  <div
                    key={index}
                    className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:shadow-md ${getActionColor(scan.action)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* Profile Thumbnail */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-white shadow bg-gray-200 flex-shrink-0">
                          {scan.profileImage ? (
                            <img
                              src={scan.profileImage}
                              alt={scan.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-base sm:text-lg md:text-xl text-gray-400 bg-gray-100">
                              👤
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-semibold block text-gray-800 text-xs sm:text-sm md:text-base">
                            {scan.name}
                          </span>
                          <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                            <span className="text-[10px] sm:text-xs font-medium">
                              {scan.action}
                            </span>
                            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${getShiftBadgeColor(scan.shiftType)}`}>
                              {scan.shiftType === "NIGHT" ? "N" : "D"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] sm:text-xs font-mono font-medium text-gray-600">
                          {new Date(scan.time).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
        <div className="mt-4 sm:mt-6 bg-white/80 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg">
          <h3 className="text-sm sm:text-base md:text-lg font-bold text-[#0038A8] mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#FCD116] rounded-full"></span>
            Instructions
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <ol className="list-decimal list-inside space-y-1.5 sm:space-y-2 text-gray-700 text-xs sm:text-sm">
              <li>Select your shift type (Day/Night) above</li>
              <li>Click &quot;Start Camera Scanner&quot; to activate the webcam</li>
              <li>Hold your QR code in front of the camera</li>
              <li>Wait for the confirmation message</li>
            </ol>
            <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600">
                <strong className="text-[#0038A8]">Day Shift:</strong> AM In → AM Out → PM In → PM Out
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
                <strong className="text-[#0038A8]">Night Shift:</strong> Night In → Night Out
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-2 sm:mt-3">
                * Night shift attendance is recorded for the shift start date even if it crosses midnight.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 sm:mt-6 text-gray-400 text-[10px] sm:text-xs">
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 bg-[#FCD116] rounded-full"></span>
            © 2026 Philippine Ports Authority
            <span className="w-1 h-1 bg-[#FCD116] rounded-full"></span>
          </span>
        </div>
      </div>
    </div>
  );
}
