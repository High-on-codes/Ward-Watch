import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live dashboard",
  description: "Priority-ranked map of open civic issues, refreshed every 15 seconds.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
