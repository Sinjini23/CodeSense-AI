
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'

export interface HealthResponse {
  status: string
  message: string
}


export interface ReviewFinding {
  ruleId: string
  severity: 'error' | 'warning'
  line: number
  column: number
  message: string
  explanation: string
  suggestedFix: string
}


export interface ReviewResponse {
  success: boolean
  message: string
  review: {
    language: string
    linesOfCode: number
    findings: ReviewFinding[]
  }
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`)

  if (!response.ok) {
    throw new Error(`Backend health check failed: ${response.status}`)
  }

  return response.json() as Promise<HealthResponse>
}

export async function reviewCode(
  code: string,
  language: string,
): Promise<ReviewResponse> {
  const response = await fetch(`${API_BASE_URL}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, language }),
  })

  const data: unknown = await response.json()

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : `Code review failed: ${response.status}`

    throw new Error(message)
  }

  return data as ReviewResponse
}

export interface AIReviewFinding {
  category: 'bug' | 'quality' | 'security' | 'performance'
  severity: 'error' | 'warning' | 'info'
  message: string
  explanation: string
  suggestedFix: string
  originalCode: string | null
  suggestedCode: string | null
}

export interface AIReviewResponse {
  success: boolean
  message: string
  findings: AIReviewFinding[]
}

export async function reviewCodeWithAI(
  code: string,
  language: string,
): Promise<AIReviewResponse> {
  const response = await fetch(`${API_BASE_URL}/ai-review-test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, language }),
  })

  const data: unknown = await response.json()

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : `AI review failed: ${response.status}`

    throw new Error(message)
  }

  return data as AIReviewResponse
}

