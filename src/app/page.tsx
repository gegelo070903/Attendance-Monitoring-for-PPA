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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-8 p-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900">
            Attendance Monitoring
          </h1>
          <h2 className="text-2xl text-primary-600 font-semibold">
            PPA System
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Track employee attendance, manage schedules, and generate comprehensive reports with our modern attendance management system.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="px-8 py-3 bg-white text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-medium"
          >
            Register
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Easy Check-in</h3>
            <p className="text-sm text-gray-600">Quick and simple attendance tracking with one-click check-in and check-out</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Real-time Reports</h3>
            <p className="text-sm text-gray-600">Generate daily, weekly, and monthly attendance reports instantly</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Employee Management</h3>
            <p className="text-sm text-gray-600">Manage employee profiles, departments, and attendance records</p>
          </div>
        </div>
      </div>
    </main>
  );
}
