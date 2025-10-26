import Image from "next/image";
import { useEffect, useState } from "react";

export default function Toast({ show, message, onClose, type = "success" }) {
  const [visible, setVisible] = useState(false);
  const [animateBar, setAnimateBar] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setAnimateBar(false); // Reset animation
      setTimeout(() => setAnimateBar(true), 10); // Trigger animation after mount
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Wait for fade-out before unmount
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      setAnimateBar(false);
    }
  }, [show, onClose]);

  if (!show && !visible) return null;

  return (
    <div
      className={`fixed left-6 bottom-6 z-50 flex items-center gap-3 px-4 py-2 rounded-xl shadow-lg border bg-white transition-all duration-300
        max-w-xs w-full
        ${type === "success" ? "border-green-400" : "border-red-400"}
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
        overflow-hidden relative
      `}
    >
      <Image src="/logo.png" alt="Logo" width={32} height={32} className="rounded-full" />
      <span className={`font-semibold text-sm ${type === "success" ? "text-green-600" : "text-red-600"}`}>{message}</span>
      {/* Progress Bar */}
      <div className="absolute left-0 bottom-0 w-full h-1">
        <div
          className={`h-full ${type === "success" ? "bg-green-400" : "bg-red-400"} ${animateBar ? "toast-progress-bar" : ""}`}
          style={{ width: animateBar ? undefined : "100%" }}
        />
      </div>
      <style jsx global>{`
        @keyframes toast-bar {
          from { width: 100%; }
          to { width: 0%; }
        }
        .toast-progress-bar {
          animation: toast-bar 3s linear forwards;
        }
      `}</style>
    </div>
  );
} 