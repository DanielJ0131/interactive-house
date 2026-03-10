import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interactive House",
  description: "Smart control for your modern living space.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070B18] text-white">
        {children}
      </body>
    </html>
  );
}