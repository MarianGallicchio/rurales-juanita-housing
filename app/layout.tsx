import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Script from "next/script";
import "./globals.css";
import "@designcodeio/threeui/style.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Rurales Juanita · H.M Housing Module",
  description: "Cotizador, CRM, producción ISO 9001, stock, postventa y panel. 9 de Julio, Buenos Aires.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#07503f",
};

const inter = Inter({ variable: "--font-sans", display: "swap", subsets: ["latin"] });
const serif = Cormorant_Garamond({ variable: "--font-serif", display: "swap", subsets: ["latin"], weight: ["400", "500", "600"] });
const mono = JetBrains_Mono({ variable: "--font-mono", display: "swap", subsets: ["latin"], weight: ["400", "500"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body className={`${inter.variable} ${serif.variable} ${mono.variable} antialiased`}>
        <Script id="sw-register" strategy="afterInteractive">
          {`if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}`}
        </Script>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
