import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, X, Keyboard, HelpCircle } from 'lucide-react';
import 'mathlive';
import type { MathfieldElement } from 'mathlive';

interface MathInputBarProps {
  onSolve: (rawInput: string, latex: string) => void;
  isLoading?: boolean;
  initialValue?: string;
  isCompact?: boolean;
}

interface MathChip {
  label: string;
  command: string;
  hint: string;
}

const MATH_CHIPS: MathChip[] = [
  { label: '∫ dx', command: '\\int #?\\, dx', hint: 'Integral indefinida' },
  { label: '∫ₐᵇ', command: '\\int_{0}^{1} #?\\, dx', hint: 'Integral definida' },
  { label: 'd/dx', command: '\\frac{d}{dx}\\left(#?\\right)', hint: 'Derivada' },
  { label: 'lim', command: '\\lim_{x \\to 0} #?', hint: 'Límite cuando x tiende a 0' },
  { label: 'a/b', command: '\\frac{#@}{#?}', hint: 'Fracción (también puedes teclear /)' },
  { label: '√x', command: '\\sqrt{#@}', hint: 'Raíz cuadrada (o escribe raiz/sqrt)' },
  { label: 'xⁿ', command: '#@^{2}', hint: 'Potencia al cuadrado (o escribe ^)' },
  { label: 'eˣ', command: 'e^{#?}', hint: 'Exponencial' },
  { label: 'ln', command: '\\ln\\left(#?\\right)', hint: 'Logaritmo natural' },
  { label: 'sen', command: '\\sin\\left(#?\\right)', hint: 'Seno' },
  { label: 'cos', command: '\\cos\\left(#?\\right)', hint: 'Coseno' },
  { label: 'π', command: '\\pi', hint: 'Constante Pi' },
  { label: '∞', command: '\\infty', hint: 'Infinito' },
];

const CUSTOM_INLINE_SHORTCUTS: Record<string, string> = {
  raiz: '\\sqrt{#?}',
  'raíz': '\\sqrt{#?}',
  sqrt: '\\sqrt{#?}',
  integral: '\\int #?\\, dx',
  int: '\\int #?\\, dx',
  derivada: '\\frac{d}{dx}\\left(#?\\right)',
  diff: '\\frac{d}{dx}\\left(#?\\right)',
  limite: '\\lim_{x \\to 0} #?',
  'límite': '\\lim_{x \\to 0} #?',
  lim: '\\lim_{x \\to 0} #?',
  sen: '\\sin\\left(#?\\right)',
  seno: '\\sin\\left(#?\\right)',
  cos: '\\cos\\left(#?\\right)',
  tan: '\\tan\\left(#?\\right)',
  infinito: '\\infty',
  inf: '\\infty',
  pi: '\\pi',
};

export const MathInputBar: React.FC<MathInputBarProps> = ({
  onSolve,
  isLoading = false,
  initialValue = '',
  isCompact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mathFieldRef = useRef<MathfieldElement | null>(null);
  const [latexValue, setLatexValue] = useState<string>(initialValue);
  const [showTips, setShowTips] = useState<boolean>(false);

  const handleSubmit = () => {
    const mf = mathFieldRef.current;
    if (!mf || !mf.isConnected || isLoading) return;

    let currentLatex = '';
    try {
      currentLatex = mf.value.trim();
    } catch {
      return;
    }

    if (!currentLatex) return;

    // Provide both raw-like math and full LaTeX for the solver
    let rawLike = currentLatex;
    try {
      rawLike = (mf as any).getValue?.('ascii-math') || currentLatex;
    } catch {
      rawLike = currentLatex;
    }

    onSolve(rawLike, currentLatex);
  };

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  // Mount and configure MathLive interactive math field
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any previous child nodes
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const mf = document.createElement('math-field') as MathfieldElement;

    // Set layout styling before DOM append
    mf.style.display = 'block';
    mf.style.width = '100%';
    mf.style.fontSize = isCompact ? '1.35rem' : '1.55rem';
    mf.style.minHeight = isCompact ? '48px' : '56px';
    mf.style.padding = '8px 12px';
    mf.style.background = 'transparent';
    mf.style.border = 'none';
    mf.style.outline = 'none';
    mf.style.boxShadow = 'none';
    mf.style.color = '#111827';
    mf.style.fontFamily = "'Lora', Georgia, serif";

    // CRITICAL: Must append to DOM FIRST so custom element connectedCallback runs
    container.appendChild(mf);
    mathFieldRef.current = mf;

    // Now that mf is connected, options can safely be applied without "Mathfield not mounted"
    try {
      mf.mathVirtualKeyboardPolicy = 'manual';
      mf.smartFence = true;
      mf.smartSuperscript = true;
      mf.smartMode = true;
      mf.inlineShortcuts = CUSTOM_INLINE_SHORTCUTS;
    } catch (err) {
      console.warn('Mathfield option setup warning:', err);
    }

    // Set initial content once mounted
    if (initialValue) {
      try {
        mf.setValue(initialValue);
        setLatexValue(initialValue);
      } catch (err) {
        console.warn('Initial LaTeX parse note:', err);
      }
    }

    // Event listener: input changed
    const handleInput = () => {
      try {
        if (mf.isConnected) {
          setLatexValue(mf.value);
        }
      } catch {}
    };

    // Event listener: Enter key to solve
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmitRef.current();
      }
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('keydown', handleKeyDown);

    // Auto-focus after mounted
    if (!isCompact) {
      const timer = setTimeout(() => {
        try {
          if (mf.isConnected) {
            mf.focus();
          }
        } catch {}
      }, 80);
      return () => {
        clearTimeout(timer);
        mf.removeEventListener('input', handleInput);
        mf.removeEventListener('keydown', handleKeyDown);
        mathFieldRef.current = null;
        if (mf.parentElement) {
          mf.parentElement.removeChild(mf);
        }
      };
    }

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('keydown', handleKeyDown);
      mathFieldRef.current = null;
      if (mf.parentElement) {
        mf.parentElement.removeChild(mf);
      }
    };
  }, [isCompact]);

  // Sync initialValue updates from presets or external clicks
  useEffect(() => {
    const mf = mathFieldRef.current;
    if (mf && mf.isConnected && initialValue) {
      try {
        if (mf.value !== initialValue) {
          mf.setValue(initialValue);
          setLatexValue(initialValue);
        }
      } catch (err) {
        console.warn('Sync LaTeX parse note:', err);
      }
    }
  }, [initialValue]);

  // Clear field
  const handleClear = () => {
    const mf = mathFieldRef.current;
    if (mf && mf.isConnected) {
      try {
        mf.setValue('');
        setLatexValue('');
        mf.focus();
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // Insert math template at active cursor position (or wrapping selected expression)
  const handleInsertChip = (chip: MathChip) => {
    const mf = mathFieldRef.current;
    if (!mf || !mf.isConnected) return;

    try {
      mf.focus();
      mf.insert(chip.command);
      setLatexValue(mf.value);
    } catch {
      try {
        mf.executeCommand(['insert', chip.command]);
        setLatexValue(mf.value);
      } catch (err) {
        console.warn('Insert command note:', err);
      }
    }
  };

  // Toggle virtual keyboard if desired
  const handleToggleKeyboard = () => {
    if (typeof window !== 'undefined' && (window as any).mathVirtualKeyboard) {
      try {
        const vk = (window as any).mathVirtualKeyboard;
        if (vk.visible) {
          vk.hide();
        } else {
          if (mathFieldRef.current && mathFieldRef.current.isConnected) {
            mathFieldRef.current.focus();
          }
          vk.show();
        }
      } catch (err) {
        console.warn('Virtual keyboard note:', err);
      }
    }
  };

  const hasValue = !!latexValue.trim();

  return (
    <div className={`w-full transition-all ${isCompact ? 'max-w-4xl mx-auto' : 'max-w-3xl sm:max-w-4xl mx-auto'}`}>
      <div className="relative">
        {/* Unified Interactive Math Editor Container */}
        <div
          className={`relative rounded-2xl bg-white border border-gray-200/90 shadow-sm transition-all duration-200 focus-within:border-black focus-within:shadow-md ${
            isCompact ? 'p-2 sm:p-2.5' : 'p-3.5 sm:p-4'
          }`}
        >
          {/* Top subtle bar: Mode indication & helpful quick actions */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-1 border-b border-gray-100 text-xs text-gray-500">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Editor Interactivo
              </span>
              <span className="hidden sm:inline text-gray-400">
                — Haz clic en denominadores, raíces o exponentes para editar directo
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowTips(!showTips)}
                title="Ver atajos de teclado y tips"
                className={`p-1 rounded-md transition-colors text-xs flex items-center gap-1 ${
                  showTips ? 'bg-gray-100 text-black font-medium' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Tips</span>
              </button>

              <button
                type="button"
                onClick={handleToggleKeyboard}
                title="Alternar teclado matemático virtual"
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xs flex items-center gap-1"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Teclado</span>
              </button>

              {hasValue && !isLoading && (
                <button
                  type="button"
                  onClick={handleClear}
                  title="Limpiar fórmula"
                  className="p-1 px-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xs flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Borrar</span>
                </button>
              )}
            </div>
          </div>

          {/* Tips expandable helper */}
          {showTips && (
            <div className="mb-2 p-2.5 bg-gray-50 rounded-xl text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-1.5 border border-gray-100 animate-in fade-in duration-150">
              <div>
                • Escribe <code className="text-indigo-600 bg-white px-1 py-0.5 rounded border border-gray-200">raiz</code> o <code className="text-indigo-600 bg-white px-1 py-0.5 rounded border border-gray-200">sqrt</code> y se creará una raíz.
              </div>
              <div>
                • Escribe <code className="text-indigo-600 bg-white px-1 py-0.5 rounded border border-gray-200">/</code> para crear una fracción y bajar al denominador.
              </div>
              <div>
                • Flechas <code className="text-gray-800 bg-white px-1 py-0.5 rounded border border-gray-200">↑ ↓</code> para subir al numerador o bajar al denominador.
              </div>
              <div>
                • Escribe <code className="text-indigo-600 bg-white px-1 py-0.5 rounded border border-gray-200">integral</code> o <code className="text-indigo-600 bg-white px-1 py-0.5 rounded border border-gray-200">int</code> para crear el símbolo de integral.
              </div>
            </div>
          )}

          {/* Interactive MathField Canvas + Solve Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center text-gray-400 font-serif-math italic text-lg sm:text-xl select-none shrink-0 pl-1">
              f(x) =
            </div>

            {/* Container where MathLive mounts its custom element */}
            <div
              ref={containerRef}
              id="interactive-math-field-container"
              className="flex-1 min-w-0 overflow-x-auto py-1"
            />

            {/* Solve Action Button */}
            <button
              id="submit-expression-button"
              type="button"
              onClick={handleSubmit}
              disabled={!hasValue || isLoading}
              aria-label="Resolver expresión matemática"
              className={`flex items-center justify-center rounded-xl transition-all duration-200 font-medium shrink-0 ${
                hasValue && !isLoading
                  ? 'bg-black text-white hover:bg-gray-800 shadow-xs active:scale-95'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              } ${
                isCompact
                  ? 'px-3.5 py-2 text-xs gap-1.5'
                  : 'px-4 py-2.5 sm:px-5 sm:py-3 text-sm gap-2'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="hidden sm:inline">Resolver</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Math Symbols: Click to insert at cursor or wrap selected math */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-gray-400 text-[11px] font-medium shrink-0 mr-1 flex items-center gap-1">
            Insertar en cursor:
          </span>
          {MATH_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              id={`quick-chip-${idx}`}
              type="button"
              onClick={() => handleInsertChip(chip)}
              title={chip.hint}
              className="px-2.5 py-1 rounded-full bg-white border border-gray-200 hover:border-black text-gray-700 hover:text-black text-xs font-mono transition-colors shrink-0 shadow-2xs hover:bg-gray-50 active:scale-95"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
