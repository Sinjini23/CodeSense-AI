
import { ESLint } from 'eslint'

export interface ReviewFinding {
  ruleId: string
  severity: 'error' | 'warning'
  line: number
  column: number
  message: string
}

export async function analyzeCode(
  code: string,
  filename: string,
): Promise<ReviewFinding[]> {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
       

languageOptions: {
  globals: {
    console: 'readonly',
    window: 'readonly',
    document: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
},


        rules: {
          'no-undef': 'error',
          'no-unused-vars': 'warn',
          'no-unreachable': 'error',
          'no-constant-condition': 'warn',
        },
      },
    ],
  })

  const results = await eslint.lintText(code, { filePath: filename })

  return results.flatMap((result) =>
    result.messages
      .filter((message) => message.severity > 0)
     
.map((message) => {
  const ruleId = message.ruleId ?? 'unknown'
  const suggestion = getFindingSuggestion(ruleId)

  return {
    ruleId,
    severity:
      message.severity === 2
        ? 'error' as const
        : 'warning' as const,
    line: message.line ?? 1,
    column: message.column ?? 1,
    message: message.message,
    explanation: suggestion.explanation,
    suggestedFix: suggestion.suggestedFix,
  }
}),

  )
}

export function getFindingSuggestion(ruleId: string): {
  explanation: string
  suggestedFix: string
} {
  const suggestions: Record<
    string,
    { explanation: string; suggestedFix: string }
  > = {
    'no-unused-vars': {
      explanation:
        'This variable is declared but never used. Unused variables can make code harder to maintain.',
      suggestedFix:
        'Remove the variable if it is unnecessary, or use it where needed.',
    },
    'no-undef': {
      explanation:
        'This identifier is used but has not been declared in the current scope.',
      suggestedFix:
        'Check the spelling and declare the variable, import it, or pass it into the function.',
    },
    'no-unreachable': {
      explanation:
        'This code cannot execute because an earlier statement prevents control from reaching it.',
      suggestedFix:
        'Move the code before the return, throw, or other statement that stops execution.',
    },
    'no-constant-condition': {
      explanation:
        'This condition always evaluates to the same result, which may indicate a logic mistake.',
      suggestedFix:
        'Check whether the condition should use a variable or a comparison instead.',
    },
  }

  return (
    suggestions[ruleId] ?? {
      explanation: 'ESLint detected a potential code-quality issue.',
      suggestedFix:
        'Review the rule message and update the code where appropriate.',
    }
  )
}

