import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Metadata } from "next"
import {
  Inter,
  Playfair_Display,
  Cormorant_Garamond,
  Montserrat,
  Cinzel,
  Dancing_Script,
} from "next/font/google"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// Initialize fonts with CSS variables
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
})
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cormorant",
})
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
})
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel" })
const dancing = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing",
})

export const metadata: Metadata = {
  title: "Cinemate",
  description:
    "Cinematic design, zero friction. Built for creators. Apply scientific contrast formatting, true film grain, and cinematic typography in seconds. No login required.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body
        className={`${inter.variable} ${playfair.variable} ${cormorant.variable} ${montserrat.variable} ${cinzel.variable} ${dancing.variable} bg-black text-white antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
