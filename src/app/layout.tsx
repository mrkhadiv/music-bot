import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "🎵 Music Editor Bot - ربات ویرایش موسیقی تلگرام",
  description: "ربات تلگرام برای ویرایش فایل‌های موسیقی - تغییر نام، خواننده، کاور و برش آهنگ",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
