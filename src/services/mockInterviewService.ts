
const API_BASE_URL = "http://localhost:4000";

export type InterviewTopic =
  | "JavaScript"
  | "TypeScript"
  | "React"
  | "Node.js"
  | "GenAI";

export type InterviewDifficulty =
  | "Beginner"
  | "Intermediate"
  | "Advanced";

export interface InterviewQuestion {
  question: string;
  expectedTopics: string[];
}

export interface InterviewEvaluation {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
}

async function postJSON<T>(
  endpoint: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "The request failed.");
  }

  return data as T;
}

export async function getInterviewQuestion(
  topic: InterviewTopic,
  difficulty: InterviewDifficulty,
  previousQuestions: string[] = [],
): Promise<InterviewQuestion> {
  const result = await postJSON<{
    success: boolean;
    question: string;
    expectedTopics: string[];
  }>("/api/mock-interview/question", {
    topic,
    difficulty,
    previousQuestions,
  });

  return {
    question: result.question,
    expectedTopics: result.expectedTopics,
  };
}

export async function submitInterviewAnswer(
  topic: InterviewTopic,
  difficulty: InterviewDifficulty,
  question: string,
  answer: string,
): Promise<InterviewEvaluation> {
  const result = await postJSON<{
    success: boolean;
    evaluation: InterviewEvaluation;
  }>("/api/mock-interview/evaluate", {
    topic,
    difficulty,
    question,
    answer,
  });

  return result.evaluation;
}
