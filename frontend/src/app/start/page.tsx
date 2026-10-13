
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileCode2,
  FolderCode,
  Loader2,
  Lock,
  Sparkles,
  Wrench,
  RotateCcw,
  GitBranch,
} from "lucide-react";
import { motion } from "motion/react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

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

type ImportantFile = {
  path: string;
  purpose: string;
};

type ComponentInfo = {
  name: string;
  file: string;
  type: string;
};

type RepositoryOverview = {
  status: string;
  repository_url: string;
  repository_name: string;
  owner: string;
  description: string;
  default_branch: string;
  languages: Record<string, number>;
  tools_and_frameworks: string[];
  important_files: ImportantFile[];
  components: ComponentInfo[];
  project_summary: string;
  files_found: number;
  documents_created: number;
  chunks_created: number;
  chunks_stored: number;
  message: string;
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Couldn't reach the server. Check that the backend is running.",
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(". ")
          : data?.message;

    throw new Error(message || "Something went wrong. Please try again.");
  }

  return data as T;
}

function parseGitHubRepo(input: string) {
  const value = input.trim();
  if (!value) return null;

  let owner: string | undefined;
  let name: string | undefined;

  if (!value.includes("github.com") && !value.includes("://")) {
    const short = value.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (!short) return null;
    [, owner, name] = short;
  } else {
    try {
      const url = new URL(
        value.includes("://") ? value : `https://${value}`,
      );

      if (!["github.com", "www.github.com"].includes(url.hostname)) {
        return null;
      }

      [owner, name] = url.pathname.split("/").filter(Boolean);
    } catch {
      return null;
    }
  }

  name = name?.replace(/\.git$/, "");

  if (!owner || !name || name.includes("/")) return null;

  return {
    owner,
    name,
    url: `https://github.com/${owner}/${name}`,
  };
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

function formatBytes(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function StartPage() {
  const router = useRouter();

  const [repoInput, setRepoInput] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [overview, setOverview] = useState<RepositoryOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "analyzing" | "starting"
  >("idle");

  const abortRef = useRef<AbortController | null>(null);
  const isLoading = status !== "idle";

  async function handleAnalyzeRepository(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);
    setOverview(null);

    const repo = parseGitHubRepo(repoInput);

    if (!repo) {
      setError(
        "Enter a valid GitHub repository, for example github.com/owner/repository.",
      );
      return;
    }

    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setStatus("analyzing");

      const result = await post<RepositoryOverview>(
        ANALYZE_PATH,
        { repo_url: repo.url },
        controller.signal,
      );

      if (controller.signal.aborted) return;

// Save the repository analysis and selected difficulty
// so the overview page can read them.
sessionStorage.setItem(
  "repoviva_overview",
  JSON.stringify({
    overview: result,
    difficulty,
  }),
);

// Navigate to the separate overview page.
router.push("/overview");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;

      setError(
        err instanceof Error ? err.message : "Repository analysis failed.",
      );
    } finally {
      if (!controller.signal.aborted) setStatus("idle");
    }
  }

  async function handleStartInterview() {
    if (!overview || isLoading) return;

    setError(null);
    setStatus("starting");

    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await post<{
        session_id: string;
        detail?: string;
        message?: string;
      }>(
        START_PATH,
        {
          repo_url: overview.repository_url,
          difficulty,
          num_questions: 5,
        },
        controller.signal,
      );

      if (controller.signal.aborted) return;

      if (!data.session_id) {
        throw new Error("The backend did not return an interview session ID.");
      }

      router.push(`/interview/${encodeURIComponent(data.session_id)}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;

      setError(
        err instanceof Error ? err.message : "Could not start the interview.",
      );
      setStatus("idle");
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
            <Sparkles size={19} className="text-violet-400" />
          </div>

          <p className="mt-6 text-xs font-semibold tracking-[0.16em] text-violet-400">
            REPOVIVA · REPOSITORY ANALYSIS
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Let&apos;s talk about your code.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
            Enter a GitHub repository to explore its architecture, technologies,
            important files, and components before your technical interview.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleAnalyzeRepository}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mt-10 rounded-2xl border border-white/[0.09] bg-[#0f0f12] p-5 shadow-2xl shadow-black/20 sm:p-8"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
              <FaGithub size={19} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-zinc-200">
                GitHub repository
              </h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Use a public repository URL or owner/repository.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center rounded-lg border border-white/[0.1] bg-black/20 px-4 focus-within:border-violet-400/60">
            <span className="shrink-0 text-zinc-400">
              <FaGithub size={17} />
            </span>
            <input
              type="text"
              value={repoInput}
              onChange={(event) => {
                setRepoInput(event.target.value);
                setOverview(null);
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

          <div className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-zinc-200">
                  Interview difficulty
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Your selected level stays locked throughout the interview.
                </p>
              </div>
              <Lock size={14} className="text-zinc-600" />
            </div>

            <div
              role="radiogroup"
              aria-label="Interview difficulty"
              className="mt-4 grid gap-3 sm:grid-cols-3"
            >
              {difficulties.map((item) => {
                const selected = difficulty === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={isLoading}
                    onClick={() => setDifficulty(item.id)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-violet-500/50 bg-violet-500/[0.08]"
                        : "border-white/[0.07] bg-white/[0.015] hover:border-white/[0.14]"
                    } disabled:opacity-60`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          selected
                            ? "border-violet-400 bg-violet-500"
                            : "border-zinc-700"
                        }`}
                      >
                        {selected && <Check size={12} />}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2 rounded-lg border border-red-400/10 bg-red-400/[0.04] p-3 text-sm text-red-300"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}


          <button
            type="submit"
            disabled={!repoInput.trim() || isLoading}
            className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-violet-500 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "analyzing" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing repository...
              </>
            ) : (
              <>
                {overview ? "Analyze another repository" : "Analyze repository"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </motion.form>


        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          RepoViva generates repository-specific interview questions and
          evaluates your answers after the interview.
        </p>
      </div>
    </main>
  );
}
