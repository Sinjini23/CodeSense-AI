# CodeSense AI

**AI-Powered Code Review & Mock Interview Platform**

CodeSense AI is an AI-assisted developer tool designed to help developers identify code issues, understand potential bugs, improve code quality, and practice technical interviews. It combines static analysis with Generative AI to provide actionable feedback and suggested code improvements.

##  Features

###  AI Code Review
- Analyze source code using Generative AI.
- Identify potential bugs, security risks, and code-quality issues.
- View findings with severity levels and explanations.
- Receive actionable suggestions and recommended fixes.
- Compare original code with suggested improvements.
- Apply suggested fixes and undo changes.

###  Static Code Analysis
- Run static analysis independently of AI review.
- Identify common programming mistakes and code-quality problems.
- Review findings alongside AI-generated recommendations.

###  Interactive Code Editor
- Write and edit code in an interactive editor powered by Monaco Editor.
- Select a programming language for code review.
- Review suggested changes in a code-diff view.
- Copy suggested code or apply it directly to the editor.

###  Review History
- Keep track of recent code reviews.
- Restore previous reviews.
- Delete individual history entries.
- Persist review history locally in the browser.

###  AI Mock Interviews
- Generate technical interview questions with AI.
- Practice answering questions in an interactive workflow.
- Build a foundation for adding AI-powered answer evaluation and feedback.

##  Tech Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type safety |
| Vite | Frontend development and build tooling |
| Tailwind CSS | UI styling |
| Monaco Editor | Code editing experience |
| Node.js | Backend runtime |
| Express | Backend API |
| Google Gemini API | Generative AI integration |
| ESLint | Code-quality tooling |
| pnpm | Package management |

##  Architecture

CodeSense AI uses a frontend-backend architecture.

```text
┌──────────────────────────────┐
│       React Frontend         │
│                              │
│  Dashboard                   │
│  Code Editor                 │
│  AI Review Findings          │
│  Mock Interview              │
└──────────────┬───────────────┘
               │ HTTP API
               ▼
┌──────────────────────────────┐
│       Express Backend        │
│                              │
│  Static Analysis             │
│  AI Review Service           │
│  Mock Interview Service      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Google Gemini API      │
│                              │
│  Code Review                 │
│  Question Generation         │
│  AI-Generated Feedback       │
└──────────────────────────────┘
```

##  Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- pnpm
- A
