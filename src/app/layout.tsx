import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { TestAccountBar } from "@/components/test-account-bar";

export const metadata: Metadata = {
  title: "Movement Hub",
  description:
    "We The Free Movement Hub: events, attendance and tasks for our communities",
  appleWebApp: {
    capable: true,
    title: "Movement Hub",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#071130",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-AU"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* Kai's banner (remove this block to take it down). */}
        <div className="bg-pink px-4 py-3 text-center text-lg font-bold text-navy sm:text-xl">
          Crystal has a flat nose
        </div>
        {children}
        <TestAccountBar />
      </body>
    </html>
  );
}
