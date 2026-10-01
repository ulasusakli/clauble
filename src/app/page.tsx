import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16 sm:px-10">
      <section
        aria-labelledby="page-title"
        className="w-full rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-sm sm:p-12"
      >
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Cycle 00A
        </p>
        <h1 id="page-title" className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Clauble
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          The production foundation is in place. Product workflows arrive in later cycles.
        </p>
        <Link
          className="mt-8 inline-flex rounded-full border border-[var(--line)] px-4 py-2 text-sm font-medium hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
          href="/api/health"
        >
          View service status
        </Link>
      </section>
    </main>
  );
}

