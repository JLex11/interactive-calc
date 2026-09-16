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
  ruleId?: string;
  subterms?: string[]; // Clickable parts for "¿Qué significa esto?"
  intermediateSteps?: IntermediateStep[];
  verificationStatus?: StepVerificationStatus;
  constraints?: string[];
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

export type EngineSolutionSource = 'symbolic' | 'ai' | 'hybrid';
export type EngineStatus = 'solved' | 'unresolved' | 'unsupported' | 'invalid';
export type EquivalenceResult = 'true' | 'false' | 'unknown';
export type StepVerificationStatus = 'verified' | 'invalid' | 'unknown';

export interface SymbolicAnalysis {
  category: MathCategory;
  rawInput: string;
  rawLatex: string;
  canonicalLatex: string;
  targetVariable: string;
  variables: string[];
  assumptions: string[];
  complexity: number;
  isValid: boolean;
  status: EngineStatus;
  exactResultLatex?: string;
  numericApproximation?: string;
  solutions?: string[];
  mathJson?: any;
}

export interface StructuredStepTransformation {
  stepNumber: number;
  beforeLatex: string;
  ruleId: string;
  ruleName: string;
  afterLatex: string;
  explanation: string;
  constraints: string[];
  verification: StepVerificationStatus;
  subterms?: string[];
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
  source?: EngineSolutionSource;
  symbolicValidation?: {
    isFullyVerified: boolean;
    verifiedStepsCount: number;
    totalStepsCount: number;
    canonicalResult?: string;
    engineStatus: EngineStatus;
  };
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
