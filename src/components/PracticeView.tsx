import React, { useState } from 'react';
import {
  Sparkles,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Eye,
  Award
} from 'lucide-react';
import { PracticeExercise, PracticeStep } from '../types';
import { MathView } from './MathView';
import { MathInputBar } from './MathInputBar';
import { naturalInputToLatex } from '../utils/mathParser';

interface PracticeViewProps {
  exercise: PracticeExercise;
  onValidateStep: (proposal: string) => Promise<{
    isCorrect: boolean;
    feedback: string;
    hint?: string;
    canAdvance: boolean;
    revealedStep?: string;
  }>;
  onNextExercise: (topic: string) => void;
  isLoading?: boolean;
}

const PRACTICE_TOPICS = [
  'Integración por partes',
  'Regla de la cadena',
  'Límites indeterminados 0/0',
  'Sustitución trigonométrica',
  'Regla del cociente',
];

export const PracticeView: React.FC<PracticeViewProps> = ({
  exercise,
  onValidateStep,
  onNextExercise,
  isLoading = false,
}) => {
  const [userInput, setUserInput] = useState('');
  const [revealedHints, setRevealedHints] = useState<number>(0);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    text: string;
    hint?: string;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showFullSolution, setShowFullSolution] = useState(false);
  const [revealedCurrentStep, setRevealedCurrentStep] = useState<string | null>(null);

  const currentStep: PracticeStep | undefined = exercise.steps[exercise.currentStepIndex];
  const isFinished = exercise.currentStepIndex >= exercise.steps.length;

  const handleValidate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isEvaluating || !currentStep) return;

    setIsEvaluating(true);
    try {
      const result = await onValidateStep(userInput.trim());
      setFeedback({
        isCorrect: result.isCorrect,
        text: result.feedback,
        hint: result.hint,
      });

      if (result.isCorrect) {
        setUserInput('');
        setRevealedHints(0);
        setRevealedCurrentStep(null);
      }
    } catch (err) {
      setFeedback({
        isCorrect: false,
        text: 'No pudimos validar tu respuesta en este momento. Intenta nuevamente.',
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRequestHint = () => {
    if (!currentStep) return;
    setRevealedHints((prev) => Math.min(prev + 1, currentStep.hints.length));
  };

  const handleRevealStep = () => {
    if (!currentStep) return;
    setRevealedCurrentStep(currentStep.expectedLatex);
    setFeedback({
      isCorrect: true,
      text: 'Paso revelado con fines didácticos. Analiza la estructura para continuar.',
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
      {/* Topics selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 text-xs no-scrollbar">
        <span className="text-gray-400 font-medium shrink-0 mr-1 text-xs">Tema:</span>
        {PRACTICE_TOPICS.map((topic, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onNextExercise(topic)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
              exercise.topic === topic
                ? 'bg-black text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400 hover:text-black'
            }`}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Main Exercise - Clean on background */}
      <div className="py-4 sm:py-6 text-center relative mb-6 border-b border-gray-100">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700">
            Práctica Activa · {exercise.topic}
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {isFinished ? 'Completado' : `Paso ${exercise.currentStepIndex + 1} de ${exercise.steps.length}`}
          </span>
        </div>

        <h2 className="text-base sm:text-lg font-serif-math font-semibold text-gray-900 mb-2">
          {exercise.title}
        </h2>

        <div className="my-4 py-2 overflow-x-auto">
          <div className="inline-block border-b-2 border-black pb-2 px-3">
            <MathView
              math={exercise.problemLatex}
              displayMode={true}
              className="text-2xl sm:text-3xl text-gray-900 font-serif-math"
            />
          </div>
        </div>

        {exercise.context && (
          <p className="text-gray-600 text-xs sm:text-sm max-w-md mx-auto mt-2 leading-relaxed">
            {exercise.context}
          </p>
        )}

        {/* Step progress bar */}
        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-6 overflow-hidden">
          <div
            className="bg-black h-full rounded-full transition-all duration-300"
            style={{
              width: `${(exercise.currentStepIndex / exercise.steps.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Active Step Interaction - Directly on background */}
      {!isFinished && currentStep && (
        <div className="py-4 mb-6 space-y-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase font-mono tracking-wider text-gray-400 font-semibold mb-1">
                Tu turno:
              </div>
              <h3 className="text-base font-semibold text-gray-900 font-serif-math">
                {currentStep.instruction}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleRequestHint}
              disabled={revealedHints >= currentStep.hints.length}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200/80 hover:bg-indigo-100 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {revealedHints >= currentStep.hints.length
                  ? 'Todas las pistas vistas'
                  : 'Pedir pista'}
              </span>
            </button>
          </div>

          {/* Revealed hints if user asked for them */}
          {revealedHints > 0 && (
            <div className="space-y-1.5 p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs">
              <span className="font-semibold text-indigo-900 block mb-1">
                Pistas del tutor:
              </span>
              {currentStep.hints.slice(0, revealedHints).map((hint, hIdx) => (
                <p key={hIdx} className="text-indigo-950 flex items-start gap-1.5 leading-relaxed">
                  <span className="font-mono text-indigo-600 shrink-0">#{hIdx + 1}:</span>
                  <span>{hint}</span>
                </p>
              ))}
            </div>
          )}

          {/* User Step Input Form */}
          <form onSubmit={handleValidate} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Escribe tu propuesta (ej: u = x, dv = cos(x) dx ...)"
                disabled={isEvaluating}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:bg-white focus:border-gray-400 transition-all font-mono"
              />
            </div>

            {/* Live preview of input */}
            {userInput.trim() && (
              <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 flex items-center justify-between border border-gray-100">
                <span className="text-gray-400 font-mono text-[11px] uppercase tracking-wider">Formato matemático:</span>
                <MathView math={naturalInputToLatex(userInput)} />
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handleRevealStep}
                className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>¿Atascado? Revelar este paso</span>
              </button>

              <button
                type="submit"
                disabled={!userInput.trim() || isEvaluating}
                className="px-5 py-2.5 rounded-xl bg-black text-white hover:bg-gray-800 transition-all text-xs sm:text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                {isEvaluating ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Comprobar paso</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Revealed step if requested */}
          {revealedCurrentStep && (
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <span className="text-gray-500 block mb-1 font-medium">Respuesta sugerida para avanzar:</span>
              <MathView math={revealedCurrentStep} displayMode={true} />
            </div>
          )}

          {/* Tutor Feedback Banner */}
          {feedback && (
            <div
              className={`p-4 rounded-xl text-xs sm:text-sm border transition-all ${
                feedback.isCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {feedback.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{feedback.text}</p>
                  {feedback.hint && !feedback.isCorrect && (
                    <p className="mt-1 text-xs text-rose-800 opacity-90">
                      💡 Consejo: {feedback.hint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completion Celebration Card */}
      {isFinished && (
        <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200/80 p-8 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-serif-math font-semibold text-emerald-950">
              ¡Ejercicio completado con éxito!
            </h3>
            <p className="text-xs sm:text-sm text-emerald-800/80 mt-1 max-w-md mx-auto leading-relaxed">
              Has razonado cada transformación sin saltarte los conceptos fundamentales.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => onNextExercise(exercise.topic)}
              className="px-5 py-2.5 rounded-xl bg-black text-white hover:bg-gray-800 text-xs sm:text-sm font-medium transition-all shadow-xs flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practicar otro ejercicio</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
