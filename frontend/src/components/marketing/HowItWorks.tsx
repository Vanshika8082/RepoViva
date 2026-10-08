import { GitBranch, ScanSearch, MessagesSquare, ClipboardCheck } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./SectionHeading";

const steps = [
  {
    icon: GitBranch,
    title: "Paste your repository",
    description:
      "Drop in a GitHub link. RepoViva pulls the relevant source files and ignores the noise.",
  },
  {
    icon: ScanSearch,
    title: "We read your project",
    description:
      "The code is analysed so the interviewer understands what you built and how it fits together.",
  },
  {
    icon: MessagesSquare,
    title: "Sit the interview",
    description:
      "Pick a difficulty and length. You get one question at a time, with natural follow-ups on your answers.",
  },
  {
    icon: ClipboardCheck,
    title: "Get detailed feedback",
    description:
      "When it's over, see your scores, strengths, gaps and exactly which topics to review.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 py-24 sm:py-32">
      <div className="container-page">
        <SectionHeading
          eyebrow="HOW IT WORKS"
          title="From repository to interview in minutes"
          description="No question banks. Every question comes from the code you actually wrote."
        />

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.08}>
              <div className="group relative h-full rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-violet-400/30 hover:bg-white/[0.04]">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300 transition-colors group-hover:bg-violet-500/20">
                    <step.icon size={18} />
                  </span>
                  <span className="font-mono text-xs text-zinc-700">
                    0{index + 1}
                  </span>
                </div>

                <h3 className="mt-6 text-base font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}