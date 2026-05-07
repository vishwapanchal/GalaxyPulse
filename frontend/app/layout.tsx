import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/ui/Sidebar";

export const metadata: Metadata = {
  title: "GalaxyPulse — Galaxy AI Feedback Intelligence",
  description:
    "Contextual micro-feedback harvesting for Samsung Galaxy AI features. Real-time sentiment tracking, OTA impact analysis, and friction heatmaps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-surface-900">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
