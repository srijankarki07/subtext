import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-50">
      <div className="max-w-4xl space-y-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
          Cinematic design,{" "}
          <span className="text-blue-500">zero friction.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-slate-400">
          Built for creators. Apply scientific contrast formatting, true film
          grain, and cinematic typography in seconds. No login required.
        </p>

        <Link href="/editor">
          <Button size="lg" className="h-14 rounded-full px-8 text-lg">
            Open Editor Now
          </Button>
        </Link>
      </div>

      <div className="mt-24 grid w-full max-w-5xl gap-8 md:grid-cols-3">
        <FeatureCard
          title="Scientific Contrast"
          desc="WCAG 2.1 contrast formulas built-in. Never publish unreadable text again."
        />
        <FeatureCard
          title="Cinematic Effects"
          desc="True SVG film grain and professional color grading presets."
        />
        <FeatureCard
          title="Typography Hero"
          desc="30+ pre-loaded curated Google Fonts with advanced pairing."
        />
      </div>
    </main>
  )
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left">
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-slate-400">{desc}</p>
    </div>
  )
}
