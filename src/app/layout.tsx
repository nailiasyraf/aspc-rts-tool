import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ASPC RTS Tool",
  description: "Browse and copy PC build specs from the Marketing XLSX.",
  openGraph: {
    title: "ASPC RTS TOOL",
    description: "Build Browser · Brochure Specs · Live Pricing",
    images: ["/og"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ASPC RTS TOOL",
    description: "Build Browser · Brochure Specs · Live Pricing",
    images: ["/aspc_thumb.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
