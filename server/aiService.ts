
import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
    throw new Error(
        'GEMINI_API_KEY is missing. Add it to your project-root .env file.',
    )
}

const ai = new GoogleGenAI({ apiKey })

export interface AIReviewFinding {
  category: 'bug' | 'quality' | 'security' | 'performance'
  severity: 'error' | 'warning' | 'info'
  message: string
  explanation: string
  suggestedFix: string
  originalCode: string | null
  suggestedCode: string | null
}

export async function reviewCodeWithAI(
    code: string,
    language: string,
): Promise<AIReviewFinding[]> {
    const startTime = Date.now()
    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
       contents: `
You are an experienced software engineer performing a careful code review.

Analyze the submitted ${language} code for:
- Potential logic bugs and incorrect behavior
- Code quality, readability, and maintainability
- Potential security vulnerabilities
- Performance problems and inefficient operations

Return ONLY a valid JSON array. Do not include Markdown fences, introductory text, or explanations outside the JSON.

Every finding MUST contain exactly these seven fields:

1. category: "bug", "quality", "security", or "performance"
2. severity: "error", "warning", or "info"
3. message: a short, descriptive issue title
4. explanation: explain why the issue matters
5. suggestedFix: a practical fix explained in plain language
6. originalCode: the exact code snippet from the submitted source that needs to be replaced, or null if it cannot be identified confidently
7. suggestedCode: the corrected replacement snippet, or null if a safe replacement cannot be determined

REVIEW RULES:
- Report only meaningful issues supported by the submitted code.
- Do not invent missing context, variables, functions, APIs, or surrounding code.
- Do not execute the submitted code.
- Do not report speculative problems as definite bugs.
- Use "error" for serious bugs or security issues.
- Use "warning" for potential bugs or risky patterns.
- Use "info" for minor quality improvements.
- Keep messages concise and explanations useful to developers.
- Every finding must include a practical suggestedFix.
- Return only valid JSON with double quotes around keys and string values.
- Do not invent line numbers or claim that you tested the code.
- If no meaningful issues are found, return [].

CODE REPLACEMENT RULES:
- originalCode must be copied verbatim from the submitted source code.
- Preserve the original snippet's punctuation and internal whitespace.
- originalCode must identify the smallest complete expression or code block that should be replaced.
- suggestedCode must be a replacement for originalCode, not an unrelated snippet.
- suggestedCode must contain code only, without Markdown fences or explanatory prose.
- Return the complete replacement for the selected original snippet, including any required closing parentheses, braces, or semicolons.
- Do not return the entire file when only a smaller section needs changing.
- Do not invent surrounding code or a replacement that depends on unavailable context.
- Before returning a finding, verify that originalCode occurs exactly in the submitted source.
- If the exact original snippet cannot be identified confidently, return null for BOTH originalCode and suggestedCode.
- If a safe replacement cannot be determined, return null for suggestedCode.
- If originalCode or suggestedCode is null, the frontend must not automatically apply that finding.

EXAMPLE OUTPUT:
[
  {
    "category": "bug",
    "severity": "error",
    "message": "Assignment used instead of comparison",
    "explanation": "The assignment changes the variable instead of checking whether the value is null.",
    "suggestedFix": "Use strict equality to compare the value.",
    "originalCode": "if (user = null) {\\n    return \\"No user\\";\\n  }",
    "suggestedCode": "if (user === null) {\\n    return \\"No user\\";\\n  }"
  },
  {
    "category": "security",
    "severity": "warning",
    "message": "Potential hardcoded credential",
    "explanation": "Hardcoded credentials can be exposed when source code is shared or committed.",
    "suggestedFix": "Move the credential into a secure environment variable and avoid logging it.",
    "originalCode": null,
    "suggestedCode": null
  }
]

Review the following code:

\`\`\`${language}
${code}
\`\`\`
`,
    })
    console.log(
        `Gemini response time: ${Date.now() - startTime}ms`,
    )

    const text = response.text

    if (!text) {
        throw new Error('Gemini returned an empty response.')
    }

    const jsonText = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()

    const parsed: unknown = JSON.parse(jsonText)

    if (!Array.isArray(parsed)) {
        throw new Error('Gemini returned an invalid review format.')
    }

    return parsed as AIReviewFinding[]
}
