import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://assistedpulse.app"),
  title: "Assisted Pulse — WhatsApp Applicant Intake",
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
    title: "Assisted Pulse — WhatsApp Applicant Intake",
    description: "WhatsApp-powered AI Sales CRM with single number, multi-agent inbox for your sales team.",
    url: "https://assistedpulse.app",
    siteName: "Assisted Pulse",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Assisted Pulse Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Assisted Pulse — WhatsApp Applicant Intake",
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
    <html lang="en">
      <body className={figtree.className}>{children}</body>
    </html>
  );
}
