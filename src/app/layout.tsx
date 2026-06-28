import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RecallNet — Product Recall Intelligence",
  description:
    "Turn Amazon and Walmart order history into proactive recall protection. Built for H0 Hackathon.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
        <Footer />
      </body>
    </html>
  );
}
