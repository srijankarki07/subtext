import {
  Abril_Fatface,
  Allura,
  Anton,
  Archivo,
  Archivo_Black,
  Azeret_Mono,
  Ballet,
  Barlow,
  Baskervville,
  Bebas_Neue,
  Big_Shoulders,
  Black_Ops_One,
  Bodoni_Moda,
  Bungee,
  // Display
  Cinzel,
  Cormorant_Garamond,
  // Script
  Dancing_Script,
  DM_Sans,
  DM_Serif_Display,
  EB_Garamond,
  Geist,
  Geist_Mono,
  Great_Vibes,
  // Sans
  Inter,
  Josefin_Sans,
  League_Spartan,
  Lexend,
  Libre_Baskerville,
  Libre_Bodoni,
  Libre_Caslon_Display,
  Limelight,
  Lobster,
  Lora,
  Major_Mono_Display,
  Manrope,
  Marcellus,
  Merriweather,
  Montserrat,
  Nunito_Sans,
  Oswald,
  Outfit,
  Parisienne,
  // Serif
  Playfair_Display,
  Plus_Jakarta_Sans,
  Prata,
  Raleway,
  Roboto_Condensed,
  Sora,
  Space_Grotesk,
  // Monospace
  Space_Mono,
  Syne,
  Teko,
  Unbounded,
  Work_Sans,
  Yeseva_One,
} from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Metadata } from "next"
import "./globals.css"

// ============================================================
// CORE UI FONTS
// ============================================================

const geist = Geist({
  subsets: ["latin"],
  // Deliberately not "--font-sans": that name is Tailwind's own theme token,
  // and the two definitions collided (globals.css had a circular
  // `--font-sans: var(--font-sans)` as a result).
  variable: "--font-geist-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

// ============================================================
// SERIF
// ============================================================

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
})

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
})

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
})

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre-baskerville",
})

const libreBodoni = Libre_Bodoni({
  subsets: ["latin"],
  variable: "--font-libre-bodoni",
})

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
})

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
})

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-merriweather",
})

const baskervville = Baskervville({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-baskervville",
})

const prata = Prata({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-prata",
})

const libreCaslon = Libre_Caslon_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-libre-caslon",
})

const yeseva = Yeseva_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-yeseva",
})

// ============================================================
// SANS-SERIF
// ============================================================

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
})

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
})

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
})

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
})

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
})

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
})

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
})

const josefin = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-josefin",
})

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
})

const barlow = Barlow({
  subsets: ["latin"],
  variable: "--font-barlow",
  weight: ["400", "500", "600", "700"],
})

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  variable: "--font-roboto-condensed",
})

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
})

// ============================================================
// DISPLAY / CINEMATIC
// ============================================================

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
})

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
})

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
})

const abril = Abril_Fatface({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-abril",
})

const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-anton",
})

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-archivo-black",
})

const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-big-shoulders",
})

const teko = Teko({
  subsets: ["latin"],
  variable: "--font-teko",
})

const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  variable: "--font-league-spartan",
})

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
})

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
})

const majorMono = Major_Mono_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-major-mono",
})

const blackOps = Black_Ops_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-black-ops",
})

const limelight = Limelight({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-limelight",
})

const marcellus = Marcellus({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-marcellus",
})

const bungee = Bungee({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bungee",
})

// ============================================================
// SCRIPT
// ============================================================

const dancing = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing",
})

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-great-vibes",
})

const allura = Allura({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-allura",
})

const ballet = Ballet({
  subsets: ["latin"],
  variable: "--font-ballet",
})

const parisienne = Parisienne({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-parisienne",
})

const lobster = Lobster({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-lobster",
})

// ============================================================
// MONOSPACE
// ============================================================

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
})

const azeretMono = Azeret_Mono({
  subsets: ["latin"],
  variable: "--font-azeret-mono",
})

// ============================================================
// METADATA
// ============================================================

export const metadata: Metadata = {
  title: "Subtext",
  description:
    "Cinematic design, zero friction. Built for creators. Apply scientific contrast formatting, true film grain, and cinematic typography in seconds. No login required.",
}

// ============================================================
// ROOT LAYOUT
// ============================================================

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
        className={cn(
          // Existing fonts
          inter.variable,
          playfair.variable,
          cormorant.variable,
          montserrat.variable,
          cinzel.variable,
          dancing.variable,

          // Serif
          bodoni.variable,
          dmSerif.variable,
          libreBaskerville.variable,
          libreBodoni.variable,
          ebGaramond.variable,
          lora.variable,
          merriweather.variable,
          baskervville.variable,
          prata.variable,
          libreCaslon.variable,
          yeseva.variable,

          // Sans
          manrope.variable,
          spaceGrotesk.variable,
          plusJakarta.variable,
          sora.variable,
          outfit.variable,
          dmSans.variable,
          raleway.variable,
          workSans.variable,
          nunitoSans.variable,
          josefin.variable,
          archivo.variable,
          barlow.variable,
          robotoCondensed.variable,
          lexend.variable,

          // Display
          bebas.variable,
          oswald.variable,
          abril.variable,
          anton.variable,
          archivoBlack.variable,
          bigShoulders.variable,
          teko.variable,
          leagueSpartan.variable,
          unbounded.variable,
          syne.variable,
          majorMono.variable,
          blackOps.variable,
          limelight.variable,
          marcellus.variable,
          bungee.variable,

          // Script
          greatVibes.variable,
          allura.variable,
          ballet.variable,
          parisienne.variable,
          lobster.variable,

          // Monospace
          spaceMono.variable,
          azeretMono.variable,

          // Surface colours come from the theme tokens in globals.css so the
          // warm-paper palette has a single source of truth.
          "antialiased"
        )}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
