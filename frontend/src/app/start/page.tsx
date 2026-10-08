"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileCode2,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ANALYZE_PATH = "/repos/analyze";
const START_PATH = "/interviews";

type Difficulty = "easy" | "medium" | "hard";

const difficulties: {
  id: Difficulty;
  label: string;
  description: string;
}[] = [
  {
    id: "easy",
    label: "Easy",
    description: "Fundamentals and straightforward decisions",
  },
  {
    id: "medium",
    label: "Medium",
    description: "Architecture, trade-offs and implementation",
  },
  {
    id: "hard",
    label: "Hard",
    description: "Deep reasoning and challenging edge cases",
  },
];

// const [questionCount, setQuestionCount] = useState(5);

type Analysis = {
  repoId: string;
  owner: string;
  name: string;
  summary: string;
  techStack: string[];
};

async function post<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new Error(
      "Couldn't reach the server. Check that the backend is running.",
    );
  }

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";

    try {
      const data = await response.json();
      const detail = data?.detail ?? data?.message;

      if (typeof detail === "string") {
        message = detail;
      }
    } catch {
      // Ignore invalid JSON responses.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function parseGitHubRepo(input: string) {
  const value = input.trim();

  if (!value) return null;

  let owner: string | undefined;
  let name: string | undefined;

  // owner/repo
  if (!value.includes("github.com") && !value.includes("://")) {
    const short = value.match(/^([\w.-]+)\/([\w.-]+)$/);

    if (!short) return null;

    [, owner, name] = short;
  } else {
    try {
      const url = new URL(
        value.includes("://") ? value : `https://${value}`,
      );

      if (
        !["github.com", "www.github.com"].includes(
          url.hostname,
        )
      ) {
        return null;
      }

      [owner, name] = url.pathname
        .split("/")
        .filter(Boolean);
    } catch {
      return null;
    }
  }

  name = name?.replace(/\.git$/, "");

  if (!owner || !name) return null;

  return {
    owner,
    name,
    url: `https://github.com/${owner}/${name}`,
  };
}

export default function StartPage() {
  const router = useRouter();

  const [repoInput, setRepoInput] = useState("");
  const [difficulty, setDifficulty] =
    useState<Difficulty>("medium");

  const [questionCount, setQuestionCount] = useState(5);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "analyzing" | "starting"
  >("idle");

  const abortRef = useRef<AbortController | null>(null);

  const isLoading = status !== "idle";

  async function handleStartInterview(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setError(null);

    const repo = parseGitHubRepo(repoInput);

    if (!repo) {
      setError(
        "Enter a valid GitHub repository, for example github.com/owner/repo",
      );
      return;
    }

    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      /*
       * STEP 1
       * Analyze the repository.
       */
      setStatus("analyzing");

      const analysisData = await post<{
        repo_id: string;
        owner: string;
        name: string;
        summary: string;
        tech_stack?: string[];
      }>(
        ANALYZE_PATH,
        {
          repo_url: repo.url,
        },
        controller.signal,
      );

      if (controller.signal.aborted) return;

      /*
       * STEP 2
       * Create the interview using the
       * user's selected configuration.
       */
      setStatus("starting");

      const interviewData = await post<{
        session_id: string;
      }>(
        START_PATH,
        {
          repo_id: analysisData.repo_id,
          difficulty,
          num_questions: questionCount,
        },
        controller.signal,
      );

      if (controller.signal.aborted) return;

      /*
       * STEP 3
       * Enter the actual interview.
       */
      router.push(
        `/interview/${interviewData.session_id}`,
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );

      setStatus("idle");
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)]">
      <div className="container-page">
        <div className="mx-auto max-w-4xl pb-24 pt-16 sm:pt-20">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-center"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
              <Sparkles
                size={19}
                className="text-violet-400"
              />
            </div>

            <p className="mt-6 text-xs font-semibold tracking-[0.16em] text-violet-400">
              START YOUR INTERVIEW
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Let&apos;s talk about your code.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-500 sm:text-lg">
              Tell us which project you want to discuss and
              choose how challenging you want your interview
              to be.
            </p>
          </motion.div>

          {/* Main form */}
          <motion.form
            onSubmit={handleStartInterview}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-12 rounded-2xl border border-white/[0.09] bg-[#0f0f12] p-6 shadow-2xl shadow-black/20 sm:p-8"
          >
            {/* Repository */}
            <section>
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <FaGithub
                    size={17}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    GitHub repository
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    Enter the project you want RepoViva to
                    interview you about.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div
                  className={`flex items-center rounded-lg border bg-black/20 px-4 transition-colors ${
                    error
                      ? "border-red-400/40"
                      : "border-white/[0.1] focus-within:border-violet-400/60"
                  }`}
                >
                  <FaGithub
                    size={17}
                  />

                  <input
                    type="text"
                    value={repoInput}
                    onChange={(event) => {
                      setRepoInput(event.target.value);
                      setError(null);
                    }}
                    placeholder="https://github.com/owner/repository"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    disabled={isLoading}
                    className="h-14 min-w-0 flex-1 bg-transparent px-4 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-700 disabled:opacity-50"
                  />
                </div>

                <p className="mt-2 text-xs text-zinc-700">
                  You can also enter{" "}
                  <span className="font-mono text-zinc-500">
                    owner/repository
                  </span>
                </p>
              </div>
            </section>

            <div className="my-9 h-px bg-white/[0.07]" />

            {/* Difficulty */}
            <section>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    Interview level
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    This level stays locked for the entire
                    interview.
                  </p>
                </div>

                <Lock
                  size={14}
                  className="mt-1 text-zinc-700"
                />
              </div>

              <div
                role="radiogroup"
                className="mt-5 grid gap-3 md:grid-cols-3"
              >
                {difficulties.map((item) => {
                  const selected =
                    difficulty === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isLoading}
                      onClick={() =>
                        setDifficulty(item.id)
                      }
                      className={`group rounded-xl border p-4 text-left transition-all ${
                        selected
                          ? "border-violet-500/50 bg-violet-500/[0.07]"
                          : "border-white/[0.07] bg-white/[0.015] hover:border-white/[0.14] hover:bg-white/[0.025]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-sm font-medium ${
                            selected
                              ? "text-white"
                              : "text-zinc-300"
                          }`}
                        >
                          {item.label}
                        </p>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            selected
                              ? "border-violet-400 bg-violet-500"
                              : "border-zinc-700"
                          }`}
                        >
                          {selected && (
                            <Check
                              size={12}
                              className="text-white"
                            />
                          )}
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-5 text-zinc-600">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="my-9 h-px bg-white/[0.07]" />

            {/* Number of questions */}
<section>
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-medium text-zinc-200">
        Number of questions
      </p>

      <p className="mt-1 text-xs leading-5 text-zinc-600">
        Choose how many main questions you want in your interview.
        Follow-up questions don&apos;t count toward this number.
      </p>
    </div>

    <span className="shrink-0 text-xs text-zinc-600">
      1–10
    </span>
  </div>

  <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.015] p-3">
    {/* Minus */}
    <button
      type="button"
      disabled={isLoading || questionCount <= 1}
      onClick={() =>
        setQuestionCount((current) =>
          Math.max(1, current - 1),
        )
      }
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      aria-label="Decrease number of questions"
    >
      −
    </button>

    {/* Number */}
    <div className="text-center">
      <input
        type="number"
        min={1}
        max={10}
        value={questionCount}
        disabled={isLoading}
        onChange={(event) => {
          const value = Number(event.target.value);

          if (Number.isNaN(value)) return;

          setQuestionCount(
            Math.min(10, Math.max(1, value)),
          );
        }}
        className="w-20 bg-transparent text-center text-3xl font-semibold tracking-[-0.03em] text-white outline-none"
        aria-label="Number of interview questions"
      />

      <p className="mt-1 text-[11px] text-zinc-600">
        main questions
      </p>
    </div>

    {/* Plus */}
    <button
      type="button"
      disabled={isLoading || questionCount >= 10}
      onClick={() =>
        setQuestionCount((current) =>
          Math.min(10, current + 1),
        )
      }
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      aria-label="Increase number of questions"
    >
      +
    </button>
  </div>

  {/* Quick choices */}
  <div className="mt-3 flex items-center justify-center gap-2">
    {[3, 5, 7, 10].map((count) => (
      <button
        key={count}
        type="button"
        disabled={isLoading}
        onClick={() => setQuestionCount(count)}
        className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
          questionCount === count
            ? "bg-violet-500/10 text-violet-300"
            : "text-zinc-600 hover:bg-white/[0.04] hover:text-zinc-400"
        }`}
      >
        {count}
      </button>
    ))}
  </div>
</section>
            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-start gap-2 rounded-lg border border-red-400/10 bg-red-400/[0.04] p-3 text-sm text-red-300"
              >
                <AlertCircle
                  size={15}
                  className="mt-0.5 shrink-0"
                />

                <span>{error}</span>
              </motion.div>
            )}

            {/* Summary */}
            <div className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-zinc-600">
                    INTERVIEW SETUP
                  </p>

                  <p className="mt-2 text-sm text-zinc-300">
                    {difficulty.charAt(0).toUpperCase() +
                      difficulty.slice(1)}{" "}
                    · {questionCount} questions
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <FileCode2 size={13} />
                  Questions based on your code
                </div>
              </div>
            </div>

            {/* Start */}
            <button
              type="submit"
              disabled={
                !repoInput.trim() || isLoading
              }
              className="group mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-violet-500 text-sm font-medium text-white transition-all hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "analyzing" ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin motion-reduce:animate-none"
                  />
                  Analyzing your repository…
                </>
              ) : status === "starting" ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin motion-reduce:animate-none"
                  />
                  Preparing your interview…
                </>
              ) : (
                <>
                  Start my interview
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </>
              )}
            </button>
          </motion.form>

          {/* Bottom reassurance */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.6,
              delay: 0.5,
            }}
            className="mt-6 flex justify-center"
          >
            <p className="text-xs text-zinc-700">
              Your interview will be generated specifically
              from the repository you provide.
            </p>
          </motion.div>
        </div>
      </div>
    </main>
  );
}