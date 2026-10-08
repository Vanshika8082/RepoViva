import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

export function FinalCTA() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container-page">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.05] to-white/[0.01] px-6 py-16 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 -z-10 h-64 w-[600px] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[100px]"
            />

            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
              Ready to defend your own code?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
              Bring a repository. Walk away knowing how well you can explain
              it.
            </p>

            <Link
              href="/start"
              className="group mt-9 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-violet-500 px-6 text-sm font-medium text-white shadow-[0_0_32px_-6px_rgba(139,92,246,0.7)] transition-[background-color,box-shadow] hover:bg-violet-400 hover:shadow-[0_0_40px_-4px_rgba(139,92,246,0.85)]"
            >
              Start an interview
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}