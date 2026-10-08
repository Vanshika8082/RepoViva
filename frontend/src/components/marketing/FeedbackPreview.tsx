"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, ArrowUpRight, BookOpen } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./SectionHeading";

const EASE = [0.22, 1, 0.36, 1] as const;

const scores = [
  { label: "Technical understanding", value: 8 },
  { label: "Code understanding", value: 9 },
  { label: "Problem solving", value: 7 },
  { label: "Engineering reasoning", value: 8 },
  { label: "Depth", value: 8 },
];

const strengths = [
  "Clear reasoning for separating persistence from business logic",
  "Confident walkthrough of your own code",
];

const improvements = [
  "Discuss failure modes before being asked",
  "Back design choices with trade-offs",
];

const topics = ["Token revocation", "Cursor pagination", "Retry strategies"];

export function FeedbackPreview() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="feedback" className="scroll-mt-16 py-24 sm:py-32">
      <div className="container-page">
        <SectionHeading
          eyebrow="FINAL FEEDBACK"
          title="Know exactly what to work on next"
          description="After the interview you get a clear breakdown, written to help you prepare, not just a number."
        />

        <Reveal className="relative mx-auto mt-16 max-w-4xl">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-violet-600/10 blur-3xl"
          />

          <div className="overflow-hidden rounded-xl border border-white/[0.1] bg-[#0f0f12] shadow-2xl shadow-black/40">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-violet-400">
                  INTERVIEW COMPLETE
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  acme / task-manager · Medium · 5 questions
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                Completed
              </span>
            </div>

            <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[0.8fr_1.2fr]">
              {/* Overall score */}
              <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.07] bg-black/20 p-8 text-center">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-zinc-600">
                  OVERALL SCORE
                </p>
                <p className="mt-4 bg-gradient-to-b from-white to-violet-300 bg-clip-text text-7xl font-semibold tracking-[-0.05em] text-transparent">
                  8.2
                </p>
                <p className="mt-1 text-sm text-zinc-500">out of 10</p>
              </div>

              {/* Score bars */}
              <div className="space-y-4">
                {scores.map((score, index) => (
                  <div key={score.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{score.label}</span>
                      <span className="font-mono text-zinc-300">
                        {score.value} / 10
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <motion.div
                        initial={
                          shouldReduceMotion
                            ? false
                            : { width: 0 }
                        }
                        whileInView={{ width: `${score.value * 10}%` }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 1,
                          delay: 0.2 + index * 0.08,
                          ease: EASE,
                        }}
                        style={
                          shouldReduceMotion
                            ? { width: `${score.value * 10}%` }
                            : undefined
                        }
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Written feedback */}
            <div className="grid gap-px border-t border-white/[0.07] bg-white/[0.07] md:grid-cols-3">
              <div className="bg-[#0f0f12] p-6">
                <p className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <Check size={14} /> Strengths
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
                  {strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#0f0f12] p-6">
                <p className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <ArrowUpRight size={14} /> Areas to improve
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
                  {improvements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#0f0f12] p-6">
                <p className="flex items-center gap-2 text-xs font-semibold text-violet-300">
                  <BookOpen size={14} /> Topics to review
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}