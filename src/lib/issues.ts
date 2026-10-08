export type Category = "garbage" | "pothole" | "drain_blockage" | "waterlogging" | "other";
export type Status = "reported" | "assigned" | "resolved";
export type Band = "critical" | "high" | "medium" | "low";

export interface Verification {
  resolved: boolean;
  confidence: number;
  reason: string;
  source: "ai" | "mock" | "seed";
}

export interface Issue {
  id: string;
  category: Category;
  severity: number;
  description: string | null;
  lat: number;
  lng: number;
  ward: string | null;
  status: Status;
  report_count: number;
  before_photo: string | null;
  after_photo: string | null;
  verification: Verification | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface IssueWithPriority extends Issue {
  priority: number;
  band: Band;
}

export const CATEGORIES: Category[] = ["garbage", "pothole", "drain_blockage", "waterlogging", "other"];

export const CATEGORY_LABEL: Record<Category, string> = {
  garbage: "Garbage dump",
  pothole: "Pothole",
  drain_blockage: "Blocked drain",
  waterlogging: "Waterlogging",
  other: "Other",
};

export const BAND_COLOR: Record<Band, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a",
};

const DAY_MS = 86_400_000;

export function computePriority(
  severity: number,
  reportCount: number,
  createdAt: string | Date,
  status: Status,
  now: number = Date.now()
): number {
  if (status === "resolved") return 0;
  const ageDays = Math.max(0, (now - new Date(createdAt).getTime()) / DAY_MS);
  const ageFactor = 1 + Math.min(ageDays, 14) / 7;
  return Math.round(severity * reportCount * ageFactor * 10) / 10;
}

export function bandFor(priority: number): Band {
  if (priority >= 20) return "critical";
  if (priority >= 10) return "high";
  if (priority >= 5) return "medium";
  return "low";
}

export function withPriority(issue: Issue, now: number = Date.now()): IssueWithPriority {
  const priority = computePriority(issue.severity, issue.report_count, issue.created_at, issue.status, now);
  return { ...issue, priority, band: bandFor(priority) };
}
