import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";

export const GlobalOfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/95 text-amber-950 px-4 py-2 flex items-center justify-center gap-2 backdrop-blur-md shadow-lg border-b border-amber-600/20"
        >
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span className="font-bold text-sm">Trabajando sin conexión a Internet</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
