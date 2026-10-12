
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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

const MODEL = "gemini-3.5-flash-lite";

async function generateJSON<T>(prompt: string): Promise<T> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error("The AI returned an empty response.");
  }

  return JSON.parse(response.text) as T;
}

export async function generateInterviewQuestion(
  topic: string,
  difficulty: string,
  previousQuestions: string[] = [],
): Promise<InterviewQuestion> {
  const prompt = `
You are a technical interviewer for software developer candidates.

Generate ONE original interview question.
Topic: ${topic}
Difficulty: ${difficulty}
Previously asked questions: ${JSON.stringify(previousQuestions)}

Avoid repeating previous questions.
Return only JSON with this structure:
{
  "question": "The interview question",
  "expectedTopics": ["concept 1", "concept 2"]
}
`;

  return generateJSON<InterviewQuestion>(prompt);
}

export async function evaluateInterviewAnswer(
  topic: string,
  difficulty: string,
  question: string,
  answer: string,
): Promise<InterviewEvaluation> {
  const prompt = `
You are an experienced technical interviewer.

Evaluate the candidate's answer fairly.
Topic: ${topic}
Difficulty: ${difficulty}
Question: ${question}
Candidate's answer: ${answer}

Score the answer from 0 to 100 based on technical correctness,
completeness, clarity, and relevance.

Return only JSON with this structure:
{
  "score": 0,
  "feedback": "Overall feedback",
  "strengths": ["strength 1"],
  "improvements": ["improvement 1"],
  "modelAnswer": "A strong example answer"
}
`;

  const result = await generateJSON<InterviewEvaluation>(prompt);

  if (
    typeof result.score !== "number" ||
    !Number.isFinite(result.score) ||
    result.score < 0 ||
    result.score > 100 ||
    typeof result.feedback !== "string" ||
    !Array.isArray(result.strengths) ||
    !Array.isArray(result.improvements) ||
    typeof result.modelAnswer !== "string"
  ) {
    throw new Error("The AI returned an invalid interview evaluation.");
  }

  return result;
}
