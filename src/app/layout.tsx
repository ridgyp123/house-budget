import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "21 Payne Build Budget",
  description: "House build budget tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header>
          <Nav />
        </header>
        <main className="flex-1 mx-auto w-full px-8 py-8" style={{ maxWidth: 1100 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
