import type { Metadata } from "next";
import "./globals.css";
import "./member.css";

export const metadata: Metadata = {
  title: "SummitBridge Health Plan — Medical Cost Dashboard",
  description:
    "Medical Cost & Utilization Dashboard — bending the cost curve on high-cost claimants, avoidable care & retention.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
