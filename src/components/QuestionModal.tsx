import React, { useState } from 'react';
import { X, Sparkles, Send, HelpCircle, MessageSquare, Lightbulb } from 'lucide-react';
import { SolutionStep, ExplanationQuestionType } from '../types';
import { MathView } from './MathView';

interface QuestionModalProps {
  isOpen: boolean;
  step: SolutionStep | null;
  initialPart?: string;
  onClose: () => void;
  onSubmitQuestion: (params: {
    step: SolutionStep;
    questionType: ExplanationQuestionType;
    questionText: string;
    targetPart?: string;
  }) => void;
  isLoading?: boolean;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  step,
  initialPart,
  onClose,
  onSubmitQuestion,
  isLoading = false,
}) => {
  if (!isOpen || !step) return null;

  const [selectedPart, setSelectedPart] = useState<string>(initialPart || '');
  const [customText, setCustomText] = useState('');
  const [questionType, setQuestionType] = useState<ExplanationQuestionType>(
    initialPart ? 'part_question' : 'how_did_we_get_here'
  );

  const QUICK_PROMPTS = selectedPart
    ? [
        `¿Qué significa ${selectedPart} en este contexto?`,
        `¿Por qué su derivada o integral se comporta así?`,
        `¿Qué papel juega ${selectedPart} en este paso?`,
        `Explícame esta parte de forma muy sencilla.`
      ]
    : [
        '¿Cómo pasamos de la expresión anterior a esta?',
        '¿Por qué aplicamos esta regla y no otra?',
        'Explícamelo con una analogía de la vida real.',
        '¿Cuáles son los fundamentos matemáticos de este paso?'
      ];

  const handleSubmit = (promptText?: string) => {
    const text = promptText || customText.trim();
    if (!text && !promptText) return;

    onSubmitQuestion({
      step,
      questionType,
      questionText: text,
      targetPart: selectedPart || undefined,
    });
    setCustomText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-2xs transition-opacity animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center select-none">
              {step.stepNumber}
            </span>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base font-serif-math">
              Preguntar al Tutor sobre el Paso {step.stepNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Step equation preview */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
            <span className="text-[10px] font-mono text-gray-400 block mb-1 uppercase tracking-wider">
              Ecuación del paso
            </span>
            <MathView math={step.latex} displayMode={true} className="text-gray-900" />
          </div>

          {/* Subterms selection if available */}
          {step.subterms && step.subterms.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                ¿Te refieres a una parte específica?
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedPart('')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    !selectedPart
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todo el paso
                </button>
                {step.subterms.map((part, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedPart(part)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
                      selectedPart === part
                        ? 'bg-indigo-50 text-indigo-900 border-indigo-300 font-semibold'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <MathView math={part} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick prompt suggestions */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              Preguntas sugeridas:
            </label>
            <div className="space-y-1.5">
              {QUICK_PROMPTS.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleSubmit(prompt)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 hover:text-black text-xs sm:text-sm border border-gray-200/80 transition-all flex items-center justify-between group"
                >
                  <span>{prompt}</span>
                  <Sparkles className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>

          {/* Custom free question textarea */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              O escribe tu duda con tus propias palabras:
            </label>
            <div className="relative">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Ejemplo: No entiendo de dónde salió el signo negativo o por qué se integró así..."
                rows={3}
                className="w-full p-3 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-gray-400 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-full text-xs font-medium text-gray-600 hover:text-black hover:bg-gray-200/60 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!customText.trim() || isLoading}
            className="px-4 py-2 rounded-full text-xs font-medium bg-black hover:bg-gray-800 text-white transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Consultar al tutor</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
