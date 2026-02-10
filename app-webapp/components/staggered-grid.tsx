"use client";

import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations/config";

interface StaggeredGridProps {
  className?: string;
  children: React.ReactNode;
  /** Number of grid columns (default: 3) */
  columns?: number;
}

const columnClasses: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export function StaggeredGrid({
  className,
  children,
  columns = 3,
}: StaggeredGridProps) {
  const colClass = columnClasses[columns] ?? "grid-cols-3";

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={`grid gap-4 ${colClass}${className ? ` ${className}` : ""}`}
    >
      {children}
    </motion.div>
  );
}

interface StaggeredItemProps {
  className?: string;
  children: React.ReactNode;
}

export function StaggeredItem({ className, children }: StaggeredItemProps) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}
