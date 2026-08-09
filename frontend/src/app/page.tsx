export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="text-[11px] font-semibold uppercase tracking-widest2 text-ink/60">
        SUNLINE — Frontend Scaffold
      </span>
      <h1 className="text-5xl font-semibold italic text-lavender md:text-7xl">
        Made to Shine.
      </h1>
      <div className="sunline-rule" />
      <p className="max-w-md text-ink/70">
        Next.js + TypeScript + Tailwind + shadcn/ui is wired up and running.
        Replace this page with the real homepage once the API is connected.
      </p>
      <a
        href="/api/health"
        className="rounded bg-ink px-8 py-3 text-xs font-semibold uppercase tracking-widest text-ivory transition hover:bg-lavender hover:text-ink"
      >
        Check API Connection
      </a>
    </main>
  );
}
