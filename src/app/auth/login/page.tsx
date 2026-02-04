"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Eye icons as inline SVG components
const EyeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeSlashIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12 px-4 bg-white">
      {/* Watercolor gradient background - same as scan page */}
      <div className="fixed inset-0 pointer-events-none">
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
      
      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/50">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 bg-white rounded-full p-2 shadow-xl border-4 border-white/50">
                <img
                  src="/images/ppa-logo-nobg.png"
                  alt="PPA Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-ppa-navy">Philippine Ports Authority</h1>
            <p className="text-gray-500 mt-1 text-sm">Attendance Monitoring System</p>
            <div className="h-1 w-20 bg-gradient-to-r from-accent-red via-accent-gold to-ppa-blue mx-auto mt-4 rounded-full"></div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ppa-blue focus:border-ppa-blue transition-colors bg-white text-gray-900"
                placeholder="you@ppa.gov.ph"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ppa-blue focus:border-ppa-blue transition-colors bg-white text-gray-900"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-ppa-navy to-ppa-blue text-white rounded-lg hover:from-ppa-blue hover:to-ppa-navy focus:ring-4 focus:ring-ppa-light/50 font-medium transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              <span className="font-medium text-ppa-navy">Demo credentials:</span><br />
              Admin: admin@ppa.gov.ph / admin123<br />
              Employee: vasquezjohnangelod.9@gmail.com / password123
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-ppa-navy/60 text-xs mt-6">
          © 2026 Philippine Ports Authority. All rights reserved.
        </p>
      </div>
    </div>
  );
}
