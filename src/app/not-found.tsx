import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="float-drift text-7xl" aria-hidden>
        🧑‍🚀
      </div>
      <h1 className="font-heading text-7xl font-bold tracking-[-0.02em]">
        4<span className="text-accent-light">0</span>4
      </h1>
      <p className="max-w-md text-muted">
        You&apos;ve drifted off the star map. This sector of space is empty —
        but mission control can bring you home.
      </p>
      <Link
        href="/"
        className="glow-hover mt-2 rounded-full bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
      >
        Return to base
      </Link>
    </main>
  );
}
