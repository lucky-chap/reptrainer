import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Reptrainer",
  description:
    "Train your sales skills with AI-powered roleplay simulations. Practice objection handling, closing, and more.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="dashboard-theme min-h-screen">{children}</div>;
}
