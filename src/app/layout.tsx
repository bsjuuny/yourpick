import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Layout from "@/components/layout/Layout";
import DonationPopup from "@/components/DonationPopup";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "유어픽 - 유치원·어린이집 비교",
  description: "유치원과 어린이집을 한눈에 비교하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans`} suppressHydrationWarning>
        <Providers>
          <Layout>
            {children}
          </Layout>
          <DonationPopup />
        </Providers>
      </body>
    </html>
  );
}
