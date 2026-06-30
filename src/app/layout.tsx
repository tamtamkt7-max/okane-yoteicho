import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "おかねの予定帳",
  description: "サブスク・定期便・引き落としをカレンダーで整理。どの口座にいくら必要かがすぐわかる、暮らしの予定帳。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "おかねの予定帳",
  },
  icons: {
    apple: "/icons/icon.svg",
  }
};

export const viewport: Viewport = {
  themeColor: "#5c8d89",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
