import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { StoreBootstrap } from "@/components/providers/store-bootstrap";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KetoTrack & Plan",
  description:
    "Diário cetogénico, macros, net carbs e planeamento alimentar para performance.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt"
      suppressHydrationWarning
      className={`${outfit.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <StoreBootstrap />
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
