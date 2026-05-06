import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { vibrateMedium } from "@/utils/haptics";

interface FABProps {
  icon: React.ReactNode;
  label?: string;
  onClick: () => void;
  className?: string;
  bottomOffset?: string;
}

export const FloatingActionButton = ({ icon, label, onClick, className, bottomOffset = "bottom-24" }: FABProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleClick = (e: React.MouseEvent) => {
    vibrateMedium();
    onClick();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(`fixed right-6 z-40 md:hidden`, bottomOffset, className)}
        >
          <Button
            onClick={handleClick}
            className="h-14 w-14 rounded-2xl bg-secondary text-primary-foreground shadow-[0_8px_30px_rgba(234,179,8,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center p-0"
            aria-label={label}
            title={label}
          >
            {icon}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
