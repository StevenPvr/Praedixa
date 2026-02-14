"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { EASING } from "@/lib/animations/config";

/**
 * Premium route progress bar — thin gradient line at top of viewport
 * that animates on navigation with glow effect.
 */
export function RouteProgressBar() {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return (
    <AnimatePresence>
      {isAnimating && (
        <motion.div
          className="fixed inset-x-0 top-0 z-[100] h-[2px]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="h-full rounded-r-full"
            initial={{ width: "0%", opacity: 1 }}
            animate={{ width: "100%", opacity: 1 }}
            transition={{ duration: 0.55, ease: EASING.premium }}
            style={{
              background:
                "linear-gradient(90deg, var(--brand) 0%, var(--brand-300) 60%, var(--accent) 100%)",
              boxShadow:
                "0 0 12px var(--brand-glow), 0 0 4px var(--brand-glow)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
