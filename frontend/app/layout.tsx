import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GalaxyPulse — Galaxy AI Feedback Intelligence",
  description:
    "Contextual micro-feedback harvesting for Samsung Galaxy AI features. Real-time sentiment tracking, OTA impact analysis, and friction heatmaps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
