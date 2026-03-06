import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Layout from "@/components/layout/Layout";
import DonationPopup from "@/components/DonationPopup";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "우리동네 어린이집/유치원 비교 서비스",
  description: "내 주변 어린이집과 유치원의 정보를 쉽게 비교해 보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
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
