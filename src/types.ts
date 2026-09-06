export type MathCategory = 'integral' | 'derivative' | 'limit' | 'equation' | 'algebraic' | 'other';

export interface MathExpression {
  id: string;
  rawInput: string;
  formattedLatex: string;
  category: MathCategory;
  title: string;
  timestamp: number;
}

export interface IntermediateStep {
  latex: string;
  explanation: string;
}

export interface SolutionStep {
  id: string;
  stepNumber: number;
  title: string;
  latex: string;
  explanation: string;
  rule?: string;
  subterms?: string[]; // Clickable parts for "¿Qué significa esto?"
  intermediateSteps?: IntermediateStep[];
}

export type ExplanationQuestionType =
  | 'how_did_we_get_here'
  | 'intermediate_steps'
  | 'simpler'
  | 'analogy'
  | 'rule_deep_dive'
  | 'part_question'
  | 'custom';

export interface StepExplanationBranch {
  id: string;
  stepId: string;
  questionType: ExplanationQuestionType;
  targetPart?: string;
  questionText: string;
  title: string;
  conceptualExplanation: string;
  breakdownSteps?: IntermediateStep[];
  simplerExample?: {
    latex: string;
    explanation: string;
  };
  ruleDeepDive?: {
    ruleName: string;
    formula: string;
    whyItWorks: string;
  };
  analogy?: string;
  timestamp: number;
}

export interface SolutionSession {
  id: string;
  title: string;
  expression: MathExpression;
  summary: string;
  steps: SolutionStep[];
  finalResult: {
    latex: string;
    explanation: string;
  };
  branches: Record<string, StepExplanationBranch[]>; // stepId -> array of branches
  activeStepId?: string;
  isSaved?: boolean;
  createdAt: number;
}

export interface PracticeStep {
  stepNumber: number;
  instruction: string;
  expectedConcept: string;
  expectedLatex: string;
  hints: string[];
}

export interface PracticeExercise {
  id: string;
  topic: string;
  title: string;
  difficulty: 'fácil' | 'intermedio' | 'avanzado';
  problemLatex: string;
  context: string;
  steps: PracticeStep[];
  currentStepIndex: number;
  isCompleted: boolean;
  userAttempts: {
    stepIndex: number;
    userInput: string;
    isCorrect: boolean;
    feedback: string;
  }[];
}

export interface PracticeValidationResult {
  isCorrect: boolean;
  feedback: string;
  hint?: string;
  revealedStep?: string;
  canAdvance: boolean;
}
