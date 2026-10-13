
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code2,
  ExternalLink,
  FileCode2,
  FolderCode,
  GitBranch,
  Loader2,
  Sparkles,
  Wrench,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type Difficulty = "easy" | "medium" | "hard";

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
  status?: string;
  repository_url: string;
  repository_name?: string;
  owner?: string;
  description?: string;
  default_branch?: string;
  languages?: Record<string, number | string>;
  tools_and_frameworks?: string[];
  important_files?: ImportantFile[];
  components?: ComponentInfo[];
  project_summary?: string;
  files_found?: number;
};

type SavedOverview = {
  overview: RepositoryOverview;
  difficulty: Difficulty;
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

/**
 * Clean a generated Markdown report for compact display.
 */
function getShortSummary(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [
      "No project summary is available yet. Review the detected technologies and important files to understand the repository.",
    ];
  }

  const cleaned = raw
    .replace(/\r\n/g, "\n")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1");

  const paragraphs: string[] = [];

  for (const line of cleaned.split("\n")) {
    let text = line.trim();

    if (!text) continue;
    if (/^[-=_*]{3,}$/.test(text)) continue;
    if (text.includes("|")) continue;

    text = text
      .replace(/^#{1,6}\s*/, "")
      .replace(/^\d+[\.\)]\s*/, "")
      .replace(/^[-*+]\s+/, "")
      .replace(/^>\s*/, "")
      .trim();

    if (!text) continue;

    if (
      /^(what the project does|main features|features|technologies used|technology stack|important components|how the components work together|conclusion|summary)$/i.test(
        text.replace(/:$/, ""),
      )
    ) {
      continue;
    }

    paragraphs.push(text);
  }

  const sentences = paragraphs
    .join(" ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.length
    ? sentences.slice(0, 4)
    : ["A short summary could not be extracted from the generated report."];
}

async function postJson<T>(
  path: string,
  body: unknown,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Could not connect to the backend. Check that FastAPI is running.",
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "Could not start the interview. Please try again.",
    );
  }

  return data as T;
}

function normalizeLanguages(
  languages: RepositoryOverview["languages"],
): [string, number][] {
  if (!languages || typeof languages !== "object") return [];

  return Object.entries(languages)
    .map(([name, rawBytes]) => {
      const bytes =
        typeof rawBytes === "number"
          ? rawBytes
          : typeof rawBytes === "string"
            ? Number(rawBytes)
            : NaN;

      return [name, bytes] as [string, number];
    })
    .filter(([, bytes]) => Number.isFinite(bytes) && bytes >= 0)
    .sort((a, b) => b[1] - a[1]);
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";

  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }

  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`;
  }

  return `${Math.round(bytes)} B`;
}

export default function OverviewPage() {
  const router = useRouter();

  const [saved, setSaved] = useState<SavedOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [showAllComponents, setShowAllComponents] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("repoviva_overview");

      if (!raw) {
        setError(
          "Repository overview not found. Please analyze your repository first.",
        );
        return;
      }

      const parsed = JSON.parse(raw) as SavedOverview;

      if (!parsed.overview?.repository_url) {
        setError("Saved repository information is incomplete.");
        return;
      }

      const difficulty: Difficulty = ["easy", "medium", "hard"].includes(
        parsed.difficulty,
      )
        ? parsed.difficulty
        : "medium";

      setSaved({
        overview: parsed.overview,
        difficulty,
      });
    } catch {
      setError("Could not load the saved repository overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleStartInterview() {
    if (!saved || starting) return;

    setStarting(true);
    setError("");

    try {
      const result = await postJson<{ session_id: string }>("/interviews", {
        repo_url: saved.overview.repository_url,
        difficulty: saved.difficulty,
        num_questions: 5,
      });

      if (!result.session_id) {
        throw new Error("The backend did not return an interview session ID.");
      }

      router.push(`/interview/${encodeURIComponent(result.session_id)}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start the interview.",
      );
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
          <p className="text-sm text-zinc-400">
            Loading repository overview...
          </p>
        </div>
      </main>
    );
  }

  if (!saved) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-zinc-100">
        <section className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#101014] p-7">
          <AlertCircle className="h-8 w-8 text-amber-300" />
          <h1 className="mt-4 text-xl font-semibold">
            Overview unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{error}</p>
          <button
            onClick={() => router.push("/start")}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            <ArrowLeft size={16} />
            Back to setup
          </button>
        </section>
      </main>
    );
  }

  const overview = saved.overview;
  const summary = getShortSummary(overview.project_summary);
  const languages = normalizeLanguages(overview.languages);

  const totalLanguageBytes = languages.reduce(
    (sum, [, bytes]) => sum + bytes,
    0,
  );

  const tools = overview.tools_and_frameworks || [];
  const files = overview.important_files || [];
  const components = overview.components || [];

  const visibleFiles = showAllFiles ? files : files.slice(0, 4);
  const visibleComponents = showAllComponents
    ? components
    : components.slice(0, 4);

  const repositoryParts = overview.repository_url
    .split("/")
    .filter(Boolean);

  const repositoryName =
    overview.repository_name ||
    repositoryParts.at(-1) ||
    "Repository";

  const owner = overview.owner || repositoryParts.at(-2) || "Unknown owner";

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#09090b]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => router.push("/start")}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to setup</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/10">
              <Code2 size={16} className="text-violet-300" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Repo<span className="text-violet-400">Viva</span>
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5 text-xs font-medium text-emerald-300">
            <CheckCircle2 size={13} />
            Analyzed
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
        {/* Page heading */}
        <div className="mb-7">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
            <Sparkles size={14} />
            Repository overview
          </p>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Get to know your project.
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Review the main details before beginning your repository-based
            technical interview.
          </p>
        </div>

        {/* Repository card */}
        <section className="overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.09] via-[#111016] to-[#0e0e12]">
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
                <Code2 size={23} className="text-violet-200" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="break-words text-xl font-semibold">
                  {repositoryName}
                </h2>

                <p className="mt-1 break-words text-sm text-zinc-400">
                  {owner} / {repositoryName}
                </p>

                {overview.description && (
                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    {overview.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.07] pt-4 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <GitBranch size={14} className="text-violet-300" />
                {overview.default_branch || "Default branch unavailable"}
              </span>

              {typeof overview.files_found === "number" && (
                <span className="inline-flex items-center gap-1.5">
                  <FileCode2 size={14} className="text-violet-300" />
                  {overview.files_found} source files analyzed
                </span>
              )}
            </div>

            <a
              href={overview.repository_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 transition hover:text-violet-200"
            >
              View on GitHub
              <ExternalLink size={12} />
            </a>
          </div>
        </section>

        {/* Short summary */}
        <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#101014] p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
              <Sparkles size={15} className="text-violet-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Project summary</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                A quick explanation of what the project does
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {summary.map((paragraph, index) => (
              <p key={index} className="text-sm leading-7 text-zinc-300">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {/* Languages and tools */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-white/[0.08] bg-[#101014] p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
                <Code2 size={15} className="text-sky-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Languages</h2>
                <p className="text-xs text-zinc-500">
                  Language distribution in the repository
                </p>
              </div>
            </div>

            {languages.length > 0 && totalLanguageBytes > 0 ? (
              <div className="mt-5 space-y-4">
                {languages.slice(0, 5).map(([language, bytes]) => {
                  const percentage = (bytes / totalLanguageBytes) * 100;

                  return (
                    <div key={language}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-zinc-200">
                          {language}
                        </span>

                        <span className="text-xs tabular-nums text-zinc-400">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>

                      <div
                        className="h-2 overflow-hidden rounded-full bg-white/[0.07]"
                        role="progressbar"
                        aria-label={`${language} percentage`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Number(percentage.toFixed(1))}
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, percentage))}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-white/[0.1] p-4">
                <p className="text-sm text-zinc-400">
                  Language statistics are unavailable or contain no valid byte
                  counts.
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-600">
                  Check the languages field returned by the analyze API.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#101014] p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <Wrench size={15} className="text-amber-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">
                  Tools and frameworks
                </h2>
                <p className="text-xs text-zinc-500">
                  Technologies identified in the code
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {tools.length ? (
                tools.slice(0, 10).map((tool) => (
                  <span
                    key={tool}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-zinc-300"
                  >
                    {tool}
                  </span>
                ))
              ) : (
                <p className="text-sm leading-6 text-zinc-500">
                  No tools or frameworks were detected.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Important files */}
        <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#101014] p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <FileCode2 size={15} className="text-emerald-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Important files</h2>
              <p className="text-xs text-zinc-500">
                Key files and their roles in the project
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {visibleFiles.length ? (
              visibleFiles.map((file) => (
                <article
                  key={file.path}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"
                >
                  <p className="break-all font-mono text-xs font-medium text-violet-200">
                    {file.path}
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-zinc-400">
                    {file.purpose}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm leading-6 text-zinc-500">
                Important files will appear here when the backend provides
                them.
              </p>
            )}
          </div>

          {files.length > 4 && (
            <button
              onClick={() => setShowAllFiles((value) => !value)}
              className="mt-4 text-xs font-medium text-violet-300 hover:text-violet-200"
            >
              {showAllFiles
                ? "Show fewer files"
                : `View all ${files.length} files`}
            </button>
          )}
        </section>

        {/* Key components */}
        <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#101014] p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
              <FolderCode size={15} className="text-indigo-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Key components</h2>
              <p className="text-xs text-zinc-500">
                Important modules identified in the source
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {visibleComponents.length ? (
              visibleComponents.map((component, index) => (
                <article
                  key={`${component.file}-${component.name}-${index}`}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-zinc-200">
                        {component.name}
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-zinc-500">
                        {component.file}
                      </p>
                    </div>

                    <span className="w-fit shrink-0 rounded-md border border-white/[0.08] px-2 py-1 text-[10px] text-zinc-400">
                      {component.type}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm leading-6 text-zinc-500">
                Key components will appear here when the backend provides them.
              </p>
            )}
          </div>

          {components.length > 4 && (
            <button
              onClick={() => setShowAllComponents((value) => !value)}
              className="mt-4 text-xs font-medium text-violet-300 hover:text-violet-200"
            >
              {showAllComponents
                ? "Show fewer components"
                : `View all ${components.length} components`}
            </button>
          )}
        </section>

        {/* Start interview */}
        <section className="mt-5 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-500/[0.09] to-indigo-500/[0.04] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-emerald-300" />
                <h2 className="text-base font-semibold">Ready to begin?</h2>
              </div>

              <p className="mt-2 text-sm text-zinc-400">
                Selected difficulty:{" "}
                <span className="font-medium text-violet-300">
                  {formatLabel(saved.difficulty)}
                </span>
              </p>
            </div>

            <button
              onClick={handleStartInterview}
              disabled={starting}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-500 px-5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Start interview
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-sm text-red-300"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Your interview questions are based on the selected repository.
        </p>
      </div>
    </main>
  );
}
