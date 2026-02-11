"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRScanner from "@/components/QRScanner";
import WatercolorBackground from "@/components/WatercolorBackground";
import { useToast } from "@/components/Toast";

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

interface Settings {
  amStartTime: string;
  amEndTime: string;
  pmStartTime: string;
  pmEndTime: string;
  nightStartTime: string;
  nightEndTime: string;
  amGracePeriod: number;
  pmGracePeriod: number;
  nightGracePeriod: number;
}

type ShiftType = "DAY" | "NIGHT";

const DAY_SHIFT_ACTIONS = ["AM In", "AM Out", "PM In", "PM Out"];
const NIGHT_SHIFT_ACTIONS = ["Night In", "Night Out"];

// Instructions popup component
function InstructionsPopup({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-4 transform animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#0038A8] flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            How to Use
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm mb-4">
          <li>Select your shift type (Day/Night)</li>
          <li>Click &quot;Start Camera Scanner&quot; to activate the webcam</li>
          <li>Hold your QR code in front of the camera</li>
          <li>Wait for the confirmation message</li>
        </ol>
        
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">
            <strong className="text-[#0038A8]">Day Shift:</strong> AM In → AM Out → PM In → PM Out
          </p>
          <p className="text-sm text-gray-600 mt-2">
            <strong className="text-[#0038A8]">Night Shift:</strong> Night In → Night Out
          </p>
          <p className="text-xs text-gray-400 mt-3">
            * Night shift attendance is recorded for the shift start date even if it crosses midnight.
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-[#0038A8] text-white rounded-lg font-medium hover:bg-[#002d8a] transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

// Helper function to get greeting message based on action
function getGreetingMessage(action: string, userName: string): string {
  const firstName = userName.split(' ')[0]; // Get first name only
  switch (action) {
    case "AM In":
      return `Good morning, ${firstName}!`;
    case "AM Out":
      return `Have a great lunch, ${firstName}!`;
    case "PM In":
      return `Welcome back, ${firstName}!`;
    case "PM Out":
      return `Have a great day ahead, ${firstName}!`;
    case "Night In":
      return `Good evening, ${firstName}!`;
    case "Night Out":
      return `Good night, ${firstName}! Rest well.`;
    default:
      return `Welcome, ${firstName}!`;
  }
}

// Helper function to format time from "HH:MM" to "h:mm A"
function formatTimeDisplay(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export default function ScanStationPage() {
  const router = useRouter();
  const { showSuccess, showError: showErrorToast } = useToast();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>("DAY");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayData, setOverlayData] = useState<{greeting: string; user: UserInfo; action: string; time: string} | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    amStartTime: "08:00",
    amEndTime: "12:00",
    pmStartTime: "13:00",
    pmEndTime: "17:00",
    nightStartTime: "22:00",
    nightEndTime: "06:00",
    amGracePeriod: 15,
    pmGracePeriod: 15,
    nightGracePeriod: 15,
  });

  // Fetch settings from API
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings({
            amStartTime: data.amStartTime || "08:00",
            amEndTime: data.amEndTime || "12:00",
            pmStartTime: data.pmStartTime || "13:00",
            pmEndTime: data.pmEndTime || "17:00",
            nightStartTime: data.nightStartTime || "22:00",
            nightEndTime: data.nightEndTime || "06:00",
            amGracePeriod: data.amGracePeriod || 15,
            pmGracePeriod: data.pmGracePeriod || 15,
            nightGracePeriod: data.nightGracePeriod || 15,
          });
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    }
    fetchSettings();
  }, []);

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
    async (data: { email: string; name: string }, photoBlob?: Blob) => {
      if (isProcessing) return;

      setIsProcessing(true);
      setScanResult(null);

      try {
        // First, record the attendance
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
          // If we have a photo and attendance was recorded, upload the photo
          if (photoBlob && responseData.attendanceId && responseData.action) {
            try {
              const formData = new FormData();
              formData.append("photo", photoBlob, "scan.jpg");
              formData.append("attendanceId", responseData.attendanceId);
              formData.append("action", responseData.action.toLowerCase().replace(" ", "-"));

              const photoRes = await fetch("/api/attendance/photo", {
                method: "POST",
                body: formData,
              });

              if (photoRes.ok) {
                const photoData = await photoRes.json();
                // Update attendance with photo URL
                await fetch("/api/attendance/photo/update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    attendanceId: responseData.attendanceId,
                    action: responseData.action.toLowerCase().replace(" ", "-"),
                    photoUrl: photoData.photoUrl,
                  }),
                });
              }
            } catch (photoError) {
              console.error("Failed to upload scan photo:", photoError);
              // Don't fail the scan if photo upload fails
            }
          }

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

          // Show toast notification
          showSuccess(responseData.message || `${responseData.action} recorded successfully!`);

          // Show overlay with greeting message
          if (responseData.user && responseData.action) {
            setOverlayData({
              greeting: getGreetingMessage(responseData.action, responseData.user.name),
              user: responseData.user,
              action: responseData.action,
              time: responseData.time,
            });
            setShowOverlay(true);
            setTimeout(() => setShowOverlay(false), 3000);
          }

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
          showErrorToast(responseData.message || responseData.error || "Failed to record attendance");
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
    showErrorToast(error);
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

  // Define mode tiles with icons - using settings for time display
  const dayShiftTiles = [
    { action: "AM In", label: "Morning Arrival", description: "Start of work day", time: `${formatTimeDisplay(settings.amStartTime)} (Start)`, icon: "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" },
    { action: "AM Out", label: "Lunch Break", description: "Break time out", time: `${formatTimeDisplay(settings.amEndTime)} (End)`, icon: "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" },
    { action: "PM In", label: "After Lunch", description: "Return from break", time: `${formatTimeDisplay(settings.pmStartTime)} (Start)`, icon: "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" },
    { action: "PM Out", label: "End of Day", description: "Work day complete", time: `${formatTimeDisplay(settings.pmEndTime)} (End)`, icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  const nightShiftTiles = [
    { action: "Night In", label: "Night Arrival", description: "Start of night shift", time: `${formatTimeDisplay(settings.nightStartTime)} (Start)`, icon: "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" },
    { action: "Night Out", label: "Night End", description: "Night shift complete", time: `${formatTimeDisplay(settings.nightEndTime)} (End)`, icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  const activeTiles = selectedShift === "DAY" ? dayShiftTiles : nightShiftTiles;

  return (
    <div className="min-h-screen min-h-[100dvh] p-2 sm:p-3 overflow-x-hidden bg-white">
      {/* Instructions Popup */}
      <InstructionsPopup isOpen={showInstructions} onClose={() => setShowInstructions(false)} />

      {/* Success Overlay Message */}
      {showOverlay && overlayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md mx-4 text-center transform animate-scaleIn">
            {/* Success checkmark */}
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            {/* Greeting Message */}
            <h2 className="text-xl sm:text-2xl font-bold text-[#0038A8] mb-3">
              {overlayData.greeting}
            </h2>
            
            {/* Profile Image */}
            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-4 border-[#0038A8] shadow-xl bg-gray-200 mb-3">
              {overlayData.user.profileImage ? (
                <img src={overlayData.user.profileImage} alt={overlayData.user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* User Info */}
            <h3 className="text-lg font-bold text-gray-800 mb-1">{overlayData.user.name}</h3>
            {overlayData.user.department && (
              <p className="text-gray-600 text-sm mb-3">
                {overlayData.user.department} {overlayData.user.position && `• ${overlayData.user.position}`}
              </p>
            )}
            
            {/* Action Badge */}
            <div className="flex items-center justify-center gap-2">
              <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700 border-2 border-emerald-400">
                {overlayData.action}
              </span>
              <span className="text-gray-500 font-mono text-sm">
                {new Date(overlayData.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Wavy Watercolor Background */}
      <WatercolorBackground />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Row - Compact */}
        <div className="flex items-center justify-between mb-2">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm border border-gray-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="font-medium">Back</span>
          </button>

          {/* Logo & Title */}
          <div className="flex items-center gap-2">
            <img src="/images/ppa-logo-nobg.png" alt="PPA Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
            <div className="text-center sm:text-left">
              <h1 className="text-base sm:text-lg font-bold text-[#0038A8] leading-tight">Philippine Ports Authority</h1>
              <p className="text-[#CE1126] text-xs font-medium">Attendance Monitoring System</p>
            </div>
          </div>

          {/* Date/Time & Help Button */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <span className="bg-[#0038A8]/10 px-2 py-1 rounded text-[#0038A8] text-xs font-medium" suppressHydrationWarning>
                {mounted && currentTime ? currentTime.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "--"}
              </span>
              <span className="bg-[#FCD116]/30 px-2 py-1 rounded text-[#0038A8] text-xs font-mono font-bold" suppressHydrationWarning>
                {mounted && currentTime ? currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
              </span>
            </div>
            <button
              onClick={() => setShowInstructions(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#0038A8] hover:bg-[#002d8a] text-white rounded-lg shadow-md transition-all duration-200 text-sm font-medium"
              title="How to use"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
              <span className="hidden sm:inline">Help</span>
            </button>
          </div>
        </div>

        {/* Shift Selector - Compact Inline */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-2 mb-2 border border-gray-200 shadow flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-xs font-medium">Shift:</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setSelectedShift("DAY")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedShift === "DAY" ? "bg-[#FCD116] text-[#0038A8] shadow" : "text-gray-500 hover:bg-gray-200"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setSelectedShift("NIGHT")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedShift === "NIGHT" ? "bg-indigo-500 text-white shadow" : "text-gray-500 hover:bg-gray-200"
                }`}
              >
                Night
              </button>
            </div>
          </div>
          
          {/* Schedule info inline */}
          <div className="flex items-center gap-2 text-[10px]">
            {selectedShift === "DAY" ? (
              <>
                <span className="bg-green-50 px-1.5 py-0.5 rounded border border-green-200 text-green-700">
                  AM: {formatTimeDisplay(settings.amStartTime)}-{formatTimeDisplay(settings.amEndTime)}
                </span>
                <span className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-blue-700">
                  PM: {formatTimeDisplay(settings.pmStartTime)}-{formatTimeDisplay(settings.pmEndTime)}
                </span>
              </>
            ) : (
              <span className="bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700">
                Night: {formatTimeDisplay(settings.nightStartTime)}-{formatTimeDisplay(settings.nightEndTime)}
              </span>
            )}
            <span className="text-gray-400">Grace: {settings.amGracePeriod}min</span>
          </div>
        </div>

        {/* Main Content - Scanner & Recent Activity Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          {/* QR Scanner */}
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0038A8] to-[#1a5f8a] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                </svg>
              </div>
              QR Code Scanner
            </h2>
            
            <QRScanner onScan={handleScan} onError={handleError} />

            {/* Scan Result - Only shows for errors */}
            {scanResult && !scanResult.success && (
              <div className="mt-3 p-3 rounded-lg text-center bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-400">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-red-800">{scanResult.message}</p>
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="mt-3 flex items-center justify-center gap-2 text-[#0038A8] bg-blue-50 p-3 rounded-lg">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0038A8] border-t-transparent"></div>
                <span className="font-medium text-sm">Processing...</span>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FCD116] to-[#d4a418] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Recent Activity
            </h2>
            
            {recentScans.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-medium text-sm">No scans yet today</p>
                <p className="text-xs text-gray-400 mt-1">Scanned attendance will appear here</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {recentScans.slice(0, 6).map((scan, index) => (
                  <div key={index} className={`p-2.5 rounded-lg border-2 transition-all hover:shadow-md ${getActionColor(scan.action)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow bg-gray-200 flex-shrink-0">
                          {scan.profileImage ? (
                            <img src={scan.profileImage} alt={scan.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-semibold block text-gray-800 text-xs">{scan.name}</span>
                          <span className="text-[11px] font-medium">{scan.action}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-gray-600">
                        {new Date(scan.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Attendance Actions - Full Width at Bottom */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 border border-gray-200 shadow-lg">
          <h2 className="text-[#0038A8] font-bold text-sm mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#FCD116] rounded-full"></span>
            Attendance Actions
          </h2>
          <div className={`grid gap-3 ${selectedShift === "DAY" ? "grid-cols-4" : "grid-cols-2 max-w-md mx-auto"}`}>
            {activeTiles.map((tile) => {
              const isActive = selectedShift === "DAY" 
                ? DAY_SHIFT_ACTIONS.includes(tile.action) 
                : NIGHT_SHIFT_ACTIONS.includes(tile.action);
              
              return (
                <div
                  key={tile.action}
                  className={`relative overflow-hidden rounded-xl p-3 transition-all duration-300 ${
                    isActive ? `${getTileBgColor(tile.action, true)} shadow-lg hover:shadow-xl hover:scale-[1.02]` : "bg-gray-400/30 opacity-50"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg mb-2 flex items-center justify-center ${isActive ? "bg-white/20" : "bg-gray-300/30"}`}>
                    <svg className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={tile.icon} />
                    </svg>
                  </div>
                  
                  <h3 className={`font-bold text-sm ${isActive ? "text-white" : "text-gray-500"}`}>{tile.action}</h3>
                  <p className={`text-xs ${isActive ? "text-white/80" : "text-gray-400"}`}>{tile.label}</p>
                  <p className={`text-[10px] mt-1 ${isActive ? "text-white/60" : "text-gray-400"}`}>{tile.time}</p>
                  
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer - Minimal */}
        <div className="text-center mt-2 text-gray-400 text-[10px]">
          © 2026 Philippine Ports Authority
        </div>
      </div>
    </div>
  );
}
