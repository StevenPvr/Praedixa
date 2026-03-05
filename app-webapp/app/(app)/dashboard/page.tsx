import type { Metadata } from "next";
import { WarRoomDashboard } from "@/components/dashboard/war-room";

export const metadata: Metadata = {
  title: "Tableau de bord | Praedixa",
  description:
    "Centre de pilotage operationnel: risques, couverture et priorites du jour.",
};

export default function DashboardPage() {
  return <WarRoomDashboard />;
}
