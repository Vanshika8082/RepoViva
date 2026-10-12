"use client";

import { useEffect, useRef, useState } from "react";
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
type Feedback = Record<string, unknown>;

function FeedbackReport({ feedback }: { feedback: Feedback }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0e0e12] p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Interview feedback</h2>
      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-black/20 p-4 text-sm leading-6 text-zinc-300">
        {JSON.stringify(feedback, null, 2)}
      </pre>
    </section>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

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
  /** Optional: if your GET endpoint returns it, the report survives reloads. */
  feedback?: Feedback | null;
};

type AnswerResponse = {
  session_id: string;
  type: "react" | "hint" | "next" | "complete";
  message: string;
  finished: boolean;
  difficulty: string;
  question_number: number;
  total_questions: number;
  feedback?: Feedback | null;
};

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

const FALLBACK_ERROR = "Something went wrong. Please try again.";

function extractDetail(data: unknown): string {
  if (!data || typeof data !== "object") return FALLBACK_ERROR;
  const detail = (data as { detail?: unknown }).detail;

  if (typeof detail === "string") return detail;

  /* FastAPI validation errors arrive as an array of { msg } objects. */
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        item && typeof item === "object" && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : "",
      )
      .filter(Boolean);
    if (messages.length) return messages.join(". ");
  }

  return FALLBACK_ERROR;
}

async function requestJson<T>(
  path: string,
  options?: { method?: string; body?: unknown; signal?: AbortSignal },
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options?.method ?? "GET",
      headers: options?.body
        ? { "Content-Type": "application/json" }
        : undefined,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: options?.signal,
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

  if (!response.ok) throw new Error(extractDetail(data));

  return data as T;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/* Transcript survives a reload (per browser tab, cleared when it closes). */
type Saved = { messages: Message[]; feedback: Feedback | null };

const storageKey = (id: string) => `repoviva:interview:${id}`;

function loadSaved(id: string): Saved | null {
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function persist(id: string, data: Saved) {
  try {
    sessionStorage.setItem(storageKey(id), JSON.stringify(data));
  } catch {
    /* storage unavailable: ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function InterviewerAvatar() {
  return (
    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-500/10">
      <Sparkles className="h-4 w-4 text-violet-300" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div role="status" className="flex items-center gap-3">
      <InterviewerAvatar />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.035] px-4 py-4">
        <span className="sr-only">The interviewer is replying</span>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            aria-hidden
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 motion-reduce:animate-none"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function InterviewPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ---------------- load the session ---------------- */

  useEffect(() => {
    if (!sessionId) return;

    const controller = new AbortController();

    async function loadInterview() {
      setLoading(true);
      setError("");

      try {
        const data = await requestJson<InterviewSession>(
          `/interviews/${encodeURIComponent(sessionId)}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;

        const saved = loadSaved(sessionId);

        setSession(data);

        if (data.completed) {
          setFeedback(data.feedback ?? saved?.feedback ?? null);
          setMessages(
            saved?.messages?.length
              ? saved.messages
              : [
                  {
                    id: "completed",
                    role: "interviewer",
                    content: "This interview has already been completed.",
                  },
                ],
          );
          return;
        }

        /* Restore the transcript, dropping an unanswered trailing answer
           (the request may or may not have reached the server). */
        const restored = [...(saved?.messages ?? [])];
        while (restored.at(-1)?.role === "candidate") restored.pop();

        const lastInterviewer = restored.at(-1)?.content;
        if (data.question && data.question !== lastInterviewer) {
          restored.push({
            id: uid(),
            role: "interviewer",
            content: data.question,
          });
        }

        setMessages(restored);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "Could not load this interview.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadInterview();
    return () => controller.abort();
  }, [sessionId, attempt]);

  /* ---------------- persist the transcript ---------------- */

  useEffect(() => {
    if (loading || !session || !sessionId) return;
    persist(sessionId, { messages, feedback });
  }, [messages, feedback, loading, session, sessionId]);

  /* ---------------- scrolling & focus ---------------- */

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, submitting]);

  useEffect(() => {
    if (feedback) {
      reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [feedback]);

  useEffect(() => {
    if (!submitting && session && !session.completed) {
      textareaRef.current?.focus();
    }
  }, [submitting, session]);

  /* Grow the textarea with its content (capped). */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [answer, session?.completed]);

  /* ---------------- actions ---------------- */

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = answer.trim();
    if (!trimmed || submitting || !session || session.completed) return;

    const candidateMessage: Message = {
      id: uid(),
      role: "candidate",
      content: trimmed,
    };

    setMessages((current) => [...current, candidateMessage]);
    setAnswer("");
    setError("");
    setSubmitting(true);

    try {
      const result = await requestJson<AnswerResponse>(
        `/interviews/${encodeURIComponent(sessionId)}/answer`,
        { method: "POST", body: { answer: trimmed } },
      );

      setMessages((current) => [
        ...current,
        { id: uid(), role: "interviewer", content: result.message },
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
          : current,
      );

      if (result.finished) setFeedback(result.feedback ?? null);
    } catch (err) {
      /* Roll back so the candidate can edit and resend. */
      setMessages((current) =>
        current.filter((message) => message.id !== candidateMessage.id),
      );
      setAnswer(trimmed);
      setError(
        err instanceof Error
          ? err.message
          : "Your answer could not be submitted. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function handleExit() {
    const inProgress =
      session &&
      !session.completed &&
      messages.some((message) => message.role === "candidate");

    if (
      inProgress &&
      !window.confirm(
        "Leave this interview? You can come back to it from this page's link.",
      )
    ) {
      return;
    }

    router.push("/start");
  }

  /* ---------------- loading / error screens ---------------- */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-6 text-zinc-100">
        <div
          role="status"
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400 motion-reduce:animate-none" />
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
          <p role="alert" className="mt-3 text-sm leading-6 text-zinc-400">
            {error}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => setAttempt((n) => n + 1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
            <button
              onClick={() => router.push("/start")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to setup
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------- main screen ---------------- */

  const completed = Boolean(session?.completed);

  return (
    <main className="flex min-h-screen flex-col bg-[#09090b] text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#09090b]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={handleExit}
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
            <span
              className={`h-1.5 w-1.5 rounded-full bg-emerald-400 ${
                completed ? "" : "animate-pulse motion-reduce:animate-none"
              }`}
            />
            <span className="text-xs font-medium text-emerald-300">
              {completed ? "Completed" : "In progress"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-8 sm:px-6 sm:pt-10">
        {/* Intro */}
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
              <span className="self-start rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300 sm:self-auto">
                {formatLabel(session.difficulty)} difficulty
              </span>
            )}
          </div>

          {session?.repository_url && (
            <div className="mt-7 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="truncate text-xs text-zinc-500">
                Repository:{" "}
                <span className="font-mono text-zinc-400">
                  {session.repository_url}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Conversation */}
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

          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-label="Interview conversation"
            className="max-h-[520px] min-h-[300px] space-y-6 overflow-y-auto p-4 sm:p-6"
          >
            {messages.map((message) => {
              const isCandidate = message.role === "candidate";

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    isCandidate ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isCandidate && <InterviewerAvatar />}

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
                    <p className="whitespace-pre-wrap break-words text-sm leading-7">
                      {message.content}
                    </p>
                  </div>
                </div>
              );
            })}

            {submitting && <TypingIndicator />}
          </div>

          {error && session && (
            <div
              role="alert"
              className="mx-4 mb-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300 sm:mx-6"
            >
              {error}
            </div>
          )}

          {!completed ? (
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
                  onKeyDown={handleKeyDown}
                  placeholder="Explain your approach, reasoning, and technical decisions..."
                  rows={3}
                  maxLength={20000}
                  disabled={submitting}
                  className="block min-h-[96px] w-full resize-none bg-transparent px-4 py-4 text-sm leading-7 text-zinc-200 outline-none placeholder:text-zinc-600 disabled:opacity-60"
                />

                <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-3">
                  <span className="text-[11px] text-zinc-600">
                    <span className="hidden sm:inline">
                      Press{" "}
                      <kbd className="rounded border border-white/[0.1] px-1 font-mono text-[10px] text-zinc-500">
                        Ctrl
                      </kbd>{" "}
                      +{" "}
                      <kbd className="rounded border border-white/[0.1] px-1 font-mono text-[10px] text-zinc-500">
                        Enter
                      </kbd>{" "}
                      to send.{" "}
                    </span>
                    Be clear and explain your reasoning.
                  </span>

                  <button
                    type="submit"
                    disabled={!answer.trim() || submitting}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                        Sending
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
                    {feedback !== null
                      ? "Your interview has ended. Your report is below."
                      : "Your interview has ended. The report isn't available for this session."}
                  </p>
                </div>
              </div>

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

        {/* Report: outside the chat card so it gets the full width */}
        {completed && feedback !== null && (
          <div ref={reportRef} className="mt-8 scroll-mt-24">
            <FeedbackReport feedback={feedback} />
          </div>
        )}

        {!completed && (
          <p className="mt-5 text-center text-xs leading-5 text-zinc-600">
            Take your time. Focus on explaining why you made each technical
            decision.
          </p>
        )}
      </div>
    </main>
  );
}