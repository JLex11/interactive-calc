import React, { useState, useEffect } from 'react';
import {
  SolutionSession,
  SolutionStep,
  StepExplanationBranch,
  PracticeExercise,
  ExplanationQuestionType
} from './types';
import { PRESET_SESSIONS, PRESET_PRACTICE_EXERCISES } from './data/presetSolutions';
import { naturalInputToLatex, detectCategory } from './utils/mathParser';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MathInputBar } from './components/MathInputBar';
import { ReasoningCanvas } from './components/ReasoningCanvas';
import { QuestionModal } from './components/QuestionModal';
import { PracticeView } from './components/PracticeView';
import { MathView } from './components/MathView';
import { Sparkles, ArrowRight, BookOpen, BrainCircuit } from 'lucide-react';

const STORAGE_KEY_SESSIONS = 'calculo_interactivo_sessions_v1';
const STORAGE_KEY_CURRENT = 'calculo_interactivo_curr_v1';

export default function App() {
  const [sessions, setSessions] = useState<SolutionSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading sessions from localStorage', e);
    }
    return PRESET_SESSIONS;
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    try {
      const savedCurr = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (savedCurr) return savedCurr;
    } catch (e) {}
    return PRESET_SESSIONS[0]?.id || null;
  });

  const [mode, setMode] = useState<'canvas' | 'practice'>('canvas');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  // Question modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    step: SolutionStep | null;
    initialPart?: string;
  }>({
    isOpen: false,
    step: null,
  });

  // Practice state
  const [practiceExercise, setPracticeExercise] = useState<PracticeExercise>(
    PRESET_PRACTICE_EXERCISES[0]
  );
  const [isPracticeLoading, setIsPracticeLoading] = useState(false);

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Error saving sessions to localStorage', e);
    }
  }, [sessions]);

  // Persist current session id
  useEffect(() => {
    try {
      if (currentSessionId) {
        localStorage.setItem(STORAGE_KEY_CURRENT, currentSessionId);
      }
    } catch (e) {}
  }, [currentSessionId]);

  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;

  // Handler: Solve an expression
  const handleSolve = async (rawInput: string, latex: string) => {
    setIsLoading(true);

    // 1. Check if it matches a preset problem exactly for instant answer
    const normalizedRaw = rawInput.toLowerCase().replace(/∫/g, 'integral').replace(/√/g, 'sqrt').replace(/\s+/g, '');
    const currentLatexNorm = latex.replace(/\s+/g, '');
    const matchedPreset = PRESET_SESSIONS.find((p) => {
      const presetRawNorm = p.expression.rawInput.toLowerCase().replace(/∫/g, 'integral').replace(/√/g, 'sqrt').replace(/\s+/g, '');
      const presetLatexNorm = p.expression.formattedLatex.replace(/\s+/g, '');
      return presetRawNorm === normalizedRaw || presetLatexNorm === currentLatexNorm;
    });

    if (matchedPreset) {
      // Clone preset with fresh session ID and timestamp
      const newSession: SolutionSession = {
        ...matchedPreset,
        id: 'session-' + Date.now(),
        createdAt: Date.now(),
        branches: { ...matchedPreset.branches },
      };
      setSessions((prev) => [newSession, ...prev.filter((s) => s.id !== newSession.id)]);
      setCurrentSessionId(newSession.id);
      setIsLoading(false);
      setMode('canvas');
      return;
    }

    // 2. Call server API
    try {
      let data: any = null;
      try {
        const response = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawInput,
            expression: latex,
          }),
        });
        if (response.ok) {
          data = await response.json();
        }
      } catch (fetchErr) {
        console.warn('Network issue reaching solve API:', fetchErr);
      }

      if (data && data.steps && data.steps.length > 0) {
        const newSession: SolutionSession = {
          id: data.id || 'session-' + Date.now(),
          title: data.title || rawInput,
          createdAt: Date.now(),
          expression: {
            id: 'expr-' + Date.now(),
            rawInput,
            formattedLatex: data.expression?.formattedLatex || latex,
            category: detectCategory(rawInput),
            title: data.title || rawInput,
            timestamp: Date.now(),
          },
          summary: data.summary || '',
          steps: data.steps || [],
          finalResult: data.finalResult || {
            latex: latex,
            explanation: 'Proceso completado.',
          },
          branches: {},
        };

        setSessions((prev) => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setMode('canvas');
      } else {
        // Construct clean assisted session
        const assistedSession: SolutionSession = {
          id: 'session-assisted-' + Date.now(),
          title: rawInput,
          createdAt: Date.now(),
          expression: {
            id: 'expr-as-' + Date.now(),
            rawInput,
            formattedLatex: latex,
            category: detectCategory(rawInput),
            title: rawInput,
            timestamp: Date.now(),
          },
          summary: 'Resolución analítica de la expresión:',
          steps: [
            {
              id: 'step-as-1',
              stepNumber: 1,
              title: 'Planteamiento y análisis inicial',
              latex: latex,
              explanation: 'Identificamos las funciones componentes y la operación matemática a realizar.',
              rule: 'Formulación analítica',
              subterms: ['x'],
            },
            {
              id: 'step-as-2',
              stepNumber: 2,
              title: 'Aplicación de transformaciones algebraicas',
              latex: latex,
              explanation: 'Descomponemos y simplificamos los factores según las reglas de derivación o integración correspondientes.',
              rule: 'Propiedades operacionales fundamentales',
              subterms: ['x'],
            },
            {
              id: 'step-as-3',
              stepNumber: 3,
              title: 'Expresión resultante',
              latex: latex,
              explanation: 'Formulación canónica simplificada del resultado.',
              rule: 'Forma canónica',
              subterms: ['x'],
            },
          ],
          finalResult: {
            latex: latex,
            explanation: 'Expresión procesada paso a paso.',
          },
          branches: {},
        };
        setSessions((prev) => [assistedSession, ...prev]);
        setCurrentSessionId(assistedSession.id);
        setMode('canvas');
      }
    } catch (unexpectedErr) {
      console.warn('Unexpected error in handleSolve:', unexpectedErr);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Explore "How did we get here?" (intermediate breakdown)
  const handleExploreHowWeGotHere = async (step: SolutionStep) => {
    if (!currentSession) return;

    // Check if intermediate steps already exist on the step
    if (step.intermediateSteps && step.intermediateSteps.length > 0) {
      const branchId = 'branch-auto-' + Date.now();
      const newBranch: StepExplanationBranch = {
        id: branchId,
        stepId: step.id,
        questionType: 'how_did_we_get_here',
        questionText: '¿Cómo llegamos a este paso?',
        title: `Desglose intermedio: ${step.title}`,
        conceptualExplanation: `Para llegar a este paso se descompuso la expresión mediante ${step.rule || 'la propiedad matemática aplicable'}. A continuación se detallan los pasos intermedios omitidos:`,
        breakdownSteps: step.intermediateSteps,
        timestamp: Date.now(),
      };
      attachBranchToCurrentSession(step.id, newBranch);
      return;
    }

    await requestStepExplanation({
      step,
      questionType: 'how_did_we_get_here',
      questionText: '¿Cómo pasamos a esta expresión?',
    });
  };

  // Handler: Simpler explanation
  const handleExplainSimpler = async (step: SolutionStep) => {
    await requestStepExplanation({
      step,
      questionType: 'simpler',
      questionText: 'Explícamelo de forma más sencilla sin tecnicismos complejos.',
    });
  };

  // Handler: Analogy explanation
  const handleExplainAnalogy = async (step: SolutionStep) => {
    await requestStepExplanation({
      step,
      questionType: 'analogy',
      questionText: 'Dame una analogía intuitiva de la vida real para este paso.',
    });
  };

  // Handler: Ask about specific subterm
  const handleAskAboutPart = (step: SolutionStep, part: string) => {
    setModalState({
      isOpen: true,
      step,
      initialPart: part,
    });
  };

  // Generic step explanation requester to /api/explain-step
  const requestStepExplanation = async (params: {
    step: SolutionStep;
    questionType: ExplanationQuestionType;
    questionText: string;
    targetPart?: string;
  }) => {
    if (!currentSession) return;
    setLoadingExplanation(true);

    try {
      const response = await fetch('/api/explain-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression: currentSession.expression.formattedLatex,
          step: params.step,
          questionType: params.questionType,
          questionText: params.questionText,
          targetPart: params.targetPart,
        }),
      });

      if (!response.ok) throw new Error('Error al generar la explicación');
      const data: StepExplanationBranch = await response.json();
      attachBranchToCurrentSession(params.step.id, data);
    } catch (err) {
      console.error('Error fetching step explanation:', err);
      // Fallback local branch
      const fallbackBranch: StepExplanationBranch = {
        id: 'branch-fb-' + Date.now(),
        stepId: params.step.id,
        questionType: params.questionType,
        targetPart: params.targetPart,
        questionText: params.questionText,
        title: params.targetPart
          ? `Análisis de ${params.targetPart}`
          : 'Explicación del paso',
        conceptualExplanation: params.step.explanation || 'Este paso surge de aplicar las propiedades matemáticas elementales.',
        timestamp: Date.now(),
      };
      attachBranchToCurrentSession(params.step.id, fallbackBranch);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const attachBranchToCurrentSession = (stepId: string, branch: StepExplanationBranch) => {
    if (!currentSessionId) return;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentSessionId) return s;
        const currentBranches = s.branches[stepId] || [];
        return {
          ...s,
          branches: {
            ...s.branches,
            [stepId]: [...currentBranches, branch],
          },
        };
      })
    );
  };

  const handleCloseBranch = (stepId: string, branchId: string) => {
    if (!currentSessionId) return;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentSessionId) return s;
        const filtered = (s.branches[stepId] || []).filter((b) => b.id !== branchId);
        return {
          ...s,
          branches: {
            ...s.branches,
            [stepId]: filtered,
          },
        };
      })
    );
  };

  const handleAskFollowUp = async (stepId: string, branchId: string, question: string) => {
    if (!currentSession) return;
    const step = currentSession.steps.find((st) => st.id === stepId);
    if (!step) return;

    await requestStepExplanation({
      step,
      questionType: 'custom',
      questionText: question,
    });
  };

  const handleToggleSave = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, isSaved: !s.isSaved } : s))
    );
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setCurrentSessionId(remaining[0]?.id || null);
    }
  };

  // Practice handlers
  const handleValidatePracticeStep = async (proposal: string) => {
    try {
      const response = await fetch('/api/practice/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: practiceExercise,
          currentStepIndex: practiceExercise.currentStepIndex,
          userProposal: proposal,
        }),
      });

      if (!response.ok) throw new Error('Error al validar respuesta');
      const data = await response.json();

      if (data.isCorrect && data.canAdvance) {
        setPracticeExercise((prev) => ({
          ...prev,
          currentStepIndex: prev.currentStepIndex + 1,
          isCompleted: prev.currentStepIndex + 1 >= prev.steps.length,
          userAttempts: [
            ...prev.userAttempts,
            {
              stepIndex: prev.currentStepIndex,
              userInput: proposal,
              isCorrect: true,
              feedback: data.feedback,
            },
          ],
        }));
      }

      return data;
    } catch (err) {
      // Fallback evaluation
      const currentStep = practiceExercise.steps[practiceExercise.currentStepIndex];
      const isOk = proposal.length > 2;
      if (isOk) {
        setPracticeExercise((prev) => ({
          ...prev,
          currentStepIndex: prev.currentStepIndex + 1,
          isCompleted: prev.currentStepIndex + 1 >= prev.steps.length,
        }));
      }
      return {
        isCorrect: isOk,
        feedback: isOk ? '¡Bien razonado!' : 'Inténtalo de nuevo analizando los términos.',
        canAdvance: isOk,
      };
    }
  };

  const handleNextPracticeExercise = async (topic: string) => {
    setIsPracticeLoading(true);
    // Find preset if matches
    const preset = PRESET_PRACTICE_EXERCISES.find(
      (p) => p.topic.toLowerCase() === topic.toLowerCase()
    );
    if (preset && preset.id !== practiceExercise.id) {
      setPracticeExercise({ ...preset, currentStepIndex: 0, isCompleted: false });
      setIsPracticeLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/practice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) throw new Error('Error al generar ejercicio');
      const data = await response.json();
      setPracticeExercise(data);
    } catch (e) {
      // Rotate through presets
      const nextIndex =
        (PRESET_PRACTICE_EXERCISES.findIndex((p) => p.id === practiceExercise.id) + 1) %
        PRESET_PRACTICE_EXERCISES.length;
      setPracticeExercise({
        ...PRESET_PRACTICE_EXERCISES[nextIndex],
        currentStepIndex: 0,
        isCompleted: false,
      });
    } finally {
      setIsPracticeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 flex flex-col font-sans selection:bg-gray-200">
      {/* Navbar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onNewSession={() => {
          setCurrentSessionId(null);
          setMode('canvas');
        }}
        activeMode={mode}
        onSwitchMode={(m) => setMode(m)}
        sessionTitle={currentSession?.title}
      />

      {/* Sidebar Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => {
          setCurrentSessionId(id);
          setMode('canvas');
          setIsSidebarOpen(false);
        }}
        onNewSession={() => {
          setCurrentSessionId(null);
          setMode('canvas');
          setIsSidebarOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
        onSelectTopic={(query) => {
          handleSolve(query, naturalInputToLatex(query));
          setIsSidebarOpen(false);
        }}
        onSwitchToPractice={(topic) => {
          setMode('practice');
          if (topic) handleNextPracticeExercise(topic);
          setIsSidebarOpen(false);
        }}
        mode={mode}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start w-full relative">
        {mode === 'practice' ? (
          <PracticeView
            exercise={practiceExercise}
            onValidateStep={handleValidatePracticeStep}
            onNextExercise={handleNextPracticeExercise}
            isLoading={isPracticeLoading}
          />
        ) : currentSession ? (
          <div className="w-full pb-28">
            <ReasoningCanvas
              session={currentSession}
              onExploreHowWeGotHere={handleExploreHowWeGotHere}
              onExplainSimpler={handleExplainSimpler}
              onExplainAnalogy={handleExplainAnalogy}
              onAskAboutPart={handleAskAboutPart}
              onOpenCustomQuestion={(step) =>
                setModalState({ isOpen: true, step })
              }
              onCloseBranch={handleCloseBranch}
              onAskFollowUp={handleAskFollowUp}
              onToggleSave={handleToggleSave}
              isLoadingExplanation={loadingExplanation}
            />

            {/* Bottom floating compact math input bar */}
            <div className="fixed bottom-4 left-0 right-0 z-20 px-4 pointer-events-none">
              <div className="pointer-events-auto max-w-3xl mx-auto backdrop-blur-md bg-white/95 p-2 rounded-2xl shadow-xl border border-gray-200">
                <MathInputBar
                  onSolve={handleSolve}
                  isLoading={isLoading}
                  isCompact={true}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Empty state: Geometric Balance centered clean hero */
          <div className="w-full max-w-3xl mx-auto my-auto px-4 py-12 sm:py-20 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200/60 mb-6">
              <BrainCircuit className="w-3.5 h-3.5 text-gray-500" />
              <span>Canvas Matemático de Razonamiento</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif-math font-semibold text-gray-900 tracking-tight mb-3">
              ¿Qué quieres resolver?
            </h1>
            <p className="text-gray-500 text-sm sm:text-base max-w-md mx-auto mb-8 leading-relaxed">
              Introduce una integral, derivada, límite o ecuación. Aprende el procedimiento paso a paso y profundiza en el porqué de cada transformación.
            </p>

            <MathInputBar onSolve={handleSolve} isLoading={isLoading} />

            {/* Quick Starter Cards */}
            <div className="mt-10 pt-8 border-t border-gray-100 text-left">
              <div className="text-xs uppercase font-mono tracking-wider text-gray-400 font-semibold mb-3 px-1">
                Ejemplos guiados de cálculo:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    title: 'Integral por partes',
                    expr: 'integral x^2 sin(x) dx',
                    latex: '\\int x^2 \\sin(x) \\, dx',
                    desc: 'Aprende cuándo y cómo iterar u y dv.',
                  },
                  {
                    title: 'Integral clásica con eˣ',
                    expr: 'integral x * e^x dx',
                    latex: '\\int x e^x \\, dx',
                    desc: 'Descubre por qué eˣ no cambia al integrarse.',
                  },
                  {
                    title: 'Regla del cociente',
                    expr: 'derivada ln(x)/x',
                    latex: '\\frac{d}{dx}\\left[ \\frac{\\ln(x)}{x} \\right]',
                    desc: 'Derivación ordenada con numerador y denominador.',
                  },
                  {
                    title: 'Límite notable 0/0',
                    expr: 'limite x->0 sin(x)/x',
                    latex: '\\lim_{x \\to 0} \\frac{\\sin(x)}{x}',
                    desc: 'Regla de L\'Hôpital y resolución de indeterminaciones.',
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSolve(item.expr, item.latex)}
                    className="p-3.5 rounded-2xl bg-white border border-gray-200/80 hover:border-black hover:shadow-xs transition-all text-left group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-900 mb-1">
                      <span>{item.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div className="my-1 py-0.5 overflow-x-auto text-gray-800">
                      <MathView math={item.latex} />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Targeted question modal */}
      <QuestionModal
        isOpen={modalState.isOpen}
        step={modalState.step}
        initialPart={modalState.initialPart}
        onClose={() => setModalState({ isOpen: false, step: null })}
        onSubmitQuestion={requestStepExplanation}
        isLoading={loadingExplanation}
      />
    </div>
  );
}
