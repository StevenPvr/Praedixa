import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../page";

vi.mock("@/components/dashboard/war-room", () => ({
  WarRoomDashboard: () => <div data-testid="war-room-dashboard" />,
}));

describe("DashboardPage", () => {
  it("renders war-room dashboard content", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("war-room-dashboard")).toBeInTheDocument();
  });
});
