import {
  FileCode2,
  Lock,
  MessageCircleQuestion,
  Lightbulb,
  EyeOff,
  SlidersHorizontal,
} from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./SectionHeading";

const features = [
  {
    icon: FileCode2,
    title: "Questions from your real code",
    description:
      "The interviewer refers to your actual files and decisions, not generic trivia you could memorise.",
    className: "lg:col-span-2",
  },
  {
    icon: Lock,
    title: "Difficulty that stays put",
    description:
      "Choose easy, medium or hard and it stays that way. Topics shift with the conversation; the bar doesn't.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Natural follow-ups",
    description:
      "Vague answer? You'll get a focused follow-up, just like a human interviewer would ask.",
  },
  {
    icon: Lightbulb,
    title: "Hints when you're stuck",
    description:
      "A subtle nudge in the right direction, not the answer handed to you.",
  },
  {
    icon: EyeOff,
    title: "No running commentary",
    description:
      "No scores or verdicts mid-interview. You stay in the conversation, and the full assessment comes at the end.",
    className: "lg:col-span-2",
  },
  {
    icon: SlidersHorizontal,
    title: "You set the length",
    description:
      "Pick how many main questions you want, from a quick warm-up to a full session.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 py-24 sm:py-32">
      <div className="container-page">
        <SectionHeading
          eyebrow="FEATURES"
          title="Practice that feels like the real thing"
          description="Built to feel like talking to a calm, experienced engineer who has read your repo."
        />

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal
              key={feature.title}
              delay={(index % 3) * 0.08}
              className={feature.className}
            >
              <div className="relative h-full overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-violet-300">
                  <feature.icon size={18} />
                </span>

                <h3 className="mt-5 text-base font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}