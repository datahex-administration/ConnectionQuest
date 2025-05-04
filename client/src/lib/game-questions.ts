export interface GameQuestion {
  id: number;
  text: string;
  options: string[];
  type: "common" | "individual";
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface UserAnswer {
  questionId: number;
  optionId: number;
  answer: string;
}

export interface GameSessionResult {
  matchPercentage: number;
  matchingAnswers: {
    question: string;
    answer: string;
  }[];
  sessionId: number;
  voucher?: {
    voucherId: number;
    voucherCode: string;
    discount: string;
    validUntil: string;
  };
}

// Fetch questions for a game session
export async function fetchGameQuestions(sessionCode: string): Promise<{
  commonQuestions: GameQuestion[];
  individualQuestions: GameQuestion[];
}> {
  const response = await fetch(`/api/sessions/${sessionCode}/questions`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to fetch questions");
  }
  
  return response.json();
}

// Submit user's answers
export async function submitAnswers(
  sessionCode: string, 
  answers: { questionId: number; optionId: number }[]
): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionCode}/answers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ answers }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to submit answers");
  }
}

// Get results for a game session
export async function fetchGameResults(sessionCode: string): Promise<GameSessionResult> {
  const response = await fetch(`/api/sessions/${sessionCode}/results`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to fetch results");
  }
  
  return response.json();
}
