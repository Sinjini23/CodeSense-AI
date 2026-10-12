
import express from 'express'
import cors from 'cors'
import { analyzeCode } from './analyzer'
import { reviewCodeWithAI } from './aiService'
import {
  generateInterviewQuestion,
  evaluateInterviewAnswer,
} from "./mockInterviewService";


const app = express()
const PORT = Number(process.env.PORT) || 4000

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'CodeSense AI backend is running',
  })
})

app.post('/api/review', async (req, res) => {
  try {
    const { code, language } = req.body

    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        error: 'Code must be a non-empty string.',
      })
    }

    const supportedLanguages = [
      'javascript',
      'typescript',
      'typescriptreact',
    ]

    if (!supportedLanguages.includes(language)) {
      return res.status(400).json({
        error: 'Unsupported language.',
      })
    }

    const extension =
      language === 'typescriptreact'
        ? 'tsx'
        : language === 'typescript'
          ? 'ts'
          : 'js'

    const findings = await analyzeCode(
      code,
      `submitted-code.${extension}`,
    )

    return res.json({
      success: true,
      message: 'Code analysis completed.',
      review: {
        language,
        linesOfCode: code.split('\n').length,
        findings,
      },
    })
  } catch (error) {
    console.error('Code review failed:', error)

    return res.status(500).json({
      error: 'Failed to analyze code.',
    })
  }
})

app.post('/api/ai-review-test', async (req, res) => {
  try {
    const { code, language } = req.body

    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        error: 'Code must be a non-empty string.',
      })
    }

    if (
      !['javascript', 'typescript', 'typescriptreact'].includes(language)
    ) {
      return res.status(400).json({
        error: 'Unsupported language.',
      })
    }

    const findings = await reviewCodeWithAI(code, language)

    return res.json({
      success: true,
      message: 'GenAI review completed.',
      findings,
    })
  } catch (error) {
    console.error('GenAI review failed:', error)

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'GenAI review failed.',
    })
  }
})

app.post("/api/mock-interview/question", async (req, res) => {
  try {
    const { topic, difficulty, previousQuestions = [] } = req.body;

    const allowedTopics = [
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "GenAI",
    ];

    const allowedDifficulties = ["Beginner", "Intermediate", "Advanced"];

    if (!allowedTopics.includes(topic)) {
      return res.status(400).json({ error: "Unsupported interview topic." });
    }

    if (!allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({ error: "Unsupported difficulty." });
    }

    if (
      !Array.isArray(previousQuestions) ||
      !previousQuestions.every((q: unknown) => typeof q === "string")
    ) {
      return res.status(400).json({ error: "Invalid previous questions." });
    }

    const question = await generateInterviewQuestion(
      topic,
      difficulty,
      previousQuestions,
    );

    return res.json({ success: true, ...question });
  } catch (error) {
    console.error("Question generation failed:", error);

    return res.status(500).json({
      error: "Failed to generate an interview question.",
    });
  }
});

app.post("/api/mock-interview/evaluate", async (req, res) => {
  try {
    const { topic, difficulty, question, answer } = req.body;

    if (
      typeof topic !== "string" ||
      typeof difficulty !== "string" ||
      typeof question !== "string" ||
      typeof answer !== "string" ||
      !question.trim() ||
      !answer.trim()
    ) {
      return res.status(400).json({
        error: "Topic, difficulty, question, and a non-empty answer are required.",
      });
    }

    if (
      !["JavaScript", "TypeScript", "React", "Node.js", "GenAI"].includes(topic) ||
      !["Beginner", "Intermediate", "Advanced"].includes(difficulty)
    ) {
      return res.status(400).json({ error: "Invalid interview settings." });
    }

    const evaluation = await evaluateInterviewAnswer(
      topic,
      difficulty,
      question,
      answer,
    );

    return res.json({ success: true, evaluation });
  } catch (error) {
    console.error("Answer evaluation failed:", error);

    return res.status(500).json({
      error: "Failed to evaluate the interview answer.",
    });
  }
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`CodeSense AI server running on port ${PORT}`)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})
