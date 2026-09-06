import React, { useState, useEffect } from 'react';
import { CheckCircle2, Bookmark, BookmarkCheck, Copy, Check } from 'lucide-react';
import { SolutionSession, SolutionStep, StepExplanationBranch } from '../types';
import { MathView } from './MathView';
import { StepCard } from './StepCard';
import { ExplanationSidebar } from './ExplanationSidebar';

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
}) => {
  const [copied, setCopied] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [activeQuestionType, setActiveQuestionType] = useState<string | null>(null);

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
        <div className="py-4 sm:py-6 mb-8 text-center relative border-b border-gray-100">
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {categoryLabels[session.expression.category] || 'Cálculo'}
            </span>

            <div className="flex items-center gap-1.5">
              {onToggleSave && (
                <button
                  type="button"
                  onClick={() => onToggleSave(session.id)}
                  title={session.isSaved ? 'Guardado en favoritos' : 'Guardar ejercicio'}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {session.isSaved ? (
                    <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                title="Copiar LaTeX"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-1 text-xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <h2 className="text-xs uppercase tracking-wider text-gray-400 font-mono mb-2">
            Problema actual
          </h2>

          <div className="my-4 py-2 overflow-x-auto">
            <div className="inline-block border-b-2 border-black pb-2 px-3">
              <MathView
                math={session.expression.formattedLatex}
                displayMode={true}
                className="text-2xl sm:text-3xl md:text-4xl text-gray-900 font-serif-math"
              />
            </div>
          </div>

          {session.summary && (
            <p className="text-gray-600 text-sm max-w-xl mx-auto mt-2 leading-relaxed">
              {session.summary}
            </p>
          )}
        </div>

        {/* 2. Step-by-Step Reasoning Spine directly on the canvas */}
        <div className="mb-8">
          <div className="flex items-center justify-between px-1 mb-4 pb-2 border-b border-gray-100">
            <span className="text-xs uppercase font-mono tracking-wider text-gray-400 font-semibold">
              Hilo de razonamiento ({session.steps.length} pasos)
            </span>
            <span className="text-xs text-gray-400">
              {isSidebarOpen ? 'Panel explicativo activo a la derecha' : 'Haz clic para ver analogía o por qué'}
            </span>
          </div>

          <div className="space-y-1">
            {session.steps.map((step, index) => {
              const isLast = index === session.steps.length - 1;
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
          </div>
        </div>

        {/* 3. Final Result - Clean finish directly on background */}
        <div className="pt-6 pb-10 text-center border-t border-gray-200/80">
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
            <p className="text-gray-600 text-sm max-w-lg mx-auto mt-3 leading-relaxed">
              {session.finalResult.explanation}
            </p>
          )}
        </div>
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


