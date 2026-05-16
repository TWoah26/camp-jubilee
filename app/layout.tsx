import type { Metadata } from "next";
import { Nunito, Roboto } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Camp Jubilee",
  description: "Camp Jubilee Parent Portal — Rest. Restore. Rejoice.",
  manifest: "/manifest.json",
  themeColor: "#3a4755",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Camp Jubilee",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${nunito.variable} ${roboto.variable}`}>
      <body className="min-h-screen bg-jubilee-cream font-sans">{children}</body>
    </html>
  );
}
