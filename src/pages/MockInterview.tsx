
import { useState } from 'react';
import {
  getInterviewQuestion,
  submitInterviewAnswer,
  type InterviewTopic,
  type InterviewDifficulty,
  type InterviewEvaluation,
} from '../services/mockInterviewService';

const TOPICS: InterviewTopic[] = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'GenAI',
];

const DIFFICULTIES: InterviewDifficulty[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
];

export default function MockInterview() {
  const [topic, setTopic] = useState<InterviewTopic>('React');
  const [difficulty, setDifficulty] =
    useState<InterviewDifficulty>('Intermediate');
  const [question, setQuestion] = useState('');
  const [expectedTopics, setExpectedTopics] = useState<string[]>([]);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] =
    useState<InterviewEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState('');

  async function startInterview() {
    setLoading(true);
    setError('');
    setQuestion('');
    setExpectedTopics([]);
    setPreviousQuestions([]);
    setAnswer('');
    setEvaluation(null);

    try {
      const result = await getInterviewQuestion(topic, difficulty, []);
      setQuestion(result.question);
      setExpectedTopics(result.expectedTopics);
      setPreviousQuestions([result.question]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not generate an interview question.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadNextQuestion() {
    setLoading(true);
    setError('');
    setAnswer('');
    setEvaluation(null);

    try {
      const result = await getInterviewQuestion(
        topic,
        difficulty,
        previousQuestions,
      );

      setQuestion(result.question);
      setExpectedTopics(result.expectedTopics);
      setPreviousQuestions((current) => [...current, result.question]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not generate the next question.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!answer.trim() || !question) {
      setError('Please write your answer before submitting.');
      return;
    }

    setIsEvaluating(true);
    setError('');
    setEvaluation(null);

    try {
      const result = await submitInterviewAnswer(
        topic,
        difficulty,
        question,
        answer,
      );
      setEvaluation(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not evaluate your answer.',
      );
    } finally {
      setIsEvaluating(false);
    }
  }

  const cardClass =
    'rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg';
  const labelClass = 'mb-2 block text-sm font-medium text-zinc-300';
  const selectClass =
    'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50';
  const buttonClass =
    'rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50';
  const secondaryButtonClass =
    'rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-3 font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-8 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="border-b border-zinc-800 pb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            CodeSense AI
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            AI Mock Interview
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
            Practice technical interviews, test your knowledge, and get
            AI-powered feedback on your answers.
          </p>
        </header>

        <section className={cardClass}>
          <h2 className="text-xl font-semibold">Interview setup</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Choose your subject and difficulty to begin.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="topic" className={labelClass}>
                Interview topic
              </label>
              <select
                id="topic"
                value={topic}
                onChange={(event) =>
                  setTopic(event.target.value as InterviewTopic)
                }
                disabled={loading || isEvaluating}
                className={selectClass}
              >
                {TOPICS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="difficulty" className={labelClass}>
                Difficulty level
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(
                    event.target.value as InterviewDifficulty,
                  )
                }
                disabled={loading || isEvaluating}
                className={selectClass}
              >
                {DIFFICULTIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={startInterview}
            disabled={loading || isEvaluating}
            className={`${buttonClass} mt-6`}
          >
            {loading && !question ? 'Generating question...' : 'Start Interview'}
          </button>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {question && (
          <section className={`${cardClass} space-y-6`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                {topic}
              </span>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300">
                {difficulty}
              </span>
              <span className="text-sm text-zinc-500">
                Question {previousQuestions.length}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-semibold">Your question</h2>
              <p className="mt-4 whitespace-pre-wrap leading-8 text-zinc-300">
                {question}
              </p>
            </div>

            {expectedTopics.length > 0 && (
              <details className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <summary className="cursor-pointer text-sm font-medium text-zinc-300">
                  Topics to consider
                </summary>
                <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-400">
                  {expectedTopics.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </details>
            )}

            <div>
              <label htmlFor="answer" className={labelClass}>
                Your answer
              </label>
              <textarea
                id="answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Explain your answer here..."
                rows={7}
                disabled={isEvaluating || loading}
                className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 p-4 leading-7 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
              />
              <p className="mt-2 text-xs text-zinc-500">
                Explain your reasoning and provide examples where appropriate.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={!answer.trim() || isEvaluating || loading}
                className={buttonClass}
              >
                {isEvaluating ? 'Evaluating answer...' : 'Submit Answer'}
              </button>

              <button
                type="button"
                onClick={loadNextQuestion}
                disabled={loading || isEvaluating}
                className={secondaryButtonClass}
              >
                {loading ? 'Generating...' : 'Next Question'}
              </button>
            </div>
          </section>
        )}

        {evaluation && (
          <section className={`${cardClass} space-y-6`}>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
              <div>
                <h2 className="text-2xl font-bold">Your evaluation</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  AI-generated feedback on your answer.
                </p>
              </div>

              <div className="min-w-28 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-center">
                <p className="text-sm font-medium text-blue-300">Score</p>
                <p className="mt-1 text-3xl font-bold text-white">
                  {evaluation.score}
                  <span className="text-lg text-zinc-400">/100</span>
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold">Feedback</h3>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-zinc-300">
                {evaluation.feedback}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-5">
                <h3 className="font-semibold text-emerald-300">
                  Strengths
                </h3>
                {evaluation.strengths.length > 0 ? (
                  <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-6 text-zinc-300">
                    {evaluation.strengths.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">
                    No strengths provided.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-amber-900/70 bg-amber-950/20 p-5">
                <h3 className="font-semibold text-amber-300">
                  Areas to improve
                </h3>
                {evaluation.improvements.length > 0 ? (
                  <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-6 text-zinc-300">
                    {evaluation.improvements.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">
                    No improvements provided.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="font-semibold text-blue-300">
                Example of a strong answer
              </h3>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-zinc-300">
                {evaluation.modelAnswer}
              </p>
            </div>

            <button
              type="button"
              onClick={loadNextQuestion}
              disabled={loading || isEvaluating}
              className={buttonClass}
            >
              {loading ? 'Generating...' : 'Continue Interview'}
            </button>
          </section>
        )}

        <footer className="pb-4 text-center text-xs text-zinc-600">
          CodeSense AI · Practice, learn, and improve
        </footer>
      </div>
    </main>
  );
}
