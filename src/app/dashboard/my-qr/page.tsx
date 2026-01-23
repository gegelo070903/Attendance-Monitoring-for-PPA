"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import QRCodeGenerator from "@/components/QRCodeGenerator";

export default function MyQRCodePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My QR Code</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Use this QR code to check in and check out
            </p>
          </div>

          {/* User Info */}
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {session.user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">
                  {session.user.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{session.user.email}</p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <QRCodeGenerator
              userEmail={session.user.email || ""}
              userName={session.user.name || "Employee"}
              size={280}
            />
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
              📖 How to use:
            </h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>Save or screenshot this QR code to your phone</li>
              <li>Go to the scanning station</li>
              <li>Show your QR code to the webcam</li>
              <li>Wait for confirmation</li>
            </ol>
          </div>

          {/* Back Button */}
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full mt-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
