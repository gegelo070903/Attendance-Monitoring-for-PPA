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

    // Use consistent styles for both preview and print
    const cardStyles = `
      .card {
        width: 2.125in;
        height: 3.375in;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        position: relative;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        border: 1px solid #e2e8f0;
      }
      
      /* Corner Decorations */
      .corner-top-left {
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        border-left: 50px solid #0038A8;
        border-bottom: 50px solid transparent;
      }
      .corner-bottom-right {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 0;
        height: 0;
        border-right: 50px solid #CE1126;
        border-top: 50px solid transparent;
      }
      
      /* Header */
      .card-header {
        padding: 16px 12px 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        position: relative;
        z-index: 1;
      }
      .logo {
        width: 36px;
        height: 36px;
        object-fit: contain;
      }
      .company-name {
        font-size: 9px;
        font-weight: 700;
        color: #0038A8;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        line-height: 1.3;
        text-align: left;
      }
      
      /* Profile Section */
      .profile-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 12px;
        position: relative;
        z-index: 1;
      }
      .profile-image-container {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 3px solid #0038A8;
        overflow: hidden;
        background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .profile-image {
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
        font-size: 32px;
        font-weight: bold;
        color: #64748b;
        background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
      }
      
      /* User Info */
      .user-info {
        text-align: center;
        margin-top: 10px;
        padding: 0 8px;
      }
      .user-name {
        font-size: 13px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 4px;
        line-height: 1.2;
      }
      .user-department {
        font-size: 9px;
        color: #64748b;
        margin-bottom: 2px;
      }
      .user-position {
        font-size: 9px;
        color: #CE1126;
        font-weight: 600;
      }
      
      /* ID Badge */
      .id-badge {
        margin-top: 12px;
        display: inline-block;
        background: linear-gradient(135deg, #0038A8, #1e4d8c);
        color: #fff;
        padding: 5px 16px;
        border-radius: 12px;
        font-size: 8px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      
      /* Yellow Accent Line */
      .accent-line {
        width: 40px;
        height: 3px;
        background: #FCD116;
        margin: 12px auto 0;
        border-radius: 2px;
      }
      
      /* Back Card */
      .card-back {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 16px;
      }
      .back-corner-top-right {
        position: absolute;
        top: 0;
        right: 0;
        width: 0;
        height: 0;
        border-right: 50px solid #CE1126;
        border-bottom: 50px solid transparent;
      }
      .back-corner-bottom-left {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 0;
        height: 0;
        border-left: 50px solid #0038A8;
        border-top: 50px solid transparent;
      }
      .back-header {
        text-align: center;
        margin-bottom: 4px;
        position: relative;
        z-index: 1;
      }
      .back-company {
        font-size: 10px;
        font-weight: 700;
        color: #0038A8;
      }
      .back-title {
        font-size: 8px;
        color: #0038A8;
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 500;
        position: relative;
        z-index: 1;
      }
      .qr-container {
        background: #fff;
        padding: 10px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border: 2px solid #0038A8;
        position: relative;
        z-index: 1;
      }
      .qr-code {
        width: 110px;
        height: 110px;
        display: block;
      }
    `;

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
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            background: #f1f5f9;
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
            font-size: 12px;
            color: #64748b;
            margin-bottom: 8px;
            font-weight: 500;
          }
          ${cardStyles}
          
          @media print {
            body {
              background: #fff;
              padding: 0;
            }
            .cards-container {
              gap: 20px;
            }
            .card {
              box-shadow: none;
              border: 1px solid #ccc;
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
            <div class="card">
              <div class="corner-top-left"></div>
              <div class="corner-bottom-right"></div>
              
              <div class="card-header">
                <img src="/images/ppa-logo-nobg.png" alt="PPA Logo" class="logo" />
                <div class="company-name">
                  Philippine<br/>Ports Authority
                </div>
              </div>
              
              <div class="profile-section">
                <div class="profile-image-container">
                  ${userProfileImage 
                    ? `<img src="${userProfileImage}" alt="Profile" class="profile-image" />`
                    : `<div class="profile-placeholder">${userName.charAt(0).toUpperCase()}</div>`
                  }
                </div>
                <div class="user-info">
                  <div class="user-name">${userName}</div>
                  ${userDepartment ? `<div class="user-department">${userDepartment}</div>` : ''}
                  ${userPosition ? `<div class="user-position">${userPosition}</div>` : ''}
                </div>
                <span class="id-badge">Employee ID</span>
                <div class="accent-line"></div>
              </div>
            </div>
          </div>
          
          <!-- BACK CARD -->
          <div class="card-wrapper">
            <div class="card-label">Back</div>
            <div class="card card-back">
              <div class="back-corner-top-right"></div>
              <div class="back-corner-bottom-left"></div>
              
              <div class="back-header">
                <span class="back-company">Philippine Ports Authority</span>
              </div>
              <div class="back-title">Scan for Attendance</div>
              <div class="qr-container">
                <img src="${qrDataUrl}" class="qr-code" alt="QR Code" />
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
    <div className="flex flex-col items-center gap-6">
      {/* Hidden canvas for QR code generation */}
      <canvas ref={qrCanvasRef} className="hidden" />
      
      {/* ID Card Preview - Matching Print Design */}
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4 text-center">ID Card Preview</h3>
        
        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
          {/* Front Card Preview */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-2">Front</span>
            <div 
              className="bg-gradient-to-b from-white to-slate-50 rounded-xl overflow-hidden shadow-xl relative border border-slate-200"
              style={{ width: '170px', height: '270px' }}
            >
              {/* Corner decorations */}
              <div className="absolute top-0 left-0 w-0 h-0 border-l-[40px] border-l-[#0038A8] border-b-[40px] border-b-transparent"></div>
              <div className="absolute bottom-0 right-0 w-0 h-0 border-r-[40px] border-r-[#CE1126] border-t-[40px] border-t-transparent"></div>
              
              {/* Header */}
              <div className="flex items-center justify-center gap-2 pt-4 px-3 relative z-10">
                <img src="/images/ppa-logo-nobg.png" alt="PPA" className="w-9 h-9 object-contain" />
                <p className="text-[8px] font-bold text-[#0038A8] leading-tight uppercase">Philippine<br/>Ports Authority</p>
              </div>
              
              {/* Profile Section */}
              <div className="flex flex-col items-center pt-2 relative z-10">
                <div className="w-[72px] h-[72px] rounded-full border-[3px] border-[#0038A8] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 shadow-lg">
                  {userProfileImage ? (
                    <img src={userProfileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-2xl bg-gradient-to-br from-slate-200 to-slate-300">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="text-center mt-2 px-3">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">{userName}</p>
                  {userDepartment && <p className="text-[7px] text-slate-500 mt-1">{userDepartment}</p>}
                  {userPosition && <p className="text-[8px] text-[#CE1126] font-semibold">{userPosition}</p>}
                </div>
                
                <span className="mt-3 text-[7px] bg-gradient-to-r from-[#0038A8] to-[#1e4d8c] text-white px-4 py-1.5 rounded-xl font-semibold uppercase tracking-wide">
                  Employee ID
                </span>
                
                {/* Yellow accent line */}
                <div className="w-10 h-1 bg-[#FCD116] rounded-full mt-3"></div>
              </div>
            </div>
          </div>

          {/* Back Card Preview */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-2">Back</span>
            <div 
              className="bg-gradient-to-b from-white to-slate-50 rounded-xl overflow-hidden shadow-xl relative border border-slate-200 flex flex-col items-center justify-center"
              style={{ width: '170px', height: '270px' }}
            >
              {/* Corner decorations - inverted */}
              <div className="absolute top-0 right-0 w-0 h-0 border-r-[40px] border-r-[#CE1126] border-b-[40px] border-b-transparent"></div>
              <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[40px] border-l-[#0038A8] border-t-[40px] border-t-transparent"></div>
              
              <p className="text-[9px] text-[#0038A8] font-bold mb-1 relative z-10">Philippine Ports Authority</p>
              <p className="text-[7px] text-[#0038A8] uppercase tracking-wider font-medium mb-3 relative z-10">Scan for Attendance</p>
              
              <div className="bg-white p-2 rounded-xl shadow-md border-2 border-[#0038A8] relative z-10">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-[100px] h-[100px]" />
                ) : (
                  <div className="w-[100px] h-[100px] bg-slate-100 animate-pulse rounded-lg"></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Button */}
      <button
        onClick={printIDCard}
        disabled={!qrDataUrl}
        className="px-6 py-3 bg-gradient-to-r from-[#0038A8] to-[#1e4d8c] text-white rounded-lg hover:from-[#1e4d8c] hover:to-[#0038A8] transition-all duration-300 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
        </svg>
        Print ID Card
      </button>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
        Standard ID card size: 2.125&quot; × 3.375&quot; (CR80)
      </p>
    </div>
  );
}
