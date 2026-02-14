import type { Metadata } from "next";
import { Suspense } from "react";
import { WarRoomDashboard } from "@/components/dashboard/war-room";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "War room | Praedixa",
  description:
    "Centre de pilotage operationnel: risques, couverture, priorites et arbitrages",
};

export default function DashboardPage() {
  return (
    <PageTransition>
      <Suspense fallback={<div>Chargement du centre decisionnel...</div>}>
        <WarRoomDashboard />
      </Suspense>
    </PageTransition>
  );
}
