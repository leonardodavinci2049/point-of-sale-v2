import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "PDV System - Ponto de Venda Moderno",
    template: "%s | PDV System",
  },
  description:
    "Sistema completo de Ponto de Venda com gestão de clientes, produtos e vendas. Interface moderna e responsiva.",
  keywords: [
    "PDV",
    "Ponto de Venda",
    "Gestão",
    "Vendas",
    "E-commerce",
    "Sistema",
  ],
  authors: [{ name: "PDV System Team" }],
  creator: "PDV System",
  publisher: "PDV System",
  applicationName: "PDV System",
  generator: "Next.js",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  ),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: false, // PDV não deve ser indexado por segurança
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "PDV System",
    title: "PDV System - Ponto de Venda Moderno",
    description:
      "Sistema completo de Ponto de Venda com gestão de clientes, produtos e vendas",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PDV System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDV System - Ponto de Venda Moderno",
    description:
      "Sistema completo de Ponto de Venda com gestão de clientes, produtos e vendas",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Impedir zoom em PDV
  userScalable: false, // Desabilitar zoom para PDV
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
            >
              Pular para conteúdo principal
            </a>
            <main id="main-content">{children}</main>
            <Toaster position="top-right" />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
