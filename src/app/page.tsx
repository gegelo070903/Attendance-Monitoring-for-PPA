import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start lg:justify-center relative overflow-x-hidden overflow-y-auto bg-white py-8 lg:py-0">
      {/* Watercolor gradient background - blue top, white middle, red bottom */}
      <div className="absolute inset-0 pointer-events-none">
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

      <div className="text-center space-y-4 sm:space-y-6 lg:space-y-8 p-4 sm:p-6 lg:p-8 relative z-10 max-w-5xl mx-auto w-full">
        {/* Logo + Title Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-2">
          {/* Compass Logo (left of title) */}
          <img
            src="/images/ppa-logo-nobg.png"
            alt="PPA Logo"
            className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 object-contain"
          />
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0038A8] drop-shadow-sm">
            Philippine Ports Authority
          </h1>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-lg sm:text-xl md:text-2xl text-[#CE1126] font-semibold">
            Attendance Monitoring System
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2 sm:mt-4">
            <div className="h-0.5 w-12 sm:w-16 bg-[#0038A8]/40 rounded-full"></div>
            <div className="h-1.5 w-1.5 bg-[#FCD116] rounded-full"></div>
            <div className="h-0.5 w-12 sm:w-16 bg-[#CE1126]/40 rounded-full"></div>
          </div>
          <p className="text-gray-600 max-w-lg mx-auto mt-2 sm:mt-4 text-sm sm:text-base lg:text-lg leading-relaxed px-2">
            Track employee attendance, manage schedules, and generate comprehensive reports with our modern QR-based attendance management system.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-4 sm:mt-6 lg:mt-8 px-4 sm:px-0">
          <Link
            href="/auth/login"
            className="px-6 sm:px-8 lg:px-10 py-3 sm:py-3.5 lg:py-4 bg-white text-[#0038A8] rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 text-base sm:text-lg border-2 border-[#0038A8]/20"
          >
            Sign In
          </Link>
          <Link
            href="/scan"
            className="px-6 sm:px-8 lg:px-10 py-3 sm:py-3.5 lg:py-4 bg-[#CE1126] text-white rounded-xl hover:bg-[#b30f21] transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105 text-base sm:text-lg"
          >
            QR Scanner Station
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 mt-8 sm:mt-12 lg:mt-16 max-w-4xl mx-auto px-2 sm:px-0">
          {/* QR Code Scanning Card */}
          <div className="bg-white/95 backdrop-blur p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-t-4 border-[#0038A8] group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#0038A8] to-[#1a5f8a] rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto shadow-lg group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="font-bold text-[#0038A8] mb-2 text-base sm:text-lg">QR Code Scanning</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">Quick attendance tracking with personal QR codes - just scan and go!</p>
          </div>

          {/* AM/PM Tracking Card */}
          <div className="bg-white/95 backdrop-blur p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-t-4 border-[#FCD116] group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#FCD116] to-[#d4a418] rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto shadow-lg group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-[#0038A8] mb-2 text-base sm:text-lg">AM/PM Tracking</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">Track morning and afternoon attendance with separate time slots</p>
          </div>

          {/* Real-time Reports Card */}
          <div className="bg-white/95 backdrop-blur p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-t-4 border-[#CE1126] group sm:col-span-2 lg:col-span-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#CE1126] to-[#8B1538] rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto shadow-lg group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-[#0038A8] mb-2 text-base sm:text-lg">Real-time Reports</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">Generate daily, weekly, and monthly attendance reports instantly</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative sm:absolute bottom-2 sm:bottom-4 text-center text-gray-500 text-xs mt-6 sm:mt-0">
        <span className="inline-flex items-center gap-1">
          <span className="w-1 h-1 bg-[#FCD116] rounded-full"></span>
          © 2026 Philippine Ports Authority. All rights reserved.
          <span className="w-1 h-1 bg-[#FCD116] rounded-full"></span>
        </span>
      </div>
    </main>
  );
}
