import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  Copy,
  Check,
  Sparkles,
  Terminal,
  ChevronDown,
  ChevronUp,
  Loader2,
  Cpu,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SolutionSession, SolutionStep, StepExplanationBranch } from '../types';
import { MathView } from './MathView';
import { StepCard } from './StepCard';
import { ExplanationSidebar } from './ExplanationSidebar';
import { FormattedMathText } from './FormattedMathText';

interface ReasoningCanvasProps {
  session: SolutionSession;
  onExploreHowWeGotHere: (step: SolutionStep) => void;
  onExplainSimpler: (step: SolutionStep) => void;
  onExplainAnalogy: (step: SolutionStep) => void;
  onAskAboutPart: (step: SolutionStep, part: string) => void;
  onOpenCustomQuestion: (step: SolutionStep) => void;
  onCloseBranch: (stepId: string, branchId: string) => void;
  onAskFollowUp?: (stepId: string, branchId: string, question: string) => void;
  onToggleSave?: (sessionId: string) => void;
  isLoadingExplanation?: boolean;
  isStreaming?: boolean;
  streamingStatus?: string;
  streamingBuffer?: string;
}

export const ReasoningCanvas: React.FC<ReasoningCanvasProps> = ({
  session,
  onExploreHowWeGotHere,
  onExplainSimpler,
  onExplainAnalogy,
  onAskAboutPart,
  onOpenCustomQuestion,
  onCloseBranch,
  onAskFollowUp,
  onToggleSave,
  isLoadingExplanation = false,
  isStreaming = false,
  streamingStatus = '',
  streamingBuffer = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [activeQuestionType, setActiveQuestionType] = useState<string | null>(null);
  const [showStreamingDebug, setShowStreamingDebug] = useState(false);
  const terminalRef = useRef<HTMLPreElement>(null);

  // Auto-scroll streaming debug terminal when text arrives
  useEffect(() => {
    if (showStreamingDebug && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [streamingBuffer, showStreamingDebug]);

  // When session changes, reset active sidebar so it is closed by default
  useEffect(() => {
    setActiveStepId(null);
    setActiveBranchId(null);
    setActiveQuestionType(null);
  }, [session.id]);

  // When branches update for active step, select the latest one
  useEffect(() => {
    if (activeStepId) {
      const branches = session.branches[activeStepId] || [];
      if (branches.length > 0) {
        const matching = activeQuestionType
          ? branches.slice().reverse().find((b) => b.questionType === activeQuestionType)
          : null;
        setActiveBranchId(matching ? matching.id : branches[branches.length - 1].id);
      }
    }
  }, [session.branches, activeStepId, activeQuestionType]);

  const handleCopy = () => {
    const textToCopy = `Problema: ${session.expression.formattedLatex}\nResultado: ${session.finalResult.latex}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExploreClick = (step: SolutionStep) => {
    setActiveStepId(step.id);
    setActiveQuestionType('how_did_we_get_here');
    const existing = (session.branches[step.id] || []).find(
      (b) => b.questionType === 'how_did_we_get_here'
    );
    if (existing) {
      setActiveBranchId(existing.id);
    } else {
      onExploreHowWeGotHere(step);
    }
  };

  const handleSimplerClick = (step: SolutionStep) => {
    setActiveStepId(step.id);
    setActiveQuestionType('simpler');
    const existing = (session.branches[step.id] || []).find(
      (b) => b.questionType === 'simpler'
    );
    if (existing) {
      setActiveBranchId(existing.id);
    } else {
      onExplainSimpler(step);
    }
  };

  const handleAnalogyClick = (step: SolutionStep) => {
    setActiveStepId(step.id);
    setActiveQuestionType('analogy');
    const existing = (session.branches[step.id] || []).find(
      (b) => b.questionType === 'analogy'
    );
    if (existing) {
      setActiveBranchId(existing.id);
    } else {
      onExplainAnalogy(step);
    }
  };

  const handleCustomQuestionClick = (step: SolutionStep) => {
    setActiveStepId(step.id);
    setActiveQuestionType('custom');
    onOpenCustomQuestion(step);
  };

  const categoryLabels: Record<string, string> = {
    integral: 'Cálculo Integral',
    derivative: 'Cálculo Diferencial',
    limit: 'Teoría de Límites',
    equation: 'Ecuaciones',
    algebraic: 'Álgebra y Funciones',
    other: 'Matemáticas',
  };

  const activeStep = activeStepId
    ? session.steps.find((s) => s.id === activeStepId) || null
    : null;

  // Log resolution metadata to console as requested
  useEffect(() => {
    if (session?.id) {
      console.log('[MathEngine Resolution]', {
        sessionId: session.id,
        source: session.source || 'ai',
        fastPath: (session as any).fastPath || false,
        validation: session.symbolicValidation,
      });
    }
  }, [session?.id, session?.source, session?.symbolicValidation]);

  const activeStepBranches = activeStep ? session.branches[activeStep.id] || [] : [];
  const activeBranch =
    activeStepBranches.find((b) => b.id === activeBranchId) ||
    (activeQuestionType
      ? activeStepBranches.find((b) => b.questionType === activeQuestionType)
      : null) ||
    activeStepBranches[activeStepBranches.length - 1] ||
    null;

  const isSidebarOpen = activeStep !== null;

  return (
    <div
      className={`w-full mx-auto py-6 sm:py-8 px-4 sm:px-6 transition-all duration-300 ${
        isSidebarOpen
          ? 'max-w-6xl flex flex-col lg:flex-row gap-8 items-start'
          : 'max-w-3xl'
      }`}
    >
      {/* Main Reasoning Flow - Directly on the canvas without heavy boxed cards */}
      <div className="flex-1 w-full min-w-0">
        {/* 1. Initial Expression - Clean & Seamless directly on background */}
        <div className="py-2 sm:py-4 mb-8 text-center relative border-b border-gray-100">
          <div className="my-2 py-2 overflow-x-auto">
            <div className="inline-block border-b-2 border-black pb-2 px-3">
              <MathView
                math={session.expression.formattedLatex}
                displayMode={true}
                className="text-2xl sm:text-3xl md:text-4xl text-gray-900 font-serif-math"
              />
            </div>
          </div>

          {session.summary && (
            <div className="text-gray-600 text-sm max-w-xl mx-auto mt-2 leading-relaxed">
              <FormattedMathText text={session.summary} asPill={false} />
            </div>
          )}
        </div>

        {/* Live AI Streaming Activity Banner */}
        {isStreaming && (
          <div className="mb-8 p-4 rounded-2xl border border-indigo-100/90 bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-violet-50/60 text-left transition-all duration-300 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-950 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                  IA razonando en tiempo real
                </span>
              </div>
              {streamingBuffer && (
                <button
                  type="button"
                  onClick={() => setShowStreamingDebug((prev) => !prev)}
                  className="text-xs flex items-center gap-1 text-indigo-700 hover:text-indigo-950 font-mono py-1 px-2.5 rounded-lg hover:bg-white/80 border border-indigo-100 transition-colors"
                  title="Ver flujo de texto generado"
                >
                  <Terminal className="w-3 h-3" />
                  <span>{showStreamingDebug ? 'Ocultar tokens' : 'Ver tokens'}</span>
                  {showStreamingDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {streamingStatus && (
              <p className="mt-2.5 text-xs text-indigo-900 font-medium flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
                <span>{streamingStatus}</span>
              </p>
            )}

            {/* Live Token Stream Drawer */}
            {showStreamingDebug && streamingBuffer && (
              <div className="mt-3 pt-3 border-t border-indigo-100">
                <pre
                  ref={terminalRef}
                  className="max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed text-indigo-950 bg-white/90 p-3 rounded-lg border border-indigo-100 whitespace-pre-wrap break-words shadow-inner"
                >
                  {streamingBuffer}
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-600 animate-pulse align-middle" />
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 2. Step-by-Step Reasoning Spine directly on the canvas */}
        <div className="mb-8">
          <div className="flex items-center justify-between px-1 mb-4 pb-2 border-b border-gray-100">
            <span className="text-xs uppercase font-mono tracking-wider text-gray-400 font-semibold">
              Hilo de razonamiento ({session.steps.length} {session.steps.length === 1 ? 'paso' : 'pasos'})
            </span>
            <span className="text-xs text-gray-400">
              {isSidebarOpen ? 'Panel explicativo activo a la derecha' : 'Haz clic para ver analogía o por qué'}
            </span>
          </div>

          {/* Skeleton when 0 steps arrived so far during stream */}
          {session.steps.length === 0 && isStreaming && (
            <div className="p-8 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/20 text-center animate-pulse my-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2.5" />
              <p className="text-sm font-semibold text-gray-800">Deduciendo planteamiento analítico inicial...</p>
              <p className="text-xs text-gray-500 mt-1">Estructurando funciones, teoremas y pasos de resolución</p>
            </div>
          )}

          <div className="space-y-1">
            {session.steps.map((step, index) => {
              const isLast = index === session.steps.length - 1 && !isStreaming;
              const isStepActive = activeStepId === step.id;

              return (
                <StepCard
                  key={step.id}
                  step={step}
                  totalSteps={session.steps.length}
                  isLast={isLast}
                  onExploreHowWeGotHere={handleExploreClick}
                  onExplainSimpler={handleSimplerClick}
                  onExplainAnalogy={handleAnalogyClick}
                  onAskAboutPart={onAskAboutPart}
                  onOpenCustomQuestion={handleCustomQuestionClick}
                  isInspected={isStepActive}
                  activeQuestionType={isStepActive ? activeQuestionType : null}
                  isLoadingExplanation={isStepActive && isLoadingExplanation}
                />
              );
            })}

            {/* Next step composing indicator */}
            {session.steps.length > 0 && isStreaming && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 text-xs text-indigo-700 font-mono mt-3 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
                <span>Generando siguiente paso y justificación analítica...</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Final Result - Clean finish directly on background */}
        {session.finalResult && session.finalResult.latex ? (
          <div className="pt-6 pb-10 text-center border-t border-gray-200/80 transition-all duration-500">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-3">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Resultado Final</span>
            </div>

            <div className="my-3 py-2 overflow-x-auto">
              <div className="inline-block px-4 py-2 border-b-2 border-emerald-600">
                <MathView
                  math={session.finalResult.latex}
                  displayMode={true}
                  className="text-2xl sm:text-3xl md:text-4xl text-gray-900 font-serif-math font-semibold"
                />
              </div>
            </div>

            {session.finalResult.explanation && (
              <div className="text-gray-600 text-sm max-w-lg mx-auto mt-3 leading-relaxed">
                <FormattedMathText text={session.finalResult.explanation} asPill={true} />
              </div>
            )}
          </div>
        ) : isStreaming ? (
          <div className="pt-6 pb-8 text-center border-t border-gray-100 text-gray-400">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-50 border border-gray-100 text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
              <span>El resultado final se presentará al concluir los pasos...</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Floating / Sticky Right Sidebar for explanations & analogies */}
      {isSidebarOpen && activeStep && (
        <ExplanationSidebar
          step={activeStep}
          branch={activeBranch}
          isLoading={isLoadingExplanation && !activeBranch}
          onClose={() => {
            setActiveStepId(null);
            setActiveQuestionType(null);
          }}
          onAskFollowUp={onAskFollowUp}
          availableBranches={activeStepBranches}
          onSelectBranch={(branch) => {
            setActiveBranchId(branch.id);
            setActiveQuestionType(branch.questionType);
          }}
        />
      )}
    </div>
  );
};


