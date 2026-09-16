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
import { createPedagogicalClientSession } from './utils/pedagogicalFallback';
import { solveWithStepEngine } from './utils/stepEngine';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MathInputBar } from './components/MathInputBar';
import { ReasoningCanvas } from './components/ReasoningCanvas';
import { QuestionModal } from './components/QuestionModal';
import { PracticeView } from './components/PracticeView';
import { MathView } from './components/MathView';
import { generateDeterministicBranchExplanation } from './utils/stepExplanationGenerator';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  // Streaming state for instant AI response
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState('');
  const [streamingBuffer, setStreamingBuffer] = useState('');

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
  const [isBottomBarExpanded, setIsBottomBarExpanded] = useState(false);

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

    const fromNatural = naturalInputToLatex(latex || rawInput);
    const effectiveLatex = fromNatural || latex || rawInput;
    const effectiveRaw = rawInput || effectiveLatex;

    // 1. Check if it matches a preset problem exactly for instant answer
    const normalizedRaw = effectiveRaw.toLowerCase().replace(/∫/g, 'integral').replace(/√/g, 'sqrt').replace(/\s+/g, '');
    const currentLatexNorm = effectiveLatex.replace(/\s+/g, '');
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
      setIsStreaming(false);
      setMode('canvas');
      return;
    }

    // 2. Check Deterministic Symbolic Engine (StepEngine) fast-path
    try {
      const stepEngineResult = solveWithStepEngine(effectiveLatex);
      if (stepEngineResult.canHandleDeterministically && stepEngineResult.session) {
        const symSession: SolutionSession = {
          ...stepEngineResult.session,
          id: 'session-sym-' + Date.now(),
          createdAt: Date.now(),
          source: 'symbolic',
        };
        setSessions((prev) => [symSession, ...prev.filter((s) => s.id !== symSession.id)]);
        setCurrentSessionId(symSession.id);
        setIsLoading(false);
        setIsStreaming(false);
        setMode('canvas');
        return;
      }
    } catch (symErr) {
      console.warn('[FastPath Client] Continuando hacia streaming híbrido:', symErr);
    }

    // 3. Prepare live streaming session (Hybrid CAS + AI)
    const newSessionId = 'session-' + Date.now();
    const initialCategory = detectCategory(effectiveLatex);
    const initialSession: SolutionSession = {
      id: newSessionId,
      title: effectiveRaw,
      createdAt: Date.now(),
      expression: {
        id: 'expr-' + Date.now(),
        rawInput: effectiveRaw,
        formattedLatex: effectiveLatex,
        category: initialCategory,
        title: effectiveRaw,
        timestamp: Date.now(),
      },
      summary: 'Analizando y estructurando deducción de cálculo...',
      steps: [],
      finalResult: {
        latex: '',
        explanation: '',
      },
      branches: {},
    };

    // Transition to canvas immediately so user has zero perceived waiting
    setSessions((prev) => [initialSession, ...prev.filter((s) => s.id !== initialSession.id)]);
    setCurrentSessionId(newSessionId);
    setMode('canvas');
    setIsLoading(false);
    setIsStreaming(true);
    setStreamingStatus('Iniciando deducción de cálculo y reglas analíticas...');
    setStreamingBuffer('');

    const abortController = new AbortController();
    const streamTimeout = setTimeout(() => {
      abortController.abort();
    }, 30000);

    try {
      const response = await fetch('/api/solve/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          rawInput: effectiveRaw,
          expression: effectiveLatex,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Stream de IA no disponible en este momento');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const blocks = lineBuffer.split('\n\n');
        lineBuffer = blocks.pop() || '';

        for (const block of blocks) {
          if (!block.trim()) continue;
          let eventName = 'message';
          let dataStr = '';

          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) {
              eventName = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr += line.slice(6);
            }
          }

          if (!dataStr) continue;

          try {
            const payload = JSON.parse(dataStr);

            if (eventName === 'init') {
              setStreamingStatus(payload.message || 'Analizando estructura matemática...');
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === newSessionId
                    ? {
                        ...s,
                        title: payload.title || s.title,
                        summary: payload.summary || s.summary,
                        expression: {
                          ...s.expression,
                          formattedLatex: payload.formattedLatex || s.expression.formattedLatex,
                          category: payload.category || s.expression.category,
                          title: payload.title || s.expression.title,
                        },
                      }
                    : s
                )
              );
            } else if (eventName === 'chunk') {
              setStreamingBuffer((b) => b + (payload.delta || ''));
            } else if (eventName === 'step') {
              const newStep: SolutionStep = payload.step;
              if (newStep) {
                setStreamingStatus(`Paso ${newStep.stepNumber}: ${newStep.title}`);
                setSessions((prev) =>
                  prev.map((s) => {
                    if (s.id !== newSessionId) return s;
                    const exists = s.steps.some((st) => st.stepNumber === newStep.stepNumber || st.id === newStep.id);
                    if (exists) {
                      return {
                        ...s,
                        steps: s.steps.map((st) => (st.stepNumber === newStep.stepNumber ? newStep : st)),
                      };
                    }
                    return {
                      ...s,
                      steps: [...s.steps, newStep],
                    };
                  })
                );
              }
            } else if (eventName === 'complete') {
              if (payload.session) {
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === newSessionId
                      ? {
                          ...payload.session,
                          id: newSessionId,
                        }
                      : s
                  )
                );
              }
              setIsStreaming(false);
              setStreamingStatus('');
            }
          } catch (jsonErr) {
            console.warn('Error parsing SSE event:', jsonErr);
          }
        }
      }
    } catch (streamErr) {
      console.warn('Stream failed or interrupted, switching to standard solve API:', streamErr);
      try {
        const fallbackController = new AbortController();
        const fallbackTimer = setTimeout(() => fallbackController.abort(), 25000);

        const response = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: fallbackController.signal,
          body: JSON.stringify({
            rawInput,
            expression: latex,
          }),
        });
        clearTimeout(fallbackTimer);

        if (response.ok) {
          const data = await response.json();
          if (data && data.steps && data.steps.length > 0) {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === newSessionId
                  ? {
                      ...s,
                      title: data.title || rawInput,
                      summary: data.summary || s.summary,
                      steps: data.steps,
                      finalResult: data.finalResult,
                      expression: {
                        ...s.expression,
                        formattedLatex: data.expression?.formattedLatex || latex,
                        category: data.category || detectCategory(rawInput),
                      },
                    }
                  : s
              )
            );
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback solve error:', fallbackErr);
      }
    } finally {
      clearTimeout(streamTimeout);
      // Guarantee that the current session NEVER remains with 0 steps or in loading limbo
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== newSessionId) return s;
          if (!s.steps || s.steps.length === 0) {
            const fallbackSession = createPedagogicalClientSession(rawInput, latex, newSessionId);
            return {
              ...fallbackSession,
              id: newSessionId,
            };
          }
          return s;
        })
      );
      setIsStreaming(false);
      setIsLoading(false);
      setStreamingStatus('');
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

  // Generic step explanation requester with streaming
  const requestStepExplanation = async (params: {
    step: SolutionStep;
    questionType: ExplanationQuestionType;
    questionText: string;
    targetPart?: string;
  }) => {
    if (!currentSession) return;
    setLoadingExplanation(true);

    const branchId = 'branch-' + Date.now();
    const defaultTitle = params.targetPart
      ? `Análisis de ${params.targetPart}`
      : params.questionType === 'how_did_we_get_here'
      ? '¿Cómo llegamos a este paso?'
      : params.questionType === 'analogy'
      ? 'Analogía intuitiva'
      : params.questionType === 'simpler'
      ? 'Explicación más simple'
      : 'Explicación del tutor';

    // Generate high quality deterministic branch immediately
    const deterministicBranch = generateDeterministicBranchExplanation({
      expression: currentSession.expression.formattedLatex,
      step: params.step,
      questionType: params.questionType,
      questionText: params.questionText,
      targetPart: params.targetPart,
    });

    // Optimistically attach branch to display immediate progress
    const initialBranch: StepExplanationBranch = {
      ...deterministicBranch,
      id: branchId,
    };
    attachBranchToCurrentSession(params.step.id, initialBranch);

    // Provide comfortable 30s timeout with explicit timeout reason to avoid unhandled abort exceptions
    const abortController = new AbortController();
    const explanationTimeout = setTimeout(() => {
      try {
        abortController.abort(new DOMException('Timeout al obtener explicación del tutor', 'TimeoutError'));
      } catch {
        abortController.abort();
      }
    }, 28000);

    try {
      const response = await fetch('/api/explain-step/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          expression: currentSession.expression.formattedLatex,
          step: params.step,
          questionType: params.questionType,
          questionText: params.questionText,
          targetPart: params.targetPart,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Servidor respondió con código ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const blocks = lineBuffer.split('\n\n');
        lineBuffer = blocks.pop() || '';

        for (const block of blocks) {
          if (!block.trim()) continue;
          let eventName = 'message';
          let dataStr = '';

          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) {
              eventName = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr += line.slice(6);
            }
          }

          if (!dataStr) continue;

          try {
            const payload = JSON.parse(dataStr);
            if (eventName === 'complete' && payload.branch) {
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== currentSessionId) return s;
                  const branches = s.branches[params.step.id] || [];
                  return {
                    ...s,
                    branches: {
                      ...s.branches,
                      [params.step.id]: branches.map((b) =>
                        b.id === branchId ? { ...payload.branch, id: branchId } : b
                      ),
                    },
                  };
                })
              );
            }
          } catch (e) {}
        }
      }
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || err?.name === 'TimeoutError' || err?.message?.includes('abort');
      if (isAbort) {
        console.info('[StepExplanation] Tiempo límite alcanzado para stream de IA, empleando desglose analítico verificado.');
      } else {
        console.warn('Advertencia al consultar explicación remota:', err?.message || err);
      }

      // Ensure that deterministic high-quality explanation is in place
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== currentSessionId) return s;
          const branches = s.branches[params.step.id] || [];
          return {
            ...s,
            branches: {
              ...s.branches,
              [params.step.id]: branches.map((b) => (b.id === branchId ? initialBranch : b)),
            },
          };
        })
      );
    } finally {
      clearTimeout(explanationTimeout);
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
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 flex font-sans selection:bg-gray-200">
      {/* Sidebar Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => {
          setCurrentSessionId(id);
          setMode('canvas');
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onNewSession={() => {
          setCurrentSessionId(null);
          setMode('canvas');
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
        onSelectTopic={(query) => {
          handleSolve(query, naturalInputToLatex(query));
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onSwitchToPractice={(topic) => {
          setMode('practice');
          if (topic) handleNextPracticeExercise(topic);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        mode={mode}
      />

      {/* Main Content & Header Layout Area (shifts smoothly when sidebar opens on md+ screens) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'md:pl-72' : 'pl-0'
        }`}
      >
        {/* Navbar */}
        <Navbar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNewSession={() => {
            setCurrentSessionId(null);
            setMode('canvas');
          }}
          activeMode={mode}
          onSwitchMode={(m) => setMode(m)}
          sessionTitle={currentSession?.title}
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
                isStreaming={isStreaming}
                streamingStatus={streamingStatus}
                streamingBuffer={streamingBuffer}
              />

              {/* Bottom floating compact math input bar */}
              <div
                className={`fixed bottom-4 right-0 z-20 px-4 pointer-events-none transition-all duration-300 ease-in-out ${
                  isSidebarOpen ? 'left-0 md:left-72' : 'left-0'
                }`}
              >
                <div
                  className={`pointer-events-auto mx-auto backdrop-blur-md rounded-2xl cursor-text transition-all duration-300 ease-in-out border ${
                    isBottomBarExpanded
                      ? 'max-w-3xl bg-white/98 p-2.5 sm:p-3 shadow-2xl border-gray-300 ring-2 ring-black/5'
                      : 'max-w-xl bg-white/90 p-1 sm:p-1.5 shadow-md border-gray-200/90 hover:border-gray-300 hover:shadow-lg'
                  }`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    const mf = document.querySelector('math-field') as any;
                    if (mf && typeof mf.focus === 'function') {
                      mf.focus();
                    }
                  }}
                >
                  <MathInputBar
                    onSolve={handleSolve}
                    isLoading={isLoading || isStreaming}
                    isCompact={true}
                    onExpansionChange={setIsBottomBarExpanded}
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
      </div>

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
