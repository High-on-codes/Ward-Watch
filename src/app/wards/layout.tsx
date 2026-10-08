import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ward leaderboard",
  description: "Wards ranked by the share of reported issues they have resolved, then by how quickly they fix them.",
};

export default function WardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
