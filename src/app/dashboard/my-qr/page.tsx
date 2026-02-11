"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import IDCardPrinter from "@/components/IDCardPrinter";

export default function MyQRCodePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"qr" | "id">("qr");

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">My QR Code & ID Card</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Generate your QR code or print your ID card
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1 mb-4">
            <button
              onClick={() => setActiveTab("qr")}
              className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === "qr"
                  ? "bg-white dark:bg-gray-600 text-ppa-navy dark:text-white shadow"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              QR Code
            </button>
            <button
              onClick={() => setActiveTab("id")}
              className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === "id"
                  ? "bg-white dark:bg-gray-600 text-ppa-navy dark:text-white shadow"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              ID Card
            </button>
          </div>

          {/* User Info */}
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-blue-600">
                {(session?.user as any)?.profileImage ? (
                  <img 
                    src={(session?.user as any).profileImage} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-lg font-bold">
                    {session?.user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-800 dark:text-white">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{session?.user?.email}</p>
                {((session?.user as any)?.position || (session?.user as any)?.department) && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
                    {(session?.user as any)?.position}
                    {(session?.user as any)?.position && (session?.user as any)?.department && " • "}
                    {(session?.user as any)?.department}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* QR Code Tab */}
          {activeTab === "qr" && (
            <>
              <div className="flex justify-center mb-4">
                <QRCodeGenerator
                  userEmail={session?.user?.email || ""}
                  userName={session?.user?.name || "Employee"}
                  size={240}
                />
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <h3 className="font-semibold text-sm text-gray-800 dark:text-white mb-1.5">
                  How to use:
                </h3>
                <ol className="list-decimal list-inside text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                  <li>Save or screenshot this QR code to your phone</li>
                  <li>Go to the scanning station</li>
                  <li>Show your QR code to the webcam</li>
                  <li>Wait for confirmation</li>
                </ol>
              </div>
            </>
          )}

          {/* ID Card Tab */}
          {activeTab === "id" && (
            <IDCardPrinter
              userEmail={session?.user?.email || ""}
              userName={session?.user?.name || "Employee"}
              userDepartment={(session?.user as any)?.department}
              userPosition={(session?.user as any)?.position}
              userProfileImage={(session?.user as any)?.profileImage}
            />
          )}

          {/* Back Button */}
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full mt-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
