"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface FaceCaptureProps {
  userName: string;
  action: string;
  onCapture: (photoBlob: Blob) => void;
  onSkip: () => void;
  autoCaptureSecs?: number;
}

export default function FaceCapture({
  userName,
  action,
  onCapture,
  onSkip,
  autoCaptureSecs = 5,
}: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(autoCaptureSecs);
  const [captured, setCaptured] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const capturedRef = useRef(false);

  // Random motivational smile messages
  const smileMessages = [
    "Smile! You're making today brighter! 😊",
    "A smile is the best accessory — wear it! 😄",
    "You're doing great! Show us that smile! 🌟",
    "Keep smiling — it looks amazing on you! ✨",
    "Your smile can light up the whole office! 🔆",
    "Say cheese! Let's capture that good energy! 📸",
    "Smiling burns calories — go ahead, smile big! 😁",
    "A smile is the shortest distance between people! 🤗",
    "You made it! Now give us your best smile! 🎉",
    "Start the shift right — with a smile! 💪😊",
    "Every day is a good day when you smile! ☀️",
    "Your smile just made someone's day better! 💛",
  ];
  const [smileMessage] = useState(() => smileMessages[Math.floor(Math.random() * smileMessages.length)]);

  // Start the front-facing camera
  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsReady(true);
          };
        }
      } catch (err) {
        console.error("Failed to access camera:", err);
        setError("Cannot access camera. Please allow camera permissions.");
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Countdown and auto-capture
  useEffect(() => {
    if (!isReady || captured) return;

    setCountdown(autoCaptureSecs);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto-capture
          if (!capturedRef.current) {
            capturedRef.current = true;
            setTimeout(() => takePhoto(), 0);
          }
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isReady, captured, autoCaptureSecs]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw mirrored (front-facing camera is usually mirrored)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Add timestamp watermark
    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`${userName} | ${action} | ${timestamp}`, 8, canvas.height - 10);

    // Generate preview
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreviewUrl(dataUrl);
    setCaptured(true);

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Convert to blob and send
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
        }
      },
      "image/jpeg",
      0.85
    );
  }, [userName, action, onCapture]);

  const handleManualCapture = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    capturedRef.current = true;
    takePhoto();
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-2">Camera Error</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={onSkip}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Continue Without Photo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0038A8] to-[#1a5f8a] px-5 py-3 text-white">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <div>
              <h3 className="font-bold text-sm">Photo Verification</h3>
              <p className="text-white/70 text-xs">Please face the camera for verification</p>
            </div>
          </div>
        </div>

        {/* Camera View / Preview */}
        <div className="relative bg-black">
          {!captured ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[4/3] object-cover"
                style={{ transform: "scaleX(-1)" }}
              />

              {/* Face guide overlay */}
              {isReady && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-48 border-2 border-white/40 rounded-[50%] relative">
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-white rounded-tl-xl"></div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-white rounded-tr-xl"></div>
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-white rounded-bl-xl"></div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-white rounded-br-xl"></div>
                  </div>
                </div>
              )}

              {/* Countdown badge */}
              {isReady && countdown > 0 && (
                <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-[#0038A8]/80 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{countdown}</span>
                </div>
              )}

              {/* Motivational smile message */}
              {isReady && !captured && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-8 pb-3 px-4">
                  <p className="text-white text-center text-sm font-medium drop-shadow-lg animate-pulse">
                    {smileMessage}
                  </p>
                </div>
              )}

              {/* "Getting ready" state */}
              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm">Starting camera...</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Photo preview */
            previewUrl && (
              <img src={previewUrl} alt="Captured photo" className="w-full aspect-[4/3] object-cover" />
            )
          )}
        </div>

        {/* User info & action */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-800">{userName}</p>
              <p className="text-xs text-gray-500">{action}</p>
            </div>
            {captured && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Photo captured
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {!captured ? (
              <>
                <button
                  onClick={handleManualCapture}
                  disabled={!isReady}
                  className="flex-1 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-semibold hover:bg-[#002d8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  Capture Now
                </button>
                <button
                  onClick={onSkip}
                  className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  Skip
                </button>
              </>
            ) : (
              <div className="flex-1 text-center">
                <p className="text-xs text-green-600 font-medium">Attendance recorded successfully!</p>
              </div>
            )}
          </div>
        </div>

        {/* Hidden canvas for photo processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
