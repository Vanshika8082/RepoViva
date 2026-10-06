import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-white/[0.06]">
      <div className="container-page flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="RepoViva home"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500 text-sm font-semibold text-white">
            R
          </div>

          <span className="text-[15px] font-semibold tracking-[-0.01em]">
            RepoViva
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <a
            href="#how-it-works"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            How it works
          </a>

          <a
            href="#why-repoviva"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Why RepoViva
          </a>
        </nav>

        <Link
          href="/start"
          className="inline-flex h-9 items-center justify-center rounded-md bg-violet-500 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-400"
        >
          Start interview
        </Link>
      </div>
    </header>
  );
}