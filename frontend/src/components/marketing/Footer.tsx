import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-10">
      <div className="container-page flex flex-col items-center justify-between gap-4 text-sm text-zinc-500 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500 font-mono text-[10px] font-bold text-white">
            R
          </span>
          <span className="font-medium text-zinc-300">RepoViva</span>
        </div>

        <p className="text-center">
          AI-powered technical interviews based on your own GitHub projects.
        </p>

        <div className="flex items-center gap-5">
          <a href="#how-it-works" className="transition-colors hover:text-zinc-300">
            How it works
          </a>
          <Link href="/start" className="transition-colors hover:text-zinc-300">
            Start
          </Link>
        </div>
      </div>
    </footer>
  );
}