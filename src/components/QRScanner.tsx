"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (data: { email: string; name: string }, photoBlob?: Blob) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Function to capture photo from video stream
  const capturePhoto = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      try {
        const videoElement = document.querySelector("#qr-reader video") as HTMLVideoElement;
        const canvas = canvasRef.current;
        
        if (!videoElement || !canvas) {
          console.error("Video element or canvas not found");
          resolve(null);
          return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        // Set canvas size to match video
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        // Draw the current video frame (mirror it since video is mirrored)
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(videoElement, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        // Convert to blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/jpeg", 0.8);
      } catch (err) {
        console.error("Error capturing photo:", err);
        resolve(null);
      }
    });
  }, []);

  const startScanner = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader");
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            
            // Validate QR code format - support both email and userId for backwards compatibility
            if (data.type !== "PPA_ATTENDANCE" || (!data.email && !data.userId)) {
              onError?.("Invalid QR code format");
              return;
            }

            const identifier = data.email || data.userId;

            // Prevent duplicate scans within 5 seconds
            if (lastScanned === identifier) {
              return;
            }

            setLastScanned(identifier);
            setTimeout(() => setLastScanned(null), 5000);

            // Capture photo before calling onScan
            const photoBlob = await capturePhoto();
            
            onScan({ email: data.email || data.userId, name: data.name }, photoBlob || undefined);
          } catch {
            onError?.("Invalid QR code data");
          }
        },
        () => {
          // QR code scan error (no code found) - ignore
        }
      );

      setIsScanning(true);
    } catch (err) {
      onError?.(`Failed to start camera: ${err}`);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current;
        if (isScanning) {
          await scanner.stop();
        }
        // Clear the scanner element content
        const element = document.getElementById("qr-reader");
        if (element) {
          element.innerHTML = "";
        }
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
        // Still reset state even if error
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Add style to mirror the camera video */}
      <style jsx global>{`
        #qr-reader video {
          transform: scaleX(-1);
        }
        #qr-reader__scan_region video {
          transform: scaleX(-1);
        }
      `}</style>
      
      <div
        ref={containerRef}
        id="qr-reader"
        className={`w-full rounded-lg overflow-hidden border-2 ${isScanning ? "bg-gray-800 border-gray-700" : "bg-transparent border-transparent"}`}
        style={{ minHeight: isScanning ? "220px" : "0px", maxWidth: "280px" }}
      />

      {!isScanning ? (
        <button
          onClick={startScanner}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 text-sm font-semibold shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
          Start Camera Scanner
        </button>
      ) : (
        <button
          onClick={stopScanner}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 text-sm font-semibold shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
          </svg>
          Stop Scanner
        </button>
      )}

      {lastScanned && (
        <p className="text-xs text-gray-500">
          Recently scanned. Please wait...
        </p>
      )}
    </div>
  );
}
