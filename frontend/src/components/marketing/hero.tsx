"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { InterviewPreview } from "@/components/marketing/InterviewPreview";

const EASE = [0.22, 1, 0.36, 1] as const;

const copyContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const copyItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

/* Heading moves in but is never fully transparent, so it's visible before JS loads */
const headingItem: Variants = {
  hidden: { y: 24 },
  visible: { y: 0, transition: { duration: 0.8, ease: EASE } },
};

const previewVariant: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.25, ease: EASE },
  },
};

export function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const initial = shouldReduceMotion ? false : "hidden";

  const hover = (y: number) => (shouldReduceMotion ? undefined : { y });
  const tap = shouldReduceMotion ? undefined : { scale: 0.98 };

  return (
    <section className="relative isolate overflow-hidden">
      {/* Background: soft glow + faint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      </div>

      <div className="container-page">
        <div className="grid min-h-[calc(100vh-4rem)] items-center gap-16 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          {/* HERO COPY */}
          <motion.div
            variants={copyContainer}
            initial={initial}
            animate="visible"
            className="max-w-2xl"
          >
            {/* Eyebrow */}
            <motion.div
              variants={copyItem}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/[0.06] px-3 py-1.5"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
              </span>
              <span className="text-xs font-medium tracking-wide text-violet-200/80">
                TECHNICAL INTERVIEWS, BUILT FROM YOUR CODE
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={headingItem}
              className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-[76px]"
            >
              Your code.
              <br />
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
                Your interview.
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={copyItem}
              className="mt-7 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8"
            >
              RepoViva turns your GitHub project into a realistic
              technical interview built around the code you actually
              wrote.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={copyItem}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <motion.div whileHover={hover(-2)} whileTap={tap}>
                <Link
                  href="/start"
                  className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-violet-500 px-5 text-sm font-medium text-white shadow-[0_0_32px_-6px_rgba(139,92,246,0.7)] transition-[background-color,box-shadow] hover:bg-violet-400 hover:shadow-[0_0_40px_-4px_rgba(139,92,246,0.85)]"
                >
                  Start an interview
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </motion.div>

              <motion.div whileHover={hover(-1)} whileTap={tap}>
                <a
                  href="#how-it-works"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.02] px-5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  See how it works
                </a>
              </motion.div>
            </motion.div>

            {/* Supporting points */}
            <motion.div
              variants={copyItem}
              className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-violet-400/70" />
                Project-specific questions
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-violet-400/70" />
                Natural follow-ups
              </span>
            </motion.div>
          </motion.div>

          {/* PRODUCT PREVIEW */}
          <motion.div
            variants={previewVariant}
            initial={initial}
            animate="visible"
            className="relative"
          >
            <InterviewPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}