
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Code2,
  Loader2,
  MessageSquare,
  RotateCcw,
  Sparkles,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type Message = {
  id: string;
  role: "interviewer" | "candidate";
  content: string;
};

type InterviewSession = {
  session_id: string;
  repository_url: string;
  difficulty: string;
  total_questions: number;
  question_number: number;
  question: string | null;
  completed: boolean;
};

type AnswerResponse = {
  session_id: string;
  type: "react" | "hint" | "next" | "complete";
  message: string;
  finished: boolean;
  difficulty: string;
  question_number: number;
  total_questions: number;
  feedback?: Record<string, unknown> | string | null;
};

async function requestJson<T>(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
  }
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: options?.body
      ? { "Content-Type": "application/json" }
      : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      data && typeof data.detail === "string"
        ? data.detail
        : "Something went wrong. Please try again.";

    throw new Error(detail);
  }

  return data as T;
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function InterviewPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<
    Record<string, unknown> | string | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInterview() {
      setLoading(true);
      setError("");

      try {
        const data = await requestJson<InterviewSession>(
          `/interviews/${encodeURIComponent(sessionId)}`,
          { signal: controller.signal }
        );

        if (controller.signal.aborted) return;

        setSession(data);

        if (data.completed) {
          setMessages([
            {
              id: "completed",
              role: "interviewer",
              content: "This interview has already been completed.",
            },
          ]);
          return;
        }

        if (data.question) {
          setMessages([
            {
              id: "opening-question",
              role: "interviewer",
              content: data.question,
            },
          ]);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load this interview."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    if (sessionId) loadInterview();

    return () => controller.abort();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer || submitting || !session || session.completed) {
      return;
    }

    const candidateMessage: Message = {
      id: crypto.randomUUID(),
      role: "candidate",
      content: trimmedAnswer,
    };

    setMessages((current) => [...current, candidateMessage]);
    setAnswer("");
    setError("");
    setSubmitting(true);

    try {
      const result = await requestJson<AnswerResponse>(
        `/interviews/${encodeURIComponent(sessionId)}/answer`,
        {
          method: "POST",
          body: { answer: trimmedAnswer },
        }
      );

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "interviewer",
          content: result.message,
        },
      ]);

      setSession((current) =>
        current
          ? {
              ...current,
              question_number: result.question_number,
              total_questions: result.total_questions,
              difficulty: result.difficulty,
              completed: result.finished,
              question: result.finished ? null : result.message,
            }
          : current
      );

      if (result.finished) {
        setFeedback(result.feedback ?? null);
      } else {
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    } catch (err) {
      setMessages((current) =>
        current.filter((message) => message.id !== candidateMessage.id)
      );
      setAnswer(trimmedAnswer);

      setError(
        err instanceof Error
          ? err.message
          : "Your answer could not be submitted. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const progress = session
    ? Math.min(
        100,
        Math.round(
          (session.question_number /
            Math.max(session.total_questions, 1)) *
            100
        )
      )
    : 0;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-6 text-zinc-100">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Preparing your interview</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Connecting to your interview session...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-6 text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
            <MessageSquare className="h-6 w-6 text-red-400" />
          </div>
          <h1 className="mt-5 text-xl font-semibold">
            Could not load interview
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{error}</p>
          <button
            onClick={() => router.push("/start")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to setup
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#09090b] text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#09090b]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => router.push("/start")}
            className="flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Exit interview</span>
            <span className="sm:hidden">Exit</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 ring-1 ring-violet-400/20">
              <Code2 className="h-4 w-4 text-violet-300" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              Repo<span className="text-violet-400">Viva</span>
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">
              {session?.completed ? "Completed" : "In progress"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-8 sm:px-6 sm:pt-10">
        <div className="mb-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                AI technical interview
              </div>

              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Your project. Your interview.
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                Explain your thinking, discuss your technical decisions, and
                demonstrate your understanding.
              </p>
            </div>

            {session && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-300">
                  {formatLabel(session.difficulty)} difficulty
                </span>
                <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-400">
                  {session.total_questions} questions
                </span>
              </div>
            )}
          </div>

          {session && (
            <div className="mt-7 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                <span className="text-zinc-400">Interview progress</span>
                <span className="font-medium tabular-nums text-zinc-200">
                  {session.completed
                    ? session.total_questions
                    : session.question_number}{" "}
                  / {session.total_questions}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {session.repository_url && (
                <p className="mt-3 truncate text-xs text-zinc-500">
                  Repository: {session.repository_url}
                </p>
              )}
            </div>
          )}
        </div>

        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e0e12] shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
                <Sparkles className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Your interviewer</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  AI-powered technical assessment
                </p>
              </div>
            </div>
            <span className="hidden rounded-full border border-white/[0.08] px-3 py-1 text-[11px] text-zinc-500 sm:inline-flex">
              Text interview
            </span>
          </div>

          <div className="max-h-[520px] min-h-[300px] space-y-6 overflow-y-auto p-4 sm:p-6">
            {messages.map((message) => {
              const isCandidate = message.role === "candidate";

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    isCandidate ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isCandidate && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-500/10">
                      <Sparkles className="h-4 w-4 text-violet-300" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3.5 sm:max-w-[80%] ${
                      isCandidate
                        ? "rounded-br-md bg-violet-600 text-white"
                        : "rounded-tl-md border border-white/[0.07] bg-white/[0.035] text-zinc-200"
                    }`}
                  >
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.13em] opacity-60">
                      {isCandidate ? "Your answer" : "Interviewer"}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-7">
                      {message.content}
                    </p>
                  </div>
                </div>
              );
            })}

            {submitting && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-500/10">
                  <Sparkles className="h-4 w-4 text-violet-300" />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Evaluating your answer...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {error && session && (
            <div
              role="alert"
              className="mx-4 mb-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300 sm:mx-6"
            >
              {error}
            </div>
          )}

          {!session?.completed ? (
            <form
              onSubmit={handleSubmit}
              className="border-t border-white/[0.07] bg-black/10 p-4 sm:p-6"
            >
              <label
                htmlFor="answer"
                className="mb-3 block text-xs font-medium text-zinc-400"
              >
                Write your answer
              </label>

              <div className="rounded-xl border border-white/[0.1] bg-[#09090b] transition focus-within:border-violet-400/40 focus-within:ring-1 focus-within:ring-violet-400/10">
                <textarea
                  ref={textareaRef}
                  id="answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Explain your approach, reasoning, and technical decisions..."
                  rows={4}
                  maxLength={20000}
                  disabled={submitting}
                  className="w-full resize-y bg-transparent px-4 py-4 text-sm leading-7 text-zinc-200 outline-none placeholder:text-zinc-600 disabled:opacity-60"
                />

                <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-3">
                  <span className="text-[11px] text-zinc-600">
                    Be clear and explain your reasoning.
                  </span>
                  <button
                    type="submit"
                    disabled={!answer.trim() || submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting
                      </>
                    ) : (
                      <>
                        Submit answer
                        <ArrowUp className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="border-t border-white/[0.07] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Interview completed</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Your interview has ended. Review your assessment below.
                  </p>
                </div>
              </div>

              
{feedback !== null && (
  <div className="mt-6 space-y-5">
    {(() => {
      const report =
        typeof feedback === "object" && feedback !== null
          ? feedback
          : null;

      const getText = (value: unknown) =>
        typeof value === "string" || typeof value === "number"
          ? String(value)
          : value == null
            ? ""
            : JSON.stringify(value, null, 2);

      const getScore = (value: unknown) => {
        const score = Number(value);
        return value !== null &&
          value !== undefined &&
          value !== "" &&
          Number.isFinite(score)
          ? score
          : null;
      };

      const overallScore = getScore(report?.overall_score);

      const categories = [
        {
          key: "technical_understanding",
          reason: "technical_reason",
          label: "Technical understanding",
          description: "Understanding of concepts and implementation",
        },
        {
          key: "code_understanding",
          reason: "code_reason",
          label: "Code understanding",
          description: "Code flow, structure, and behavior",
        },
        {
          key: "problem_solving",
          reason: "problem_solving_reason",
          label: "Problem solving",
          description: "Debugging and approaching challenges",
        },
        {
          key: "engineering_reasoning",
          reason: "engineering_reasoning_reason",
          label: "Engineering reasoning",
          description: "Trade-offs, maintainability, and design decisions",
        },
      ];

      const scoreColor = (score: number) => {
        if (score >= 8) return "text-emerald-300";
        if (score >= 6) return "text-violet-300";
        return "text-amber-300";
      };

      const scoreBarColor = (score: number) => {
        if (score >= 8) return "bg-emerald-400";
        if (score >= 6) return "bg-violet-400";
        return "bg-amber-400";
      };

      const scoreLabel = (score: number) => {
        if (score >= 9) return "Excellent";
        if (score >= 8) return "Strong";
        if (score >= 6) return "Good foundation";
        if (score >= 4) return "Needs improvement";
        return "Needs more practice";
      };

      const knownKeys = new Set([
        "overall_score",
        ...categories.flatMap((item) => [item.key, item.reason]),
      ]);

      const extraFeedback = report
        ? Object.entries(report).filter(
            ([key, value]) =>
              !knownKeys.has(key) &&
              value !== null &&
              value !== undefined &&
              value !== ""
          )
        : [];

      return (
        <>
          {/* Overall result */}
          <section className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.14] via-[#15121f] to-[#101014] p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3 py-1.5 text-xs font-medium text-violet-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Interview completed
                </div>

                <h3 className="mt-4 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Your interview report
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
                  Review your performance, understand your strengths, and
                  identify what to improve next.
                </p>
              </div>

              {overallScore !== null && (
                <div className="flex shrink-0 items-center gap-4 rounded-xl border border-white/[0.09] bg-black/20 p-4 sm:min-w-[185px]">
                  <div
                    className={`flex h-[76px] w-[76px] items-center justify-center rounded-full border-[5px] ${
                      overallScore >= 8
                        ? "border-emerald-400/60"
                        : overallScore >= 6
                          ? "border-violet-400/60"
                          : "border-amber-400/60"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold tracking-tight text-white">
                        {overallScore}
                      </div>
                      <div className="text-[10px] text-zinc-500">/ 10</div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">Overall score</p>
                    <p className={`mt-1 text-sm font-semibold ${scoreColor(overallScore)}`}>
                      {scoreLabel(overallScore)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Category scores */}
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Performance breakdown
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Your results across four engineering skills
                </p>
              </div>
              <span className="hidden text-xs text-zinc-600 sm:block">
                Scores out of 10
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((item, index) => {
                const score = getScore(report?.[item.key]);
                const reason = report?.[item.reason];

                return (
                  <article
                    key={item.key}
                    className="group rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 transition duration-200 hover:border-violet-400/25 hover:bg-white/[0.04] sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035] text-xs font-semibold text-zinc-400">
                          0{index + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold leading-5 text-zinc-100">
                            {item.label}
                          </h4>
                          <p className="mt-1 text-xs leading-5 text-zinc-500">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {score !== null && (
                        <div className="shrink-0 text-right">
                          <span className={`text-2xl font-semibold tabular-nums ${scoreColor(score)}`}>
                            {score}
                          </span>
                          <span className="text-xs text-zinc-600"> / 10</span>
                        </div>
                      )}
                    </div>

                    {score !== null && (
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(score)}`}
                          style={{
                            width: `${Math.max(0, Math.min(10, score)) * 10}%`,
                          }}
                        />
                      </div>
                    )}

                    {reason != null && getText(reason) !== "" && (
                      <div className="mt-4 border-t border-white/[0.06] pt-3">
                        <p className="whitespace-pre-wrap break-words text-xs leading-6 text-zinc-400">
                          {getText(reason)}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          {/* Additional feedback from the backend */}
          
{/* Additional feedback from the backend */}
{extraFeedback.length > 0 && (
  <section className="space-y-4">
    <div>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-300" />
        <h3 className="text-base font-semibold text-white">
          Interview insights
        </h3>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Detailed feedback to help you improve your technical interview skills.
      </p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      {extraFeedback
        .filter(
          ([key]) =>
            !["final_assessment", "strengths", "areas_to_improve", "topics_to_review", "depth", "depth_reason"].includes(key)
        )
        .map(([key, value]) => (
          <article
            key={key}
            className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5"
          >
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {formatLabel(key)}
            </h4>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">
              {getText(value)}
            </p>
          </article>
        ))}
    </div>

    {extraFeedback
      .filter(([key]) => key === "depth")
      .map(([key, value]) => {
        const depth = Number(value);
        const validDepth =
          value !== null &&
          value !== undefined &&
          value !== "" &&
          Number.isFinite(depth);

        return (
          <article
            key={key}
            className="rounded-xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.07] to-transparent p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Technical depth
                </h4>
                <p className="mt-1 text-xs text-zinc-500">
                  How deeply you explored implementation details
                </p>
              </div>
              {validDepth && (
                <div className="shrink-0 text-right">
                  <span className="text-2xl font-semibold text-violet-300">
                    {depth}
                  </span>
                  <span className="text-xs text-zinc-500"> / 10</span>
                </div>
              )}
            </div>

            {validDepth && (
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-violet-400"
                  style={{
                    width: `${Math.max(0, Math.min(10, depth)) * 10}%`,
                  }}
                />
              </div>
            )}
          </article>
        );
      })}

    {extraFeedback
      .filter(([key]) => key === "depth_reason")
      .map(([key, value]) => (
        <div
          key={key}
          className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-4"
        >
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Depth analysis
          </h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">
            {getText(value)}
          </p>
        </div>
      ))}

    {extraFeedback
      .filter(
        ([key]) =>
          ["strengths", "areas_to_improve", "topics_to_review"].includes(key)
      )
      .map(([key, value]) => {
        const config: Record<
          string,
          { title: string; description: string; icon: string }
        > = {
          strengths: {
            title: "Your strengths",
            description: "What you demonstrated well",
            icon: "✓",
          },
          areas_to_improve: {
            title: "Areas to improve",
            description: "Where you can level up",
            icon: "↗",
          },
          topics_to_review: {
            title: "Recommended topics",
            description: "What to study next",
            icon: "⌘",
          },
        };

        const item = config[key];

        return (
          <article
            key={key}
            className="rounded-xl border border-white/[0.08] bg-[#111114] p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-semibold ${
                  key === "strengths"
                    ? "bg-emerald-500/10 text-emerald-300"
                    : key === "areas_to_improve"
                      ? "bg-amber-500/10 text-amber-300"
                      : "bg-sky-500/10 text-sky-300"
                }`}
              >
                {item.icon}
              </div>

              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-white">
                  {item.title}
                </h4>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">
                {getText(value)}
              </p>
            </div>
          </article>
        );
      })}

    {extraFeedback
      .filter(([key]) => key === "final_assessment")
      .map(([key, value]) => (
        <article
          key={key}
          className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.1] via-[#15121e] to-[#101014] p-5 sm:p-7"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10">
              <Sparkles className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">
                Final assessment
              </h4>
              <p className="mt-1 text-xs text-zinc-400">
                Your overall interview evaluation
              </p>
            </div>
          </div>

          <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300 sm:text-[15px]">
            {getText(value)}
          </p>

          <div className="mt-6 flex items-center gap-2 border-t border-white/[0.08] pt-4 text-xs text-zinc-500">
            <CheckCircle2 className="h-4 w-4 text-violet-300" />
            Assessment generated from your interview responses
          </div>
        </article>
      ))}
  </section>
)}


          {/* Plain-text fallback */}
          {!report && (
            <section className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Final feedback
              </h3>
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">
                {getText(feedback)}
              </p>
            </section>
          )}
        </>
      );
    })()}
  </div>
)}


              <button
                onClick={() => router.push("/start")}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                <RotateCcw className="h-4 w-4" />
                Start another interview
              </button>
            </div>
          )}
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-zinc-600">
          Take your time. Focus on explaining why you made each technical
          decision.
        </p>
      </div>
    </main>
  );
}
