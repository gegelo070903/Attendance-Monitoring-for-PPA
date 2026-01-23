"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface QRCodeGeneratorProps {
  userEmail: string;
  userName: string;
  size?: number;
}

export default function QRCodeGenerator({
  userEmail,
  userName,
  size = 300,
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);

  useEffect(() => {
    const generateQRWithLogo = async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Generate QR code with user email (permanent identifier)
      const qrData = JSON.stringify({
        email: userEmail,
        name: userName,
        type: "PPA_ATTENDANCE",
      });

      // Generate QR code with higher error correction for logo overlay
      await QRCode.toCanvas(canvas, qrData, {
        width: size,
        margin: 2,
        errorCorrectionLevel: "H", // High error correction to allow logo overlay
        color: {
          dark: "#1e3a5f", // Dark blue (PPA color)
          light: "#ffffff",
        },
      });

      // Load and draw logo in center
      const logo = new Image();
      logo.crossOrigin = "anonymous";
      logo.onload = () => {
        const logoSize = size * 0.22; // Logo takes 22% of QR code size
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;

        // Draw white circle background for logo
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 8, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Draw border around logo
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 8, 0, 2 * Math.PI);
        ctx.strokeStyle = "#1e3a5f";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw the logo
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        setIsLogoLoaded(true);
      };
      logo.onerror = () => {
        // If logo fails to load, QR code still works without it
        console.log("Logo not found, QR code generated without logo");
        setIsLogoLoaded(true);
      };
      logo.src = "/images/download-removebg-preview.png";
    };

    generateQRWithLogo();
  }, [userEmail, userName, size]);

  const downloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement("a");
      link.download = `${userName.replace(/\s+/g, "_")}_PPA_QR.png`;
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
    }
  };

  const printQR = () => {
    if (canvasRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>PPA Attendance QR Code - ${userName}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                background: #fff;
              }
              .qr-card {
                border: 3px solid #1e3a5f;
                border-radius: 16px;
                padding: 30px;
                text-align: center;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              .header {
                color: #1e3a5f;
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .subheader {
                color: #64748b;
                font-size: 12px;
                margin-bottom: 20px;
              }
              .qr-image {
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              }
              .name {
                margin-top: 20px;
                font-size: 20px;
                font-weight: bold;
                color: #1e3a5f;
              }
              .email {
                color: #64748b;
                font-size: 12px;
                margin-top: 5px;
              }
              .footer {
                margin-top: 15px;
                font-size: 10px;
                color: #94a3b8;
              }
              @media print {
                body { padding: 0; }
                .qr-card { box-shadow: none; border: 2px solid #1e3a5f; }
              }
            </style>
          </head>
          <body>
            <div class="qr-card">
              <div class="header">PHILIPPINE PORTS AUTHORITY</div>
              <div class="subheader">Attendance Monitoring System</div>
              <img src="${canvasRef.current.toDataURL("image/png")}" class="qr-image" />
              <div class="name">${userName}</div>
              <div class="email">${userEmail}</div>
              <div class="footer">Scan this QR code at the attendance station</div>
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 bg-white rounded-xl shadow-lg border-2 border-blue-100">
        <canvas ref={canvasRef} className="rounded-lg" />
      </div>
      <div className="flex gap-3">
        <button
          onClick={downloadQR}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-md"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
        <button
          onClick={printQR}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium shadow-md"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
      </div>
    </div>
  );
}
