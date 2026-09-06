import React, { useState } from 'react';
import { X, Sparkles, ChevronDown, ChevronUp, BookOpen, Lightbulb, GitBranch } from 'lucide-react';
import { StepExplanationBranch } from '../types';
import { MathView } from './MathView';

interface SubflowBranchCardProps {
  branch: StepExplanationBranch;
  stepNumber: number;
  onClose: () => void;
  onAskFollowUp?: (branchId: string, question: string) => void;
}

export const SubflowBranchCard: React.FC<SubflowBranchCardProps> = ({
  branch,
  stepNumber,
  onClose,
  onAskFollowUp,
}) => {
  const [showAllIntermediates, setShowAllIntermediates] = useState(true);
  const [followUpText, setFollowUpText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpText.trim() || !onAskFollowUp) return;
    setIsSubmitting(true);
    onAskFollowUp(branch.id, followUpText.trim());
    setFollowUpText('');
    setIsSubmitting(false);
  };

  return (
    <div className="border-l-2 border-indigo-200 pl-4 py-2 mt-4 relative transition-all duration-200">
      {/* Geometric connection tick indicator */}
      <div className="absolute -left-[2px] top-4 w-3 h-[2px] bg-indigo-200" />

      <div className="bg-indigo-50/50 p-4 sm:p-5 rounded-2xl border border-indigo-100/60 shadow-xs">
        {/* Branch Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-indigo-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-widest flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" />
              <span>Explicación del Profesor · Paso {stepNumber}</span>
            </span>

            {branch.targetPart && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono bg-white text-gray-800 border border-indigo-200">
                Sobre: <MathView math={branch.targetPart} />
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            title="Cerrar y volver al flujo principal"
            className="p-1 rounded-lg text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100/60 transition-colors flex items-center gap-1 text-xs font-medium"
          >
            <span className="hidden sm:inline">Cerrar</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Question */}
        <div className="mt-3">
          <h4 className="text-base font-semibold text-gray-900 font-serif-math">
            {branch.title || branch.questionText}
          </h4>
          {branch.questionText && branch.questionText !== branch.title && (
            <p className="text-xs text-indigo-900/70 mt-0.5 italic">
              «{branch.questionText}»
            </p>
          )}
        </div>

        {/* Conceptual explanation */}
        <div className="mt-2.5 text-gray-800 text-sm leading-relaxed whitespace-pre-line">
          {branch.conceptualExplanation}
        </div>

        {/* Analogy if available */}
        {branch.analogy && (
          <div className="mt-4 p-3.5 rounded-xl bg-white/90 border border-indigo-100 text-gray-700 text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs">
            <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-gray-900 block mb-0.5">Analogía intuitiva:</span>
              <p className="leading-relaxed">{branch.analogy}</p>
            </div>
          </div>
        )}

        {/* Breakdown of intermediate steps */}
        {branch.breakdownSteps && branch.breakdownSteps.length > 0 && (
          <div className="mt-4 bg-white/90 rounded-xl p-3.5 border border-indigo-100 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
                Pasos intermedios desglosados:
              </span>
              <button
                type="button"
                onClick={() => setShowAllIntermediates(!showAllIntermediates)}
                className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium"
              >
                {showAllIntermediates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showAllIntermediates && (
              <div className="space-y-2.5 mt-2">
                {branch.breakdownSteps.map((subStep, sIdx) => (
                  <div key={sIdx} className="pl-3 border-l-2 border-indigo-200 py-1">
                    <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-0.5">
                      ↳ Paso {stepNumber}.{sIdx + 1}
                    </div>
                    <div className="my-1 overflow-x-auto py-0.5 text-gray-900">
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
          <div className="mt-3.5 p-3.5 rounded-xl bg-white/90 border border-indigo-100 text-xs sm:text-sm shadow-2xs">
            <span className="font-semibold text-gray-900 block mb-1">
              Ejemplo elemental análogo:
            </span>
            <div className="my-1 overflow-x-auto text-gray-900">
              <MathView math={branch.simplerExample.latex} />
            </div>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              {branch.simplerExample.explanation}
            </p>
          </div>
        )}

        {/* Rule deep dive if available */}
        {branch.ruleDeepDive && (
          <div className="mt-3.5 p-3.5 rounded-xl bg-white/90 border border-indigo-100 text-xs sm:text-sm shadow-2xs">
            <span className="font-semibold text-gray-900 block mb-1">
              Fundamento formal: {branch.ruleDeepDive.ruleName}
            </span>
            {branch.ruleDeepDive.formula && (
              <div className="my-1.5 py-1 px-2.5 rounded-md bg-indigo-100/60 inline-block font-mono text-xs text-indigo-950">
                <MathView math={branch.ruleDeepDive.formula} />
              </div>
            )}
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              {branch.ruleDeepDive.whyItWorks}
            </p>
          </div>
        )}

        {/* Follow up inquiry bar */}
        {onAskFollowUp && (
          <form onSubmit={handleFollowUpSubmit} className="mt-4 pt-3 border-t border-indigo-100 flex gap-2">
            <input
              type="text"
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              placeholder="¿Aún tienes dudas sobre este paso? Pregunta aquí..."
              className="flex-1 text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 shadow-2xs"
            />
            <button
              type="submit"
              disabled={!followUpText.trim() || isSubmitting}
              className="px-4 py-2 text-xs font-medium bg-black hover:bg-gray-800 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              Consultar
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

