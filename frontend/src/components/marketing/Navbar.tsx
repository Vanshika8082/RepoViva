import Link from "next/link";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#feedback", label: "Feedback" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/70 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500 font-mono text-[11px] font-bold">
            R
          </span>
          RepoViva
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <Link
          href="/start"
          className="inline-flex h-9 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
        >
          Start an interview
        </Link>
      </div>
    </header>
  );
}