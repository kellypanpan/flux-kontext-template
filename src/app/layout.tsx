import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import { Analytics } from "@/components/Analytics";
import SessionProvider from "@/components/providers/SessionProvider";
import { GoogleOneTap } from "@/components/GoogleOneTap";
import { GoogleOneTapTrigger } from "@/components/GoogleOneTapTrigger";
import { StructuredData } from "@/components/StructuredData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CreativeForge - Professional Creative Content Platform | AI-Powered Content Creation",
    template: "%s | CreativeForge"
  },
  description: "Professional creative content platform for creators, marketers, and businesses. Create stunning visual content with AI-powered tools and intuitive workflows.",
  keywords: [
    "creative content platform",
    "ai content creation",
    "visual content generator",
    "content creation tools",
    "marketing content creator",
    "social media content",
    "ai creative platform",
    "content marketing tools",
    "professional content creation",
    "creative forge",
    "content creator tools",
    "marketing visuals"
  ],
  authors: [{ name: "CreativeForge Team" }],
  creator: "CreativeForge",
  publisher: "CreativeForge",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://creativeforge.studio'),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <ClientBody>
            {children}
          </ClientBody>
          <GoogleOneTap />
          <GoogleOneTapTrigger />
          <Analytics />
        </SessionProvider>
      </body>
    </html>
  );
}

