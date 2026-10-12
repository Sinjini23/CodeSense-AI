import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import {
  Activity,
  ArrowRight,
  Braces,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Code2,
  Copy,
  FileCode2,
  FileUp,
  GraduationCap,
  History,
  Layers3,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import {
  checkBackendHealth,
  reviewCode,
  reviewCodeWithAI,
  type AIReviewFinding,
  type ReviewFinding,
} from "../services/reviewService";
import MockInterview from "./MockInterview";

type Language = "javascript" | "typescript" | "typescriptreact";
type Page = "review" | "interview";

interface ReviewHistoryItem {
  id: string;
  filename: string;
  language: Language;
  code: string;
  findings: AIReviewFinding[];
  createdAt: string;
}

const LANGUAGE_OPTIONS: {
  label: string;
  value: Language;
  extension: string;
}[] = [
  { label: "JavaScript", value: "javascript", extension: "js" },
  { label: "TypeScript", value: "typescript", extension: "ts" },
  { label: "React / TSX", value: "typescriptreact", extension: "tsx" },
];

const SAMPLE_CODE: Record<Language, string> = {
  javascript: `function greet(name) {\n  console.log("Hello, " + name);\n}\n\ngreet("Developer");`,
  typescript: `interface User {\n  name: string;\n}\n\nfunction greet(user: User): string {\n  return \`Hello, \${user.name}!\`;\n}\n\nconsole.log(greet({ name: "Developer" }));`,
  typescriptreact: `import { useState } from "react";\n\nexport default function Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <button onClick={() => setCount((current) => current + 1)}>\n      Count: {count}\n    </button>\n  );\n}`,
};

const MAX_FILE_SIZE = 1024 * 1024;

function getLanguageFromFilename(filename: string): Language | null {
  if (/\.tsx$/i.test(filename)) return "typescriptreact";
  if (/\.jsx$/i.test(filename)) return "javascript";
  if (/\.ts$/i.test(filename)) return "typescript";
  if (/\.js$/i.test(filename)) return "javascript";
  return null;
}

const panelClass =
  "rounded-2xl border border-white/[0.09] bg-[#11151F] shadow-[0_18px_60px_rgba(0,0,0,0.16)]";


export default function Dashboard() {
  const [page, setPage] = useState<Page>("review");
  const [language, setLanguage] = useState<Language>("typescriptreact");
  const [code, setCode] = useState(SAMPLE_CODE.typescriptreact);
  const [previousCode, setPreviousCode] = useState<string | null>(null);
  const [filename, setFilename] = useState("example.tsx");
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [findings, setFindings] = useState<ReviewFinding[]>([]);
  const [aiFindings, setAiFindings] = useState<AIReviewFinding[]>([]);
  const [reviewMessage, setReviewMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error">("info");
  const [aiError, setAiError] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isAIReviewing, setIsAIReviewing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<
    "all" | "error" | "warning"
  >("all");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryItem[]>(
    () => {
      try {
        const saved = localStorage.getItem("codesense-review-history");
        if (!saved) return [];
        const parsed: unknown = JSON.parse(saved);
        return Array.isArray(parsed) ? (parsed as ReviewHistoryItem[]) : [];
      } catch {
        return [];
      }
    },
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedLanguage = LANGUAGE_OPTIONS.find(
    (item) => item.value === language,
  )!;
  const filteredFindings = findings.filter(
    (finding) =>
      severityFilter === "all" || finding.severity === severityFilter,
  );
  const errorCount = aiFindings.filter(
    (item) => item.severity === "error",
  ).length;
  const warningCount = aiFindings.filter(
    (item) => item.severity === "warning",
  ).length;
  const infoCount = aiFindings.filter(
    (item) => item.severity === "info",
  ).length;

  useEffect(() => {
    try {
      localStorage.setItem(
        "codesense-review-history",
        JSON.stringify(reviewHistory),
      );
    } catch {
      // Browser storage can be unavailable in private or restricted contexts.
    }
  }, [reviewHistory]);

  useEffect(() => {
    let cancelled = false;
    checkBackendHealth()
      .then(() => {
        if (!cancelled) setBackendStatus("connected");
      })
      .catch(() => {
        if (!cancelled) setBackendStatus("disconnected");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleLanguageChange(value: Language) {
    setLanguage(value);
    setCode(SAMPLE_CODE[value]);
    setFilename(
      `example.${LANGUAGE_OPTIONS.find((item) => item.value === value)!.extension}`,
    );
    setReviewMessage("");
    setAiError("");
    setFindings([]);
    setAiFindings([]);
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const inferredLanguage = getLanguageFromFilename(file.name);
    if (!inferredLanguage) {
      setMessageType("error");
      setReviewMessage(
        "Unsupported file type. Upload a .js, .jsx, .ts, or .tsx file.",
      );
      event.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessageType("error");
      setReviewMessage("File size must be 1 MB or less.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLanguage(inferredLanguage);
        setCode(reader.result);
        setFilename(file.name);
        setReviewMessage("");
        setFindings([]);
        setAiFindings([]);
        setAiError("");
      } else {
        setMessageType("error");
        setReviewMessage("Unable to read this file. Please try again.");
      }
    };
    reader.onerror = () => {
      setMessageType("error");
      setReviewMessage("Unable to read this file. Please try again.");
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  async function handleReview() {
    if (!code.trim()) {
      setReviewMessage(
        "Add some code to the workspace before running a review.",
      );
      setMessageType("error");
      return;
    }
    setIsReviewing(true);
    setFindings([]);
    setReviewMessage("");
    try {
      const result = await reviewCode(code, language);
      setFindings(result.review.findings);
      setReviewMessage(
        `Static analysis complete · ${result.review.findings.length} issue(s) found.`,
      );
      setMessageType("info");
    } catch (error) {
      setReviewMessage(
        error instanceof Error
          ? error.message
          : "Unable to review code. Try again.",
      );
      setMessageType("error");
    } finally {
      setIsReviewing(false);
    }
  }

  async function handleAIReview() {
    if (!code.trim()) {
      setAiError("Add some code to the workspace before running an AI review.");
      setAiFindings([]);
      return;
    }
    setIsAIReviewing(true);
    setAiError("");
    setAiFindings([]);
    try {
      const result = await reviewCodeWithAI(code, language);
      setAiFindings(result.findings);
      setReviewHistory((current) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            filename,
            language,
            code,
            findings: result.findings,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 20),
      );
    } catch (error) {
      setAiError(
        error instanceof Error ? error.message : "AI review failed. Try again.",
      );
    } finally {
      setIsAIReviewing(false);
    }
  }

  function handleClearCode() {
    setCode("");
    setFilename(`example.${selectedLanguage.extension}`);
    setFindings([]);
    setAiFindings([]);
    setReviewMessage("");
    setAiError("");
  }

  function restoreReview(item: ReviewHistoryItem) {
    setCode(item.code);
    setLanguage(item.language);
    setFilename(item.filename);
    setAiFindings(item.findings);
    setFindings([]);
    setAiError("");
    setPreviousCode(null);
    setReviewMessage("Saved AI review restored.");
    setMessageType("info");
    setPage("review");
  }

  if (page === "interview") {
    return (
      <main className="min-h-screen bg-[#090B12] text-slate-100">
        <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#0C0F18]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 sm:px-8">
            <button
              onClick={() => setPage("review")}
              className="flex items-center gap-3 text-left"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/25">
                <Code2 size={21} />
              </span>
              <span>
                <span className="block text-sm font-bold tracking-tight">
                  CodeSense <span className="text-indigo-400">AI</span>
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Developer workspace
                </span>
              </span>
            </button>
            <nav className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
              <button
                onClick={() => setPage("review")}
                className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/[0.06] hover:text-white sm:px-4"
              >
                Code Review
              </button>
              <button
                onClick={() => setPage("interview")}
                className="rounded-lg bg-indigo-500/15 px-3 py-2 text-sm font-medium text-indigo-200 ring-1 ring-indigo-400/20 sm:px-4"
              >
                Mock Interview
              </button>
            </nav>
          </div>
        </header>
        <MockInterview />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090B12] text-slate-100 selection:bg-indigo-500/30">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0C0F18]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/25">
              <Code2 size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight sm:text-lg">
                CodeSense <span className="text-indigo-400">AI</span>
              </h1>
              <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
                A sharper workspace for better code
              </p>
            </div>
          </div>
          <div
            className={`hidden items-center gap-2 rounded-full border px-3 py-2 sm:flex ${backendStatus === "connected" ? "border-emerald-400/20 bg-emerald-400/[0.06]" : backendStatus === "checking" ? "border-amber-400/20 bg-amber-400/[0.06]" : "border-rose-400/20 bg-rose-400/[0.06]"}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${backendStatus === "connected" ? "bg-emerald-400" : backendStatus === "checking" ? "animate-pulse bg-amber-400" : "bg-rose-400"}`}
            />
            <span
              className={`text-xs font-medium ${backendStatus === "connected" ? "text-emerald-300" : backendStatus === "checking" ? "text-amber-300" : "text-rose-300"}`}
            >
              {backendStatus === "connected"
                ? "API online"
                : backendStatus === "checking"
                  ? "Checking API"
                  : "API offline"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/[0.07] px-4 py-6 lg:block">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
            Workspace
          </p>
          <div className="mt-3 space-y-1">
            <button
              onClick={() => setPage("review")}
              className="flex w-full items-center gap-3 rounded-xl border border-indigo-400/15 bg-indigo-400/[0.08] px-3 py-3 text-left text-sm font-medium text-indigo-200"
            >
              <Braces size={17} /> Code review{" "}
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-300" />
            </button>
            <button
              onClick={() => setPage("interview")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <GraduationCap size={17} /> Mock interview{" "}
              <ArrowRight size={14} className="ml-auto opacity-50" />
            </button>
            <button
              onClick={() => setHistoryOpen((open) => !open)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-white/[0.04] hover:text-white ${historyOpen ? "bg-white/[0.05] text-white" : "text-slate-400"}`}
            >
              <History size={17} /> Review history{" "}
              <span className="ml-auto rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
                {reviewHistory.length}
              </span>
            </button>
          </div>
          <div className="mt-8 rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.12] via-[#11151F] to-violet-500/[0.06] p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-300">
              <WandSparkles size={18} />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-100">
              Less guessing.
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Understand the why behind every finding and suggested fix.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 px-2 text-xs text-slate-600">
            <Activity size={14} /> Local development workspace
          </div>
        </aside>

        <div className="min-w-0 px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
          <div className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-indigo-300">
                <Sparkles size={13} /> Code intelligence workspace
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Make every line{" "}
                <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
                  count.
                </span>
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                Inspect your code, uncover hidden issues, and turn AI
                suggestions into practical improvements.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setHistoryOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <History size={15} /> History{" "}
                <ChevronDown
                  size={14}
                  className={`transition ${historyOpen ? "rotate-180" : ""}`}
                />
              </button>
              {/* <button
                onClick={() => setPage("interview")}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-400/[0.08] px-3.5 py-2.5 text-sm font-medium text-indigo-200 transition hover:bg-indigo-400/[0.14]"
              >
                <GraduationCap size={16} /> Practice interview
              </button> */}
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.08] bg-[#11151F] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Workspace language
                </span>
                <Code2 size={15} className="text-indigo-300" />
              </div>
              <p className="mt-3 text-base font-semibold text-slate-100">
                {selectedLanguage.label}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                .{selectedLanguage.extension} source file
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#11151F] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Source size</span>
                <Layers3 size={15} className="text-violet-300" />
              </div>
              <p className="mt-3 text-base font-semibold text-slate-100">
                {code.split("\n").length}{" "}
                <span className="text-sm font-normal text-slate-400">
                  lines
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {code.length.toLocaleString()} characters
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#11151F] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Latest AI review</span>
                <Sparkles size={15} className="text-fuchsia-300" />
              </div>
              <p className="mt-3 text-base font-semibold text-slate-100">
                {aiFindings.length
                  ? `${aiFindings.length} finding${aiFindings.length === 1 ? "" : "s"}`
                  : "Not run yet"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {aiFindings.length
                  ? `${errorCount} critical · ${warningCount} warnings`
                  : "Run AI review to inspect this file"}
              </p>
            </div>
          </div>

          {historyOpen && (
            <section className={`${panelClass} mb-6 p-5 sm:p-6`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">
                    Recent AI reviews
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Saved in this browser · up to 20 reviews
                  </p>
                </div>
                <button
                  onClick={() => setHistoryOpen(false)}
                  aria-label="Close history"
                  className="rounded-lg p-2 text-slate-500 hover:bg-white/[0.06] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              {reviewHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                  <History size={20} className="mx-auto text-slate-600" />
                  <p className="mt-2 text-sm text-slate-400">
                    Your reviews will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reviewHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-black/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {item.filename}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.language} · {item.findings.length} finding
                          {item.findings.length === 1 ? "" : "s"} ·{" "}
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => restoreReview(item)}
                          className="rounded-lg border border-indigo-400/20 px-3 py-2 text-xs font-medium text-indigo-200 hover:bg-indigo-400/10"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() =>
                            setReviewHistory((current) =>
                              current.filter((entry) => entry.id !== item.id),
                            )
                          }
                          aria-label={`Delete review ${item.filename}`}
                          className="rounded-lg border border-white/10 p-2 text-slate-500 hover:border-rose-400/20 hover:text-rose-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)]">
            <section className={`${panelClass} min-w-0 overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-700/30 text-slate-300">
                    <FileCode2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Source workspace
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Edit or upload a file to get started
                    </p>
                  </div>
                </div>
                <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {selectedLanguage.extension}
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {filename}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedLanguage.label} · {code.split("\n").length} lines
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".js,.jsx,.ts,.tsx"
                      onChange={handleFileUpload}
                      className="hidden"
                      aria-label="Upload source code file"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-indigo-400/30 hover:text-white"
                    >
                      <FileUp size={14} /> Upload file
                    </button>
                    <select
                      aria-label="Programming language"
                      value={language}
                      onChange={(event) =>
                        handleLanguageChange(event.target.value as Language)
                      }
                      className="rounded-lg border border-white/10 bg-[#191E2A] px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-400"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="typescriptreact">React / TSX</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/[0.09] bg-[#090C13]">
                  <div className="flex items-center gap-2 border-b border-white/[0.07] bg-[#0D111B] px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                    <span className="ml-2 min-w-0 truncate text-xs text-slate-500">
                      {filename}
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-600">
                      Monaco editor
                    </span>
                  </div>
                  <Editor
                    height="420px"
                    language={language}
                    value={code}
                    onChange={(value) => setCode(value ?? "")}
                    theme="vs-dark"
                    loading={
                      <div className="flex h-[420px] items-center justify-center text-sm text-slate-500">
                        <LoaderCircle size={16} className="mr-2 animate-spin" />{" "}
                        Loading editor
                      </div>
                    }
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: "on",
                      padding: { top: 18, bottom: 18 },
                      tabSize: 2,
                      renderLineHighlight: "all",
                      scrollbar: {
                        verticalScrollbarSize: 7,
                        horizontalScrollbarSize: 7,
                      },
                    }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {code.length.toLocaleString()} characters{" "}
                    <span className="mx-1.5 text-slate-700">/</span> local
                    editor
                  </p>
                  <button
                    onClick={handleClearCode}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition hover:bg-white/[0.04] hover:text-rose-300"
                  >
                    <Trash2 size={13} /> Clear editor
                  </button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleReview}
                    disabled={isReviewing || isAIReviewing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isReviewing ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Bug size={16} />
                    )}
                    {isReviewing ? "Analyzing source…" : "Run static analysis"}
                    <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handleAIReview}
                    disabled={isAIReviewing || isReviewing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAIReviewing ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    {isAIReviewing ? "AI is reviewing…" : "Run AI code review"}
                    <ArrowRight size={15} />
                  </button>
                </div>
                {reviewMessage && (
                  <div
                    role="status"
                    className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm leading-6 ${messageType === "error" ? "border-rose-400/20 bg-rose-400/[0.06] text-rose-200" : "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-200"}`}
                  >
                    {messageType === "error" ? (
                      <CircleAlert size={16} className="mt-1 shrink-0" />
                    ) : (
                      <CheckCircle2 size={16} className="mt-1 shrink-0" />
                    )}
                    <p>{reviewMessage}</p>
                  </div>
                )}
                {aiError && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm leading-6 text-rose-200"
                  >
                    <CircleAlert size={16} className="mt-1 shrink-0" />
                    <p>{aiError}</p>
                  </div>
                )}
                <p className="mt-4 text-[11px] leading-5 text-slate-600">
                  Code is sent to your configured backend when you run an
                  analysis. Do not submit secrets or code you are not authorized
                  to share.
                </p>
              </div>
            </section>

            <aside className="space-y-4">
              <section className={`${panelClass} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Review snapshot
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      What needs attention?
                    </h3>
                  </div>
                  <span className="rounded-xl bg-indigo-400/10 p-2.5 text-indigo-300">
                    <Activity size={18} />
                  </span>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-rose-400/10 bg-rose-400/[0.04] px-3.5 py-3">
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />{" "}
                      Errors
                    </span>
                    <span className="text-sm font-semibold text-rose-200">
                      {errorCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-amber-400/10 bg-amber-400/[0.04] px-3.5 py-3">
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-amber-300" />{" "}
                      Warnings
                    </span>
                    <span className="text-sm font-semibold text-amber-200">
                      {warningCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-sky-400/10 bg-sky-400/[0.04] px-3.5 py-3">
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-sky-300" />{" "}
                      Suggestions
                    </span>
                    <span className="text-sm font-semibold text-sky-200">
                      {infoCount}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Counts update after an AI review finishes. Always verify
                  generated suggestions before applying them.
                </p>
              </section>
              <section className={`${panelClass} p-5`}>
                <div className="flex items-center gap-2">
                  <Zap size={17} className="text-amber-300" />
                  <h3 className="text-sm font-semibold text-white">
                    A better review loop
                  </h3>
                </div>
                <div className="mt-4 space-y-4">
                  <div className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-xs font-semibold text-slate-300">
                      01
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        Inspect
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Run static analysis to catch common issues quickly.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-xs font-semibold text-slate-300">
                      02
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        Understand
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Use AI explanations to understand impact and trade-offs.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-xs font-semibold text-slate-300">
                      03
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        Improve
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Compare suggested code before applying changes.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPage("interview")}
                  className="mt-5 flex w-full items-center justify-between rounded-xl border border-indigo-400/20 bg-indigo-400/[0.06] px-3.5 py-3 text-left text-sm font-medium text-indigo-200 transition hover:bg-indigo-400/[0.12]"
                >
                  Practice for an interview <ArrowRight size={15} />
                </button>
              </section>
            </aside>
          </div>

          {findings.length > 0 && (
            <section className={`${panelClass} mt-6 p-5 sm:p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Static analysis
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    Code findings{" "}
                    <span className="ml-1 text-sm font-normal text-slate-500">
                      ({findings.length})
                    </span>
                  </h3>
                </div>
                <div className="flex gap-1 rounded-xl border border-white/10 bg-black/10 p-1">
                  {(["all", "error", "warning"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSeverityFilter(filter)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${severityFilter === filter ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                      {filter === "all" ? "All" : `${filter}s`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {filteredFindings.map((finding, index) => (
                  <article
                    key={`${finding.ruleId}-${finding.line}-${finding.column}-${index}`}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${finding.severity === "error" ? "bg-rose-400/10 text-rose-300" : "bg-amber-400/10 text-amber-200"}`}
                      >
                        {finding.severity}
                      </span>
                      <span className="text-xs text-slate-500">
                        Line {finding.line}, column {finding.column}
                      </span>
                      <span className="ml-auto text-xs text-slate-600">
                        {finding.ruleId}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-200">
                      {finding.message}
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg bg-white/[0.025] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                          Why it matters
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {finding.explanation}
                        </p>
                      </div>
                      <div className="rounded-lg border border-emerald-400/10 bg-emerald-400/[0.035] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                          Suggested fix
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {finding.suggestedFix}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {aiFindings.length > 0 && (
            <section className={`${panelClass} mt-6 overflow-hidden`}>
              <div className="border-b border-white/[0.07] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300">
                      <Sparkles size={20} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-300">
                        Gemini analysis
                      </p>
                      <h3 className="mt-1 text-xl font-semibold text-white">
                        AI review findings
                      </h3>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300">
                    {aiFindings.length} finding
                    {aiFindings.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    {
                      label: "Errors",
                      count: errorCount,
                      cls: "border-rose-400/15 bg-rose-400/[0.05] text-rose-200",
                    },
                    {
                      label: "Warnings",
                      count: warningCount,
                      cls: "border-amber-400/15 bg-amber-400/[0.05] text-amber-200",
                    },
                    {
                      label: "Suggestions",
                      count: infoCount,
                      cls: "border-sky-400/15 bg-sky-400/[0.05] text-sky-200",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-xl border p-3 ${item.cls}`}
                    >
                      <p className="text-2xl font-semibold">{item.count}</p>
                      <p className="mt-1 text-xs opacity-80">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4 p-4 sm:p-6">
                {aiFindings.map((finding, index) => (
                  <article
                    key={`${finding.category}-${index}`}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-violet-400/10 px-2.5 py-1 text-xs font-medium capitalize text-violet-200">
                        {finding.category}
                      </span>
                      <span
                        className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase ${finding.severity === "error" ? "bg-rose-400/10 text-rose-300" : finding.severity === "warning" ? "bg-amber-400/10 text-amber-200" : "bg-sky-400/10 text-sky-200"}`}
                      >
                        {finding.severity}
                      </span>
                    </div>
                    <h4 className="mt-3 text-sm font-semibold leading-6 text-slate-100">
                      {finding.message}
                    </h4>
                    <div className="mt-4 rounded-lg bg-white/[0.025] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                        Why it matters
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {finding.explanation}
                      </p>
                    </div>
                    <div className="mt-3 rounded-lg border border-emerald-400/10 bg-emerald-400/[0.035] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                        Suggested improvement
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {finding.suggestedFix}
                      </p>
                    </div>
                    {finding.suggestedCode && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-violet-400/15">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-[#0D111B] px-3 py-2.5">
                          <span className="text-xs font-medium text-violet-200">
                            Suggested code
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                void navigator.clipboard.writeText(
                                  finding.suggestedCode!,
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06]"
                            >
                              <Copy size={12} /> Copy
                            </button>
                            <button
                              disabled={
                                !finding.originalCode ||
                                !code.includes(finding.originalCode)
                              }
                              onClick={() => {
                                if (
                                  !finding.originalCode ||
                                  !finding.suggestedCode
                                )
                                  return;
                                const firstIndex = code.indexOf(
                                  finding.originalCode,
                                );
                                if (firstIndex === -1) return;
                                if (
                                  code.indexOf(
                                    finding.originalCode,
                                    firstIndex + finding.originalCode.length,
                                  ) !== -1
                                ) {
                                  setAiError(
                                    "This snippet appears more than once. Apply the fix manually to avoid changing the wrong location.",
                                  );
                                  return;
                                }
                                setPreviousCode(code);
                                setCode(
                                  code.slice(0, firstIndex) +
                                    finding.suggestedCode +
                                    code.slice(
                                      firstIndex + finding.originalCode.length,
                                    ),
                                );
                                setAiError("");
                                setReviewMessage(
                                  "Suggested change applied. Review it in the editor before using it.",
                                );
                                setMessageType("info");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-40"
                            >
                              <Check size={12} /> Apply fix
                            </button>
                            <button
                              disabled={previousCode === null}
                              onClick={() => {
                                if (previousCode === null) return;
                                setCode(previousCode);
                                setPreviousCode(null);
                                setReviewMessage("Previous code restored.");
                                setMessageType("info");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06] disabled:opacity-40"
                            >
                              <RotateCcw size={12} /> Undo
                            </button>
                          </div>
                        </div>
                        {finding.originalCode ? (
                          <div className="p-2">
                            <DiffEditor
                              height="220px"
                              language={language}
                              original={finding.originalCode}
                              modified={finding.suggestedCode}
                              theme="vs-dark"
                              options={{
                                readOnly: true,
                                renderSideBySide: true,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                wordWrap: "on",
                                renderOverviewRuler: false,
                              }}
                            />
                          </div>
                        ) : (
                          <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-300">
                            <code>{finding.suggestedCode}</code>
                          </pre>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {!aiError && !isAIReviewing && aiFindings.length === 0 && (
            <section className="mt-6 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] px-5 py-8 text-center sm:py-10">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl border border-indigo-400/15 bg-indigo-400/[0.06] text-indigo-300">
                <Sparkles size={20} />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-slate-200">
                Ready when you are
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Run an AI review to get contextual explanations, risk levels,
                and suggested code improvements for this file.
              </p>
              <button
                onClick={handleAIReview}
                disabled={isReviewing || isAIReviewing}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
              >
                <Sparkles size={15} /> Start AI review
              </button>
            </section>
          )}

          <footer className="mt-8 flex flex-col gap-2 border-t border-white/[0.07] py-5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              CodeSense AI <span className="mx-1.5 text-slate-700">/</span>{" "}
              Built for thoughtful code reviews
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 size={12} /> Reviews are saved locally in this browser
            </span>
          </footer>
        </div>
      </div>
    </main>
  );
}
