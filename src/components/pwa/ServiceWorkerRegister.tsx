"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, Download } from "lucide-react";

export function ServiceWorkerRegister() {
  const [isOnline, setIsOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Initial online status check
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 2. Register Service Worker in production/supporting browsers
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Vera PWA Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("Vera PWA Service Worker registration failed:", err);
        });
    }

    // 3. Listen for PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  return (
    <>
      {/* Offline Toast Banner (FR-01: Auto Offline detection & fallback) */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 bg-amber-600 text-white px-4 py-2.5 z-50 flex items-center justify-between text-xs sm:text-sm font-medium shadow-md transition-all animate-in slide-in-from-top">
          <div className="flex items-center gap-2 mx-auto">
            <WifiOff className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>Offline Mode Active: Internet connection lost. Your session draft data is securely cached locally.</span>
          </div>
        </div>
      )}

      {/* PWA Install Button Banner if eligible */}
      {installPrompt && !isInstalled && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all text-xs font-semibold border border-slate-700 hover:scale-105"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Install Vera PWA</span>
          </button>
        </div>
      )}
    </>
  );
}
