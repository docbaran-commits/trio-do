import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import Script from "next/script";

import { PwaRegister } from "@/components/pwa-register";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
});

const themeBoot = `
try {
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var apply = function () {
    document.documentElement.classList.toggle("dark", mq.matches);
  };
  apply();
  mq.addEventListener("change", apply);
} catch (e) {}
`;

export const metadata: Metadata = {
  title: "3 Lists",
  description:
    "A personal to-do list with three lanes: Now in red, Late in yellow, and Later in green. Every task has a due date.",
  applicationName: "3 Lists",
  appleWebApp: {
    capable: true,
    title: "3 Lists",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#2a241f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBoot}
        </Script>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
