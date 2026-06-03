import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import "@mysten/dapp-kit/dist/index.css";
import NavbarWrapper from "@/components/NavbarWrapper";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });

export const metadata: Metadata = {
  title: "Fuse",
  description: "Encrypted files. Automatic delivery. No trust required.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${bebas.variable}`}>
      <body className={`${inter.className} min-h-full flex flex-col`} style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
        <div className="noise-layer" />
        <Providers>
          <NavbarWrapper />
          <main className="relative z-10 flex-1 flex flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
