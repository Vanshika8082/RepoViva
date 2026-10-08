"use client";

import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { FileCode2, Pause, Play, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";

const EASE = [0.22, 1, 0.36, 1] as const;
const INTERVAL_MS = 7000;

const REPOSITORY = "acme / task-manager";
const DIFFICULTY = "Medium";

type CodeLine = { text: string; highlight?: boolean };

type Preview = {
  topic: string;
  file: string;
  code: CodeLine[];
  question: string;
  followUp: string;
  answer: string;
};

const previews: Preview[] = [
  {
    topic: "Project architecture",
    file: "src/services/taskService.ts",
    code: [
      { text: "export class TaskService {" },
      { text: "  constructor(private repo: TaskRepository) {}", highlight: true },
      { text: "  async complete(id: string) {" },
    ],
    question:
      "I noticed you're using a separate service for handling task persistence.",
    followUp: "What led you to structure it this way?",
    answer:
      "I wanted to keep persistence separate from the request handling so the business logic wouldn't depend directly on the database implementation...",
  },
  {
    topic: "Security",
    file: "src/middleware/auth.ts",
    code: [
      { text: "const token = req.headers.authorization;" },
      { text: "const user = verifyJwt(token);", highlight: true },
      { text: "if (!user) return res.sendStatus(401);" },
    ],
    question:
      "Your auth middleware verifies a JWT on every request, but never checks a revocation list.",
    followUp: "How would you handle a stolen token?",
    answer:
      "Right now a stolen token stays valid until it expires, so I'd move to short-lived access tokens with a refresh token I can revoke server-side...",
  },
  {
    topic: "System design",
    file: "src/queue/worker.ts",
    code: [
      { text: "for (const job of queue.pull()) {" },
      { text: "  await notify(job).catch(() => retry(job));", highlight: true },
      { text: "}" },
    ],
    question:
      "How does your application handle failures between the different services?",
    followUp: "What would you change to make this more resilient?",
    answer:
      "I wanted each service to handle its own failures independently, so a temporary issue wouldn't bring down the entire request flow...",
  },
  {
    topic: "Performance",
    file: "src/db/queries.ts",
    code: [
      { text: "export async function getTasks(userId: string) {" },
      { text: "  return db.tasks.findMany({ where: { userId } });", highlight: true },
      { text: "}" },
    ],
    question:
      "Your dashboard loads every task for a user in a single query.",
    followUp: "What happens when one user has 100,000 tasks?",
    answer:
      "I'd add cursor-based pagination and an index on user and created date, so the dashboard only loads the first page of tasks...",
  },
  {
    topic: "Engineering decisions",
    file: "tests/taskService.test.ts",
    code: [
      { text: "const repo = new InMemoryTaskRepo();" },
      { text: "const service = new TaskService(repo);", highlight: true },
      { text: 'expect(await service.complete("t1")).toBe(true);' },
    ],
    question:
      "I noticed you've separated the business logic from the database layer.",
    followUp: "What advantages did that give you in this project?",
    answer:
      "The separation made the business logic easier to test and allowed me to change the persistence implementation without affecting the core application...",
  },
];

/* Slides are all mounted and stacked; these variants cross-fade them. */
const slideVariants: Variants = {
  active: { transition: { staggerChildren: 0.08, delayChildren: 0.18 } },
  inactive: {},
};

const itemVariants: Variants = {
  inactive: { opacity: 0, y: 10, transition: { duration: 0.2 } },
  active: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/* ------------------------------------------------------------------ */
/* Typewriter answer                                                   */
/* ------------------------------------------------------------------ */

function TypedAnswer({
  text,
  active,
  animate,
}: {
  text: string;
  active: boolean;
  animate: boolean;
}) {
  const [count, setCount] = useState(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) {
      setCount(text.length);
      return;
    }
    if (!active) return;

    setCount(0);
    let interval: ReturnType<typeof setInterval> | undefined;

    const start = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length && interval) clearInterval(interval);
      }, 18);
    }, 600);

    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [active, animate, text]);

  return (
    <p className="relative text-sm leading-6 text-zinc-400">
      {/* Real text for screen readers */}
      <span className="sr-only">{text}</span>

      {/* Invisible copy reserves the final height so nothing jumps */}
      <span aria-hidden className="invisible">
        {text}
      </span>

      <span aria-hidden className="absolute inset-0">
        {text.slice(0, count)}
        {animate && active && count < text.length && (
          <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-violet-400" />
        )}
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Code context                                                        */
/* ------------------------------------------------------------------ */

function CodeContext({ file, code }: { file: string; code: CodeLine[] }) {
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-white/[0.07] bg-black/30">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-1.5">
        <FileCode2 size={12} className="text-violet-400" />
        <span className="font-mono text-[11px] text-zinc-500">{file}</span>
      </div>

      <pre className="overflow-x-auto py-2.5 font-mono text-[11px] leading-5">
        {code.map((line, i) => (
          <div
            key={i}
            className={`whitespace-pre border-l-2 px-2.5 ${
              line.highlight
                ? "border-violet-400 bg-violet-500/10 text-zinc-200"
                : "border-transparent text-zinc-600"
            }`}
          >
            {line.text}
          </div>
        ))}
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function InterviewPreview() {
  const shouldReduceMotion = useReducedMotion();
  const autoplay = !shouldReduceMotion;

  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  const paused = hoverPaused || focusPaused || userPaused;
  const preview = previews[activeIndex];

  const advance = () =>
    setActiveIndex((current) => (current + 1) % previews.length);

  return (
    <MotionConfig reducedMotion="user">
      {/* Keyframes for the indicator fill. Move to globals.css if you prefer. */}
      <style>{`@keyframes rv-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Interview preview"
        className="relative isolate w-full"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHoverPaused(true)}
        onPointerLeave={() => setHoverPaused(false)}
        onFocus={(e) =>
          e.target.matches(":focus-visible") && setFocusPaused(true)
        }
        onBlur={() => setFocusPaused(false)}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] bg-violet-600/20 blur-3xl"
        />

        {/* Gradient border + floating shell (never remounts) */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="rounded-xl bg-gradient-to-b from-white/[0.18] via-white/[0.04] to-violet-500/30 p-px shadow-2xl shadow-black/40"
        >
          <div className="relative overflow-hidden rounded-[11px] bg-[#0f0f12]">
            {/* Top sheen */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent"
            />

            {/* WINDOW HEADER */}
            <div className="flex h-12 items-center justify-between border-b border-white/[0.07] px-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                </div>

                <div className="ml-3 flex items-center gap-2 text-xs text-zinc-500">
                  <FaGithub size={13} />
                  <span className="font-mono">{REPOSITORY}</span>
                </div>
              </div>

              <span className="flex items-center gap-1 text-xs tabular-nums text-zinc-500">
                {DIFFICULTY} ·
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={activeIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="inline-block"
                  >
                    {activeIndex + 1} / {previews.length}
                  </motion.span>
                </AnimatePresence>
              </span>
            </div>

            <div className="p-6 sm:p-8">
              {/* Interviewer + progress */}
              <div className="mb-6 flex items-center justify-between">
                <div className="relative h-9">
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-violet-400">
                    INTERVIEWER
                  </p>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={activeIndex}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="mt-1 text-xs text-zinc-600"
                    >
                      {preview.topic}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <div
                  className="flex gap-1.5"
                  role="img"
                  aria-label={`Question ${activeIndex + 1} of ${previews.length}`}
                >
                  {previews.map((_, index) => (
                    <span
                      key={index}
                      className={`h-1.5 w-6 rounded-full transition-all duration-500 ${
                        index <= activeIndex
                          ? "bg-violet-500"
                          : "bg-zinc-700"
                      } ${
                        index === activeIndex
                          ? "shadow-[0_0_10px_rgba(139,92,246,0.7)]"
                          : ""
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* SLIDES: all stacked in one grid cell, so height = tallest slide */}
              <div className="grid">
                {previews.map((p, index) => {
                  const isActive = index === activeIndex;

                  return (
                    <motion.div
                      key={p.topic}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${index + 1} of ${previews.length}`}
                      aria-hidden={!isActive}
                      variants={slideVariants}
                      initial={false}
                      animate={isActive ? "active" : "inactive"}
                      className={`col-start-1 row-start-1 ${
                        isActive ? "" : "pointer-events-none"
                      }`}
                    >
                      {/* Code from the repo */}
                      <motion.div variants={itemVariants}>
                        <CodeContext file={p.file} code={p.code} />
                      </motion.div>

                      {/* Question */}
                      <motion.div variants={itemVariants} className="max-w-xl">
                        <p className="text-xl font-medium leading-8 tracking-[-0.02em] text-zinc-100 sm:text-2xl">
                          {p.question}
                        </p>
                        <p className="mt-3 text-xl font-medium leading-8 tracking-[-0.02em] text-zinc-100 sm:text-2xl">
                          {p.followUp}
                        </p>
                      </motion.div>

                      {/* Answer */}
                      <motion.div
                        variants={itemVariants}
                        className="mt-8 border-t border-white/[0.07] pt-5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold tracking-[0.16em] text-zinc-600">
                            YOUR ANSWER
                          </span>
                          <span className="font-mono text-[10px] text-zinc-700">
                            00:42
                          </span>
                        </div>

                        <div className="mt-3 rounded-lg border border-white/[0.07] bg-black/20 p-4">
                          <TypedAnswer
                            text={p.answer}
                            active={isActive}
                            animate={autoplay}
                          />

                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-zinc-700">
                              Continue your answer
                            </span>
                            <motion.div
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                              className="h-2 w-2 rounded-full bg-violet-400"
                            />
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM STATUS */}
            <div className="flex items-center justify-between border-t border-white/[0.07] px-6 py-4">
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                />
                <span className="text-xs text-zinc-500">
                  Interview in progress
                </span>
              </div>

              <span className="text-xs text-zinc-600">Difficulty locked</span>
            </div>
          </div>
        </motion.div>

        {/* CAROUSEL INDICATORS (active one fills and drives the autoplay) */}
        <div className="relative mt-5 flex items-center justify-center">
          <div className="flex items-center gap-1">
            {previews.map((p, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={p.topic}
                  type="button"
                  aria-label={`Show question ${index + 1}: ${p.topic}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => setActiveIndex(index)}
                  className="group flex h-6 items-center px-1"
                >
                  <span
                    className={`relative block h-1.5 overflow-hidden rounded-full bg-zinc-700 transition-all duration-500 ${
                      isActive ? "w-10" : "w-2 group-hover:bg-zinc-500"
                    }`}
                  >
                    {isActive && (
                      <span
                        key={activeIndex}
                        onAnimationEnd={advance}
                        className={`absolute inset-0 origin-left rounded-full bg-violet-500 ${
                          autoplay ? "" : "scale-x-100"
                        }`}
                        style={
                          autoplay
                            ? {
                                animation: `rv-fill ${INTERVAL_MS}ms linear forwards`,
                                animationPlayState: paused
                                  ? "paused"
                                  : "running",
                              }
                            : undefined
                        }
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {autoplay && (
            <button
              type="button"
              aria-label={userPaused ? "Play preview" : "Pause preview"}
              aria-pressed={userPaused}
              onClick={() => setUserPaused((v) => !v)}
              className="absolute right-0 flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 transition-colors hover:text-zinc-200"
            >
              {userPaused ? <Play size={12} /> : <Pause size={12} />}
            </button>
          )}
        </div>

        {/* SUPPORTING REPOSITORY BADGE */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1, ease: EASE }}
          className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-lg border border-white/[0.08] bg-[#111113] px-4 py-3 shadow-xl shadow-black/30 sm:flex"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/15 text-violet-300">
            <Sparkles size={14} />
          </span>
          <div>
            <p className="text-[10px] font-medium tracking-wide text-zinc-600">
              BUILT FROM
            </p>
            <p className="mt-0.5 font-mono text-xs text-zinc-300">
              your repository
            </p>
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}