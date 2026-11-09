import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-500.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-600.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-700.css";
import "@fontsource/ibm-plex-sans-arabic/latin-400.css";
import "@fontsource/ibm-plex-sans-arabic/latin-600.css";
import "@fontsource/montserrat/latin-600.css";
import "@fontsource/montserrat/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "شاهين — استوديو المحتوى العربي بالذكاء الاصطناعي", template: "%s | شاهين" },
  description: "صور منتجات، فيديوهات، إعلانات وتعليق صوتي بلهجة جمهورك — من فكرة مكتوبة بالعربي إلى عمل جاهز للنشر.",
  openGraph: { title: "شاهين", description: "استوديو المحتوى العربي بالذكاء الاصطناعي", locale: "ar_KW", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
