import type { Metadata } from "next";
import "@fontsource/cairo/arabic-400.css";
import "@fontsource/cairo/arabic-500.css";
import "@fontsource/cairo/arabic-600.css";
import "@fontsource/cairo/arabic-700.css";
import "@fontsource/cairo/arabic-800.css";
import "@fontsource/cairo/latin-400.css";
import "@fontsource/cairo/latin-600.css";
import "@fontsource/cairo/latin-700.css";
import "./globals.css";
import { THEME_SCRIPT } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "شاهين — استوديو المحتوى العربي بالذكاء الاصطناعي", template: "%s | شاهين" },
  description: "صور منتجات، فيديوهات، إعلانات وتعليق صوتي بلهجة جمهورك — من فكرة مكتوبة بالعربي إلى عمل جاهز للنشر.",
  openGraph: { title: "شاهين", description: "استوديو المحتوى العربي بالذكاء الاصطناعي", locale: "ar_KW", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
