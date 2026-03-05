"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export function RouteProgressBar() {
  const pathname = usePathname();
  const previousPathnameRef = React.useRef(pathname);
  const [visible, setVisible] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (pathname === previousPathnameRef.current) return;
    previousPathnameRef.current = pathname;

    setVisible(true);
    setProgress(0);

    const startId = window.setTimeout(() => setProgress(78), 10);
    const almostDoneId = window.setTimeout(() => setProgress(96), 180);
    const doneId = window.setTimeout(() => setProgress(100), 380);
    const hideId = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 560);

    return () => {
      window.clearTimeout(startId);
      window.clearTimeout(almostDoneId);
      window.clearTimeout(doneId);
      window.clearTimeout(hideId);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]">
      <div
        className="h-full rounded-r-full"
        style={{
          width: `${progress}%`,
          transition: "width 220ms cubic-bezier(0.2, 0, 0, 1)",
          background:
            "linear-gradient(90deg, var(--brand) 0%, var(--brand-300) 60%, var(--accent) 100%)",
          boxShadow: "0 0 12px var(--glow-brand), 0 0 4px var(--glow-brand)",
        }}
      />
    </div>
  );
}
