import type { Metadata } from "next";
import { Jost, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jost",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://glowstudiodesk.app"),
  title: "Glow Studio Desk — WhatsApp Applicant Intake",
  description: "WhatsApp-powered AI Sales CRM with single number, multi-agent inbox for your sales team.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icon.png",
    apple: { url: "/icon.png", sizes: "512x512" },
  },
  openGraph: {
    title: "Glow Studio Desk — WhatsApp Applicant Intake",
    description: "WhatsApp-powered AI Sales CRM with single number, multi-agent inbox for your sales team.",
    url: "https://glowstudiodesk.app",
    siteName: "Glow Studio Desk",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Glow Studio Desk Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Glow Studio Desk — WhatsApp Applicant Intake",
    description: "WhatsApp-powered AI Sales CRM with single number, multi-agent inbox for your sales team.",
    images: ["/icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jost.variable} ${cormorant.variable}`}>
      <body className={jost.className}>{children}</body>
    </html>
  );
}
