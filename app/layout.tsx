import type { Metadata, Viewport } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CICLO — Ahorro comunitario",
  description: "Ahorro rotativo comunitario digital en MiniPay. Soporta cUSD y COPm.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${poppins.variable} ${inter.variable}`}>
      <body className="font-sans">
        <ToastProvider>
          <div className="frame">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
