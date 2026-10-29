import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { TestAccountBar } from "@/components/test-account-bar";
import { AuthFromLink } from "@/components/auth-from-link";

export const metadata: Metadata = {
  title: "Movement Hub",
  description:
    "We The Free Movement Hub: events, attendance and actions for our communities",
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
        <AuthFromLink />
        {children}
        <TestAccountBar />
      </body>
    </html>
  );
}
