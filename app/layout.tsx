import type { Metadata, Viewport } from "next";

// Latin glyphs (Inter) + Bengali glyphs (Noto Sans Bengali), self-hosted.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/noto-sans-bengali/bengali-400.css";
import "@fontsource/noto-sans-bengali/bengali-500.css";
import "@fontsource/noto-sans-bengali/bengali-600.css";
import "@fontsource/noto-sans-bengali/bengali-700.css";
import "./globals.css";

import { LocaleProvider } from "@/components/locale-provider";
import { ThemeProvider, themeInitScript } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: "ব্যাচেলর মেস · Meal & Expense Manager",
  description:
    "বাংলা-প্রথম ব্যাচেলর মেস মিল ও বাজার খরচের হিসাব — মিল কাউন্ট, খরচ এন্ট্রি আর মাসিক মিল রেট রিপোর্ট।",
  applicationName: "Bachelor Mess",
  keywords: ["bachelor mess", "meal manager", "meal rate", "ব্যাচেলর মেস", "মিল হিসাব"],
  appleWebApp: { capable: true, title: "Bachelor Mess", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#131110" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ThemeProvider>
          <LocaleProvider>
            <ToastProvider>{children}</ToastProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
