import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interactive House",
  description: "Smart control for your modern living space.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* We remove the fixed width here so it can expand on Desktop */}
        <div className="min-h-screen flex flex-col relative overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}