import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interactive House",
  description: "Smart control for your modern living space.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
