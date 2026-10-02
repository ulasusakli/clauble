import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16 sm:px-10">
      <section
        aria-labelledby="page-title"
        className="w-full rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-sm sm:p-12"
      >
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Public Discovery
        </p>
        <h1 id="page-title" className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Clauble
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          Explore Clauble publicly. Sign in to continue with your account.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="inline-flex rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white"
            href="/signup"
          >
            Create account
          </Link>
          <Link
            className="inline-flex rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-medium hover:border-[var(--accent)]"
            href="/login"
          >
            Log in
          </Link>
        </div>
      </section>
    </main>
  );
}
