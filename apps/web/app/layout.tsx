import type { Metadata } from "next";
import {
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Instrument_Serif,
} from "next/font/google";
import localFont from "next/font/local";
import { AuthProvider } from "@/context/auth-context";
import { TeamProvider } from "@/context/team-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  weight: ["400"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const bdoGrotesk = localFont({
  variable: "--font-sans",
  src: [
    {
      path: "../public/fonts/BDOGrotesk/BDOGrotesk-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/BDOGrotesk/BDOGrotesk-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/BDOGrotesk/BDOGrotesk-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/BDOGrotesk/BDOGrotesk-DemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/BDOGrotesk/BDOGrotesk-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/BDOGrotesk/BDOGrotesk-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/BDOGrotesk/BDOGrotesk-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "Reptrainer — AI Sales Roleplay Simulator",
  description:
    "A real-time AI flight simulator for enterprise sales teams. Practice high-pressure buyer conversations, sharpen objection handling, and get instant coaching feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bdoGrotesk.variable} ${inter.variable} ${playfair.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-background min-h-screen font-sans antialiased">
        <TooltipProvider>
          <AuthProvider>
            <TeamProvider>{children}</TeamProvider>
          </AuthProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
