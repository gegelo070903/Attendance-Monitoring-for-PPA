import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import WatercolorBackground from "@/components/WatercolorBackground";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="h-screen h-[100dvh] flex flex-col relative overflow-hidden bg-white">
      {/* Wavy Watercolor Background */}
      <WatercolorBackground />

      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
        <div className="text-center max-w-4xl mx-auto w-full">
          {/* Logo + Title Row */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <img
              src="/images/ppa-logo-nobg.png"
              alt="PPA Logo"
              className="w-12 h-12 object-contain"
            />
            <h1 className="text-3xl font-bold text-[#0038A8] drop-shadow-sm">
              Philippine Ports Authority
            </h1>
          </div>

          <h2 className="text-lg text-[#CE1126] font-semibold mb-1">
            Attendance Monitoring System
          </h2>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-0.5 w-12 bg-[#0038A8]/40 rounded-full"></div>
            <div className="h-1.5 w-1.5 bg-[#FCD116] rounded-full"></div>
            <div className="h-0.5 w-12 bg-[#CE1126]/40 rounded-full"></div>
          </div>
          
          <p className="text-gray-600 max-w-lg mx-auto text-sm mb-4">
            Track employee attendance, manage schedules, and generate comprehensive reports with our modern QR-based attendance management system.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center mb-6">
            <Link
              href="/auth/login"
              className="px-8 py-2.5 bg-white text-[#0038A8] rounded-lg hover:bg-gray-50 transition-all font-semibold shadow-lg text-sm border-2 border-[#0038A8]/20"
            >
              Sign In
            </Link>
            <Link
              href="/scan"
              className="px-8 py-2.5 bg-[#CE1126] text-white rounded-lg hover:bg-[#b30f21] transition-all font-bold shadow-lg text-sm"
            >
              QR Scanner Station
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
            {/* QR Code Scanning Card */}
            <div className="bg-white/95 backdrop-blur p-4 rounded-xl shadow-lg border-t-4 border-[#0038A8]">
              <div className="w-12 h-12 bg-gradient-to-br from-[#0038A8] to-[#1a5f8a] rounded-xl flex items-center justify-center mb-3 mx-auto shadow">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                </svg>
              </div>
              <h3 className="font-bold text-[#0038A8] mb-1 text-sm">QR Code Scanning</h3>
              <p className="text-xs text-gray-600 leading-relaxed">Quick attendance tracking with personal QR codes - just scan and go!</p>
            </div>

            {/* AM/PM Tracking Card */}
            <div className="bg-white/95 backdrop-blur p-4 rounded-xl shadow-lg border-t-4 border-[#FCD116]">
              <div className="w-12 h-12 bg-gradient-to-br from-[#FCD116] to-[#d4a418] rounded-xl flex items-center justify-center mb-3 mx-auto shadow">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-[#0038A8] mb-1 text-sm">AM/PM Tracking</h3>
              <p className="text-xs text-gray-600 leading-relaxed">Track morning and afternoon attendance with separate time slots</p>
            </div>

            {/* Real-time Reports Card */}
            <div className="bg-white/95 backdrop-blur p-4 rounded-xl shadow-lg border-t-4 border-[#CE1126]">
              <div className="w-12 h-12 bg-gradient-to-br from-[#CE1126] to-[#8B1538] rounded-xl flex items-center justify-center mb-3 mx-auto shadow">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <h3 className="font-bold text-[#0038A8] mb-1 text-sm">Real-time Reports</h3>
              <p className="text-xs text-gray-600 leading-relaxed">Generate daily, weekly, and monthly attendance reports instantly</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="relative z-10 py-3 text-center text-gray-500 text-xs">
        © 2026 Philippine Ports Authority. All rights reserved.
      </div>
    </main>
  );
}
