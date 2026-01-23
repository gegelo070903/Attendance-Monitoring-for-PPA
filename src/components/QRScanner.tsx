"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (data: { email: string; name: string }) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        (decodedText) => {
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

            onScan({ email: data.email || data.userId, name: data.name });
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
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        id="qr-reader"
        className="w-full max-w-md bg-gray-900 rounded-lg overflow-hidden"
        style={{ minHeight: isScanning ? "300px" : "0px" }}
      />

      {!isScanning ? (
        <button
          onClick={startScanner}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold"
        >
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
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Start Camera Scanner
        </button>
      ) : (
        <button
          onClick={stopScanner}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-lg font-semibold"
        >
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
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            />
          </svg>
          Stop Scanner
        </button>
      )}

      {lastScanned && (
        <p className="text-sm text-gray-500">
          Recently scanned. Please wait before scanning again.
        </p>
      )}
    </div>
  );
}
