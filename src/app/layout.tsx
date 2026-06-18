import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "21 Payne Build Budget",
  description: "House build budget tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b bg-white">
          <nav className="mx-auto max-w-5xl flex gap-6 px-4 py-3 text-sm font-medium">
            <Link href="/">Dashboard</Link>
            <Link href="/upload">Upload Quote/Receipt</Link>
            <Link href="/receipts">Receipts &amp; History</Link>
          </nav>
        </header>
        <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
