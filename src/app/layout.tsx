import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import CustomCursor from "@/components/CustomCursor";
import CommandPalette from "@/components/CommandPalette";
import EffectsLayer from "@/components/EffectsLayer";
import GameModal from "@/components/GameModal";
import Toaster from "@/components/Toaster";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Shrivatsa Trivedi | Software Engineer",
  description:
    "Portfolio of Shrivatsa Trivedi — Full-Stack Developer and AI Builder based in India.",
  openGraph: {
    title: "Shrivatsa Trivedi | Software Engineer",
    description:
      "Portfolio of Shrivatsa Trivedi — Full-Stack Developer and AI Builder based in India.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shrivatsa Trivedi | Software Engineer",
    description:
      "Portfolio of Shrivatsa Trivedi — Full-Stack Developer and AI Builder based in India.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="noise min-h-full flex flex-col">
        <CustomCursor />
        <EffectsLayer />
        {children}
        <CommandPalette />
        <GameModal />
        <Toaster />
      </body>
    </html>
  );
}
