"use client";

import { useRef, useEffect, useState } from "react";
import QRCode from "qrcode";

interface IDCardPrinterProps {
  userEmail: string;
  userName: string;
  userDepartment?: string;
  userPosition?: string;
  userProfileImage?: string | null;
}

export default function IDCardPrinter({
  userEmail,
  userName,
  userDepartment,
  userPosition,
  userProfileImage,
}: IDCardPrinterProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    const generateQRWithLogo = async () => {
      if (!qrCanvasRef.current) return;

      const canvas = qrCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = 200;
      canvas.width = size;
      canvas.height = size;

      const qrData = JSON.stringify({
        email: userEmail,
        name: userName,
        type: "PPA_ATTENDANCE",
      });

      // Generate QR code with high error correction for logo overlay
      await QRCode.toCanvas(canvas, qrData, {
        width: size,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: "#0038A8",
          light: "#ffffff",
        },
      });

      // Load and draw logo in center
      const logo = new Image();
      logo.crossOrigin = "anonymous";
      logo.onload = () => {
        const logoSize = size * 0.22;
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;

        // Draw white circle background for logo
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 6, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Draw border around logo
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 6, 0, 2 * Math.PI);
        ctx.strokeStyle = "#0038A8";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw the logo
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        setQrDataUrl(canvas.toDataURL("image/png"));
      };
      logo.onerror = () => {
        setQrDataUrl(canvas.toDataURL("image/png"));
      };
      logo.src = "/images/ppa-logo-nobg.png";
    };

    generateQRWithLogo();
  }, [userEmail, userName]);

  const printIDCard = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PPA ID Card - ${userName}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            background: #f5f5f5;
          }
          .cards-container {
            display: flex;
            gap: 40px;
            flex-wrap: wrap;
            justify-content: center;
          }
          .card-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .card-label {
            text-align: center;
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
            font-weight: 500;
          }
          .card {
            width: 2.125in;
            height: 3.375in;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            position: relative;
            background: #fff;
          }
          
          /* FRONT CARD */
          .card-front {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          /* Diagonal corner decorations - Front */
          .front-corner-top {
            position: absolute;
            top: 0;
            left: 0;
            width: 70px;
            height: 70px;
            overflow: hidden;
          }
          .front-corner-top::before {
            content: '';
            position: absolute;
            top: -35px;
            left: -35px;
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, #0038A8 50%, transparent 50%);
            transform: rotate(0deg);
          }
          .front-corner-bottom {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 70px;
            height: 70px;
            overflow: hidden;
          }
          .front-corner-bottom::before {
            content: '';
            position: absolute;
            bottom: -35px;
            right: -35px;
            width: 70px;
            height: 70px;
            background: linear-gradient(315deg, #CE1126 50%, transparent 50%);
          }
          
          /* Header section - Logo beside company name */
          .front-header {
            padding: 18px 12px 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            z-index: 1;
          }
          .front-logo {
            width: 35px;
            height: 35px;
            flex-shrink: 0;
          }
          .front-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .company-name {
            font-size: 8px;
            font-weight: 700;
            color: #0038A8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1.3;
            text-align: left;
          }
          
          /* Profile section */
          .profile-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 8px 10px;
            z-index: 1;
          }
          .profile-image {
            width: 85px;
            height: 85px;
            border-radius: 50%;
            border: 3px solid #0038A8;
            overflow: hidden;
            background: #f0f0f0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .profile-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .profile-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #e8e8e8, #d0d0d0);
            color: #666;
            font-size: 32px;
            font-weight: bold;
          }
          
          /* User info */
          .user-info {
            text-align: center;
            margin-top: 10px;
            padding: 0 8px;
          }
          .user-name {
            font-size: 12px;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 4px;
            line-height: 1.2;
          }
          .user-department {
            font-size: 8px;
            color: #666;
            margin-bottom: 2px;
          }
          .user-position {
            font-size: 8px;
            color: #CE1126;
            font-weight: 600;
          }
          
          /* ID Badge - moved up */
          .id-badge-container {
            margin-top: 10px;
            z-index: 1;
          }
          .id-badge {
            display: inline-block;
            background: linear-gradient(135deg, #0038A8, #1e4d8c);
            color: #fff;
            padding: 4px 14px;
            border-radius: 10px;
            font-size: 7px;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          
          /* Footer spacer */
          .front-footer {
            padding: 10px;
            z-index: 1;
          }
          
          /* BACK CARD */
          .card-back {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 15px;
            height: 100%;
          }
          
          /* Diagonal corner decorations - Back */
          .back-corner-top {
            position: absolute;
            top: 0;
            right: 0;
            width: 70px;
            height: 70px;
            overflow: hidden;
          }
          .back-corner-top::before {
            content: '';
            position: absolute;
            top: -35px;
            right: -35px;
            width: 70px;
            height: 70px;
            background: linear-gradient(225deg, #CE1126 50%, transparent 50%);
          }
          .back-corner-bottom {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 70px;
            height: 70px;
            overflow: hidden;
          }
          .back-corner-bottom::before {
            content: '';
            position: absolute;
            bottom: -35px;
            left: -35px;
            width: 70px;
            height: 70px;
            background: linear-gradient(45deg, #0038A8 50%, transparent 50%);
          }
          
          .back-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            z-index: 1;
          }
          .back-title {
            font-size: 8px;
            color: #0038A8;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
          }
          .qr-container {
            background: #fff;
            padding: 8px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 2px solid #0038A8;
          }
          .qr-code {
            width: 120px;
            height: 120px;
            display: block;
          }
          .scan-instruction {
            margin-top: 12px;
            font-size: 7px;
            color: #666;
            text-align: center;
            line-height: 1.4;
          }
          .back-footer {
            margin-top: 15px;
            text-align: center;
            font-size: 6px;
            color: #999;
            z-index: 1;
          }
          
          @media print {
            body {
              background: #fff;
              padding: 0;
            }
            .cards-container {
              gap: 30px;
            }
            .card {
              box-shadow: none;
              border: 1px solid #ddd;
            }
            .card-label {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="cards-container">
          <!-- FRONT CARD -->
          <div class="card-wrapper">
            <div class="card-label">Front</div>
            <div class="card card-front">
              <div class="front-corner-top"></div>
              <div class="front-corner-bottom"></div>
              
              <div class="front-header">
                <div class="front-logo">
                  <img src="/images/ppa-logo-nobg.png" alt="PPA Logo" />
                </div>
                <div class="company-name">
                  Philippine<br/>Ports Authority
                </div>
              </div>
              
              <div class="profile-section">
                <div class="profile-image">
                  ${userProfileImage 
                    ? `<img src="${userProfileImage}" alt="Profile" />`
                    : `<div class="profile-placeholder">${userName.charAt(0).toUpperCase()}</div>`
                  }
                </div>
                <div class="user-info">
                  <div class="user-name">${userName}</div>
                  ${userDepartment ? `<div class="user-department">${userDepartment}</div>` : ''}
                  ${userPosition ? `<div class="user-position">${userPosition}</div>` : ''}
                </div>
                <div class="id-badge-container">
                  <span class="id-badge">EMPLOYEE ID</span>
                </div>
              </div>
              
              <div class="front-footer"></div>
            </div>
          </div>
          
          <!-- BACK CARD -->
          <div class="card-wrapper">
            <div class="card-label">Back</div>
            <div class="card card-back">
              <div class="back-corner-top"></div>
              <div class="back-corner-bottom"></div>
              
              <div class="back-content">
                <div class="back-title">Scan for Attendance</div>
                <div class="qr-container">
                  <img src="${qrDataUrl}" class="qr-code" alt="QR Code" />
                </div>
                <div class="scan-instruction">
                  Present this QR code at the<br/>attendance station to check in or check out
                </div>
              </div>
              <div class="back-footer">
                Philippine Ports Authority<br/>Attendance Monitoring System
              </div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden canvas for QR code generation */}
      <canvas ref={qrCanvasRef} className="hidden" />
      
      {/* ID Card Preview - Vertical */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 w-full max-w-sm">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 text-center">ID Card Preview (Front)</h3>
        
        {/* Front Preview - Vertical */}
        <div 
          className="bg-white rounded-xl overflow-hidden shadow-lg mx-auto relative"
          style={{ width: '170px', height: '270px' }}
        >
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-12 h-12 overflow-hidden">
            <div className="absolute -top-6 -left-6 w-12 h-12 bg-[#0038A8] rotate-45 transform origin-center"></div>
          </div>
          <div className="absolute bottom-0 right-0 w-12 h-12 overflow-hidden">
            <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-[#CE1126] rotate-45 transform origin-center"></div>
          </div>
          
          {/* Content */}
          <div className="flex flex-col items-center h-full relative z-10 pt-4">
            {/* Logo & Company - Side by side */}
            <div className="flex items-center justify-center gap-2 px-3">
              <img src="/images/ppa-logo-nobg.png" alt="PPA" className="w-8 h-8 object-contain flex-shrink-0" />
              <p className="text-[7px] font-bold text-[#0038A8] leading-tight">PHILIPPINE<br/>PORTS AUTHORITY</p>
            </div>
            
            {/* Profile */}
            <div className="flex-1 flex flex-col items-center justify-start pt-3">
              <div className="w-16 h-16 rounded-full border-2 border-[#0038A8] overflow-hidden bg-gray-100 shadow">
                {userProfileImage ? (
                  <img src={userProfileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-bold text-xl">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-center mt-2 px-2">
                <p className="text-[10px] font-bold text-gray-800 leading-tight">{userName}</p>
                {userDepartment && <p className="text-[6px] text-gray-500 mt-1">{userDepartment}</p>}
                {userPosition && <p className="text-[7px] text-[#CE1126] font-semibold">{userPosition}</p>}
              </div>
              
              {/* Badge - moved up under info */}
              <div className="mt-3">
                <span className="text-[6px] bg-[#0038A8] text-white px-2 py-1 rounded-full font-semibold">EMPLOYEE ID</span>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">Back side contains QR code with logo</p>
      </div>

      {/* Print Button */}
      <button
        onClick={printIDCard}
        className="px-6 py-3 bg-gradient-to-r from-[#0038A8] to-[#1e4d8c] text-white rounded-lg hover:from-[#1e4d8c] hover:to-[#0038A8] transition-all duration-300 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print ID Card
      </button>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
        Standard vertical ID card: 2.125" × 3.375" (54mm × 86mm)
      </p>
    </div>
  );
}
