import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Lightbulb,
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  GitBranch,
  ArrowRight
} from 'lucide-react';
import { SolutionStep, StepExplanationBranch } from '../types';
import { MathView } from './MathView';

interface ExplanationSidebarProps {
  step: SolutionStep;
  branch: StepExplanationBranch | null;
  isLoading?: boolean;
  onClose: () => void;
  onAskFollowUp?: (stepId: string, branchId: string, question: string) => void;
  availableBranches?: StepExplanationBranch[];
  onSelectBranch?: (branch: StepExplanationBranch) => void;
}

export const ExplanationSidebar: React.FC<ExplanationSidebarProps> = ({
  step,
  branch,
  isLoading = false,
  onClose,
  onAskFollowUp,
  availableBranches = [],
  onSelectBranch,
}) => {
  const [showAllIntermediates, setShowAllIntermediates] = useState(true);
  const [followUpText, setFollowUpText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpText.trim() || !onAskFollowUp || !branch) return;
    setIsSubmitting(true);
    onAskFollowUp(step.id, branch.id, followUpText.trim());
    setFollowUpText('');
    setIsSubmitting(false);
  };

  const getBranchTypeLabel = (type?: string) => {
    switch (type) {
      case 'how_did_we_get_here':
        return '¿Cómo llegamos aquí?';
      case 'analogy':
        return 'Analogía Intuitiva';
      case 'simpler':
        return 'Explicación Elemental';
      default:
        return 'Explicación del Tutor';
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {step.stepNumber}
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-600 font-bold">
              {getBranchTypeLabel(branch?.questionType)}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm font-serif-math">
            {step.title}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel lateral"
          className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Multiple branch tabs if user has asked multiple things about this step */}
      {availableBranches.length > 1 && (
        <div className="flex items-center gap-1.5 py-2 overflow-x-auto border-b border-gray-100 no-scrollbar">
          {availableBranches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelectBranch && onSelectBranch(b)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                branch?.id === b.id
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getBranchTypeLabel(b.questionType)}
            </button>
          ))}
        </div>
      )}

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {/* Step equation reference */}
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
            Ecuación del paso:
          </span>
          <div className="overflow-x-auto text-gray-900">
            <MathView math={step.latex} displayMode={true} />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-8 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500">
              Generando explicación razonada con el tutor...
            </p>
          </div>
        )}

        {/* Loaded Branch Content */}
        {!isLoading && branch && (
          <>
            {/* Conceptual Explanation */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Razonamiento conceptual:
              </span>
              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {branch.conceptualExplanation}
              </p>
            </div>

            {/* Analogy if available */}
            {branch.analogy && (
              <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-gray-700 text-xs sm:text-sm flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-indigo-950 block mb-0.5">
                    Analogía intuitiva:
                  </span>
                  <p className="leading-relaxed text-indigo-900/90">{branch.analogy}</p>
                </div>
              </div>
            )}

            {/* Intermediate breakdown steps */}
            {branch.breakdownSteps && branch.breakdownSteps.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    Pasos intermedios:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllIntermediates(!showAllIntermediates)}
                    className="text-xs text-gray-500 hover:text-black flex items-center gap-1 font-medium"
                  >
                    {showAllIntermediates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {showAllIntermediates && (
                  <div className="space-y-3 mt-2">
                    {branch.breakdownSteps.map((subStep, sIdx) => (
                      <div key={sIdx} className="pl-3 border-l-2 border-indigo-200 py-0.5">
                        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                          ↳ Paso {step.stepNumber}.{sIdx + 1}
                        </div>
                        <div className="my-1 overflow-x-auto text-gray-900">
                          <MathView math={subStep.latex} className="font-serif-math" />
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {subStep.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Simpler Example if available */}
            {branch.simplerExample && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/70 text-xs sm:text-sm">
                <span className="font-semibold text-gray-900 block mb-1">
                  Ejemplo análogo elemental:
                </span>
                <div className="my-1 overflow-x-auto text-gray-900">
                  <MathView math={branch.simplerExample.latex} />
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {branch.simplerExample.explanation}
                </p>
              </div>
            )}

            {/* Formal Rule Deep Dive if available */}
            {branch.ruleDeepDive && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/70 text-xs sm:text-sm">
                <span className="font-semibold text-gray-900 block mb-1">
                  Fundamento: {branch.ruleDeepDive.ruleName}
                </span>
                {branch.ruleDeepDive.formula && (
                  <div className="my-1.5 py-1 px-2.5 rounded-md bg-white border border-gray-200 inline-block font-mono text-xs text-gray-900">
                    <MathView math={branch.ruleDeepDive.formula} />
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {branch.ruleDeepDive.whyItWorks}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Follow-up inquiry footer */}
      {onAskFollowUp && branch && !isLoading && (
        <form onSubmit={handleFollowUpSubmit} className="pt-3 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            placeholder="¿Dudas sobre este paso? Pregunta aquí..."
            className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!followUpText.trim() || isSubmitting}
            className="px-3.5 py-2 text-xs font-medium bg-black hover:bg-gray-800 text-white rounded-xl transition-colors disabled:opacity-50 shrink-0"
          >
            Enviar
          </button>
        </form>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Drawer (Overlay for < lg) */}
      <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-2xs transition-opacity"
          onClick={onClose}
        />
        <div className="relative w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl p-5 z-10 animate-in slide-in-from-right duration-200 flex flex-col">
          {content}
        </div>
      </div>

      {/* Desktop Sticky Floating Sidebar (for lg and up) */}
      <aside className="hidden lg:block w-80 xl:w-96 shrink-0 sticky top-20 self-start">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 max-h-[calc(100vh-6.5rem)] flex flex-col">
          {content}
        </div>
      </aside>
    </>
  );
};
