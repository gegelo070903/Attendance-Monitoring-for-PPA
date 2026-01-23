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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-ppa-navy via-ppa-blue to-ppa-light relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-accent-gold/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-red/10 rounded-full blur-3xl"></div>
      </div>

      <div className="text-center space-y-8 p-8 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-28 h-28 bg-white rounded-2xl p-3 shadow-2xl">
            <img
              src="/images/ppa-logo.png"
              alt="PPA Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Philippine Ports Authority
          </h1>
          <h2 className="text-xl md:text-2xl text-accent-gold font-semibold">
            Attendance Monitoring System
          </h2>
          <div className="h-1 w-32 bg-gradient-to-r from-accent-red via-accent-gold to-white mx-auto rounded-full"></div>
          <p className="text-blue-100 max-w-md mx-auto mt-4">
            Track employee attendance, manage schedules, and generate comprehensive reports with our modern QR-based attendance management system.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-white text-ppa-navy rounded-lg hover:bg-gray-100 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
          >
            Sign In
          </Link>
          <Link
            href="/scan"
            className="px-8 py-3 bg-accent-gold text-white rounded-lg hover:bg-accent-gold/90 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
          >
            QR Scanner Station
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl">
          <div className="bg-white/95 backdrop-blur p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-t-4 border-ppa-navy">
            <div className="w-12 h-12 bg-gradient-to-br from-ppa-navy to-ppa-blue rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="font-semibold text-ppa-navy mb-2">QR Code Scanning</h3>
            <p className="text-sm text-gray-600">Quick attendance tracking with personal QR codes - just scan and go!</p>
          </div>

          <div className="bg-white/95 backdrop-blur p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-t-4 border-accent-gold">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-gold to-accent-red rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-ppa-navy mb-2">AM/PM Tracking</h3>
            <p className="text-sm text-gray-600">Track morning and afternoon attendance with separate time slots</p>
          </div>

          <div className="bg-white/95 backdrop-blur p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-t-4 border-accent-red">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-red to-ppa-navy rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-ppa-navy mb-2">Real-time Reports</h3>
            <p className="text-sm text-gray-600">Generate daily, weekly, and monthly attendance reports instantly</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-center text-blue-200 text-xs">
        © 2026 Philippine Ports Authority. All rights reserved.
      </div>
    </main>
  );
}
