"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto ",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 bg-white border border-transparent justify-between flex flex-col space-y-4 shadow-sm border-brass-200/40 relative overflow-hidden",
        className,
      )}
    >
      {/* Background gradient hint */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-brass-50/20 opacity-0 group-hover/bento:opacity-100 transition duration-500 pointer-events-none" />

      <div className="group-hover/bento:translate-x-2 transition duration-200 relative z-10">
        {header}
        <div className="font-sans font-medium text-brass-600 mb-2 mt-2">
          {icon}
        </div>
        <div className="font-serif text-lg font-bold text-charcoal mb-2 mt-2">
          {title}
        </div>
        <div className="font-sans font-normal text-neutral-500 text-xs leading-relaxed">
          {description}
        </div>
      </div>
    </motion.div>
  );
};
