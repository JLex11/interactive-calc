import React, { useState } from 'react';
import {
  HelpCircle,
  Sparkles,
  Layers,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus
} from 'lucide-react';
import { SolutionStep } from '../types';
import { MathView } from './MathView';

interface StepCardProps {
  step: SolutionStep;
  totalSteps: number;
  isLast: boolean;
  onExploreHowWeGotHere: (step: SolutionStep) => void;
  onExplainSimpler: (step: SolutionStep) => void;
  onExplainAnalogy: (step: SolutionStep) => void;
  onAskAboutPart: (step: SolutionStep, part: string) => void;
  onOpenCustomQuestion: (step: SolutionStep) => void;
  isInspected?: boolean;
  activeQuestionType?: string | null;
  isLoadingExplanation?: boolean;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  totalSteps,
  isLast,
  onExploreHowWeGotHere,
  onExplainSimpler,
  onExplainAnalogy,
  onAskAboutPart,
  onOpenCustomQuestion,
  isInspected = false,
  activeQuestionType = null,
  isLoadingExplanation = false,
}) => {
  const [showBuiltinIntermediate, setShowBuiltinIntermediate] = useState(false);

  return (
    <div className="relative group">
      {/* Central Geometric Spine connecting to next step */}
      {!isLast && (
        <div className="absolute left-[11px] top-7 bottom-0 w-px bg-gray-200 -z-10 group-hover:bg-gray-300 transition-colors" />
      )}

      {/* Step Row with Geometric Badge */}
      <div className="flex items-start gap-4">
        {/* Geometric Black Circular Badge */}
        <div
          className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-1 select-none relative z-10 transition-colors ${
            isInspected
              ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
              : 'bg-black text-white shadow-xs'
          }`}
        >
          {step.stepNumber}
        </div>

        {/* Step Content - Seamlessly on the background without boxed cards */}
        <div className="flex-1 pb-7 mb-3 border-b border-gray-100/90 last:border-b-0">
          {/* Step Header */}
          <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg font-serif-math">
              {step.title}
            </h3>

            {step.rule && (
              <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {step.rule}
              </span>
            )}
          </div>

          {/* Mathematical Equation Display - Directly on background */}
          <div className="my-3 py-2 overflow-x-auto">
            <div className="inline-block border-b border-gray-100 pb-1">
              <MathView
                math={step.latex}
                displayMode={true}
                className="text-gray-900 text-base sm:text-lg md:text-xl font-serif-math"
              />
            </div>
          </div>

          {/* Pedagogical Explanation */}
          <p className="text-gray-600 text-sm leading-relaxed mt-2">
            {step.explanation}
          </p>

          {/* Clickable Subterms */}
          {step.subterms && step.subterms.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">
                Términos:
              </span>
              {step.subterms.map((term, tIdx) => (
                <button
                  key={tIdx}
                  type="button"
                  onClick={() => onAskAboutPart(step, term)}
                  title={`Preguntar sobre ${term}`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-gray-100 hover:bg-indigo-50 hover:text-indigo-900 text-gray-700 transition-colors"
                >
                  <MathView math={term} />
                  <HelpCircle className="w-3 h-3 text-gray-400" />
                </button>
              ))}
            </div>
          )}

          {/* Built-in intermediate steps accordion if available */}
          {step.intermediateSteps && step.intermediateSteps.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowBuiltinIntermediate(!showBuiltinIntermediate)}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1.5 font-medium transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                <span>
                  {showBuiltinIntermediate
                    ? 'Ocultar pasos intermedios'
                    : `Ver ${step.intermediateSteps.length} paso${step.intermediateSteps.length > 1 ? 's' : ''} intermedio${step.intermediateSteps.length > 1 ? 's' : ''}`}
                </span>
                {showBuiltinIntermediate ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showBuiltinIntermediate && (
                <div className="mt-2.5 space-y-2 pl-4 border-l-2 border-indigo-200 py-1">
                  {step.intermediateSteps.map((sub, sIdx) => (
                    <div key={sIdx} className="text-xs text-gray-700 py-1">
                      <div className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">
                        ↳ Desglose {step.stepNumber}.{sIdx + 1}
                      </div>
                      <div className="my-1 overflow-x-auto text-gray-900">
                        <MathView math={sub.latex} />
                      </div>
                      <p className="text-gray-600">{sub.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Geometric Balance Action Bar - Pill buttons directly on the background */}
          <div className="mt-4 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Highlight Action: ¿Cómo llegamos aquí? */}
              <button
                type="button"
                onClick={() => onExploreHowWeGotHere(step)}
                disabled={isLoadingExplanation}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                  isInspected && activeQuestionType === 'how_did_we_get_here'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>¿Cómo llegamos aquí?</span>
              </button>

              <button
                type="button"
                onClick={() => onExplainSimpler(step)}
                disabled={isLoadingExplanation}
                className={`px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 text-xs ${
                  isInspected && activeQuestionType === 'simpler'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-gray-500" />
                <span>Más sencillo</span>
              </button>

              <button
                type="button"
                onClick={() => onExplainAnalogy(step)}
                disabled={isLoadingExplanation}
                className={`px-3 py-1.5 rounded-full font-medium transition-all hidden sm:flex items-center gap-1.5 text-xs ${
                  isInspected && activeQuestionType === 'analogy'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-gray-500" />
                <span>Analogía</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenCustomQuestion(step)}
              disabled={isLoadingExplanation}
              className="px-2.5 py-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-black transition-colors flex items-center gap-1 text-xs font-medium"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-gray-400" />
              <span>Preguntar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

