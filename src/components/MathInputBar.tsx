import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, X } from 'lucide-react';
import 'mathlive';
import type { MathfieldElement } from 'mathlive';
import { fillMathPlaceholdersWithDefaults, naturalInputToLatex } from '../utils/mathParser';

interface MathInputBarProps {
  onSolve: (rawInput: string, latex: string) => void;
  isLoading?: boolean;
  initialValue?: string;
  isCompact?: boolean;
  onExpansionChange?: (expanded: boolean) => void;
}

interface MathChip {
  label: string;
  command: string;
  hint: string;
}

const MATH_CHIPS: MathChip[] = [
  { label: '∫ dx', command: '\\int #?\\, dx', hint: 'Integral (o escribe integral / int)' },
  { label: '∫ₐᵇ', command: '\\int_{0}^{1} #?\\, dx', hint: 'Integral definida (o escribe integraldef)' },
  { label: 'd/dx', command: '\\frac{d}{dx}\\left(#?\\right)', hint: 'Derivada (o escribe derivada / diff)' },
  { label: 'lim', command: '\\lim_{x \\to 0} #?', hint: 'Límite (o escribe limite / lim)' },
  { label: 'a/b', command: '\\frac{#?}{#?}', hint: 'Fracción (o escribe fraccion / sobre / /)' },
  { label: '√x', command: '\\sqrt{#?}', hint: 'Raíz cuadrada (o escribe raiz / sqrt)' },
  { label: '∛x', command: '\\sqrt[3]{#?}', hint: 'Raíz cúbica (o escribe raiz3 / cbrt)' },
  { label: 'x²', command: '#@^{2}', hint: 'Al cuadrado (o escribe cuadrado / alcuadrado)' },
  { label: 'xⁿ', command: '#@^{#?}', hint: 'Elevado (o escribe elevado / potencia / ^)' },
  { label: 'eˣ', command: 'e^{#?}', hint: 'Exponencial (o escribe exp)' },
  { label: 'ln', command: '\\ln\\left(#?\\right)', hint: 'Logaritmo natural (o escribe ln)' },
  { label: 'log', command: '\\log\\left(#?\\right)', hint: 'Logaritmo (o escribe log)' },
  { label: 'sen', command: '\\sin\\left(#?\\right)', hint: 'Seno (o escribe sen / seno)' },
  { label: 'cos', command: '\\cos\\left(#?\\right)', hint: 'Coseno (o escribe cos / coseno)' },
  { label: 'tan', command: '\\tan\\left(#?\\right)', hint: 'Tangente (o escribe tan / tangente)' },
  { label: 'π', command: '\\pi', hint: 'Pi (o escribe pi)' },
  { label: '∞', command: '\\infty', hint: 'Infinito (o escribe inf / infinito)' },
];

const CUSTOM_INLINE_SHORTCUTS: Record<string, string> = {
  // Potencias y exponentes
  elevado: '#@^{#?}',
  potencia: '#@^{#?}',
  cuadrado: '#@^{2}',
  alcuadrado: '#@^{2}',
  cubo: '#@^{3}',
  alcubo: '#@^{3}',
  exp: 'e^{#?}',
  exponencial: 'e^{#?}',

  // Raíces
  raiz: '\\sqrt{#?}',
  'raíz': '\\sqrt{#?}',
  sqrt: '\\sqrt{#?}',
  raizcuadrada: '\\sqrt{#?}',
  raiz3: '\\sqrt[3]{#?}',
  raizcubica: '\\sqrt[3]{#?}',
  'raízcúbica': '\\sqrt[3]{#?}',
  cbrt: '\\sqrt[3]{#?}',

  // Fracciones y división
  fraccion: '\\frac{#@}{#?}',
  'fracción': '\\frac{#@}{#?}',
  frac: '\\frac{#@}{#?}',
  sobre: '\\frac{#@}{#?}',
  entre: '\\frac{#@}{#?}',
  div: '\\frac{#@}{#?}',
  dividido: '\\frac{#@}{#?}',

  // Cálculo (derivadas, integrales, límites)
  derivada: '\\frac{d}{dx}\\left(#?\\right)',
  derivar: '\\frac{d}{dx}\\left(#?\\right)',
  diff: '\\frac{d}{dx}\\left(#?\\right)',
  integral: '\\int #?\\, dx',
  int: '\\int #?\\, dx',
  integraldef: '\\int_{0}^{1} #?\\, dx',
  limite: '\\lim_{x \\to 0} #?',
  'límite': '\\lim_{x \\to 0} #?',
  lim: '\\lim_{x \\to 0} #?',
  limiteinf: '\\lim_{x \\to \\infty} #?',
  sumatoria: '\\sum_{n=1}^{\\infty} #?',
  suma: '\\sum_{n=1}^{\\infty} #?',
  sum: '\\sum_{#?}^{#?} #?',

  // Trigonometría
  sen: '\\sin\\left(#?\\right)',
  seno: '\\sin\\left(#?\\right)',
  sin: '\\sin\\left(#?\\right)',
  cos: '\\cos\\left(#?\\right)',
  coseno: '\\cos\\left(#?\\right)',
  tan: '\\tan\\left(#?\\right)',
  tg: '\\tan\\left(#?\\right)',
  tangente: '\\tan\\left(#?\\right)',
  sec: '\\sec\\left(#?\\right)',
  secante: '\\sec\\left(#?\\right)',
  csc: '\\csc\\left(#?\\right)',
  cosec: '\\csc\\left(#?\\right)',
  cosecante: '\\csc\\left(#?\\right)',
  cot: '\\cot\\left(#?\\right)',
  ctg: '\\cot\\left(#?\\right)',
  cotangente: '\\cot\\left(#?\\right)',
  arcsen: '\\arcsin\\left(#?\\right)',
  arcsin: '\\arcsin\\left(#?\\right)',
  arcoseno: '\\arcsin\\left(#?\\right)',
  arccos: '\\arccos\\left(#?\\right)',
  arcocoseno: '\\arccos\\left(#?\\right)',
  arctan: '\\arctan\\left(#?\\right)',
  arcotangente: '\\arctan\\left(#?\\right)',

  // Hiperbólicas
  senh: '\\sinh\\left(#?\\right)',
  sinh: '\\sinh\\left(#?\\right)',
  cosh: '\\cosh\\left(#?\\right)',
  tanh: '\\tanh\\left(#?\\right)',

  // Logaritmos
  ln: '\\ln\\left(#?\\right)',
  log: '\\log\\left(#?\\right)',
  log10: '\\log_{10}\\left(#?\\right)',
  logaritmo: '\\log\\left(#?\\right)',
  neperiano: '\\ln\\left(#?\\right)',

  // Constantes y letras griegas
  pi: '\\pi',
  inf: '\\infty',
  infinito: '\\infty',
  infinity: '\\infty',
  theta: '\\theta',
  teta: '\\theta',
  alpha: '\\alpha',
  alfa: '\\alpha',
  beta: '\\beta',
  gamma: '\\gamma',
  gama: '\\gamma',
  delta: '\\delta',
  lambda: '\\lambda',
  lamda: '\\lambda',
  mu: '\\mu',
  sigma: '\\sigma',
  omega: '\\omega',
  euler: 'e',

  // Operadores
  masmenos: '\\pm',
  pm: '\\pm',
  aprox: '\\approx',
  diferente: '\\neq',
  distinto: '\\neq',
  menorigual: '\\le',
  mayorigual: '\\ge',
  por: '\\cdot',
};

export const MathInputBar: React.FC<MathInputBarProps> = ({
  onSolve,
  isLoading = false,
  initialValue = '',
  isCompact = false,
  onExpansionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mathFieldRef = useRef<MathfieldElement | null>(null);
  const [latexValue, setLatexValue] = useState<string>(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-expand on either hover or focus
  const isExpanded = isHovered || isFocused;

  // Propagate expansion state to parent (e.g. App floating container)
  useEffect(() => {
    onExpansionChange?.(isExpanded);
  }, [isExpanded, onExpansionChange]);

  // Smoothly adjust mathfield sizing when expanding/compacting
  useEffect(() => {
    const mf = mathFieldRef.current;
    if (mf && mf.isConnected) {
      if (isExpanded) {
        mf.style.fontSize = isCompact ? '1.35rem' : '1.55rem';
        mf.style.minHeight = isCompact ? '48px' : '56px';
        mf.style.padding = '8px 12px';
      } else {
        mf.style.fontSize = isCompact ? '1.12rem' : '1.2rem';
        mf.style.minHeight = isCompact ? '36px' : '40px';
        mf.style.padding = '4px 8px';
      }
    }
  }, [isExpanded, isCompact]);

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

    // Convert natural language to LaTeX if needed (e.g. "integral de x.euler^xdx")
    const fromNatural = naturalInputToLatex(currentLatex);
    const effectiveTarget = fromNatural && fromNatural !== currentLatex ? fromNatural : currentLatex;

    // Auto-fill empty placeholders with sensible defaults:
    // - Exponents without value -> ^{2}
    // - Roots or variables without value -> x
    // - Integrals without integrand -> x dx
    const filledLatex = fillMathPlaceholdersWithDefaults(effectiveTarget);

    // Sync back to field if defaults were applied so user sees what was solved
    if (filledLatex !== currentLatex) {
      try {
        mf.setValue(filledLatex);
        setLatexValue(filledLatex);
      } catch {}
    }

    // Provide both raw-like math and full LaTeX for the solver
    let rawLike = filledLatex;
    try {
      rawLike = (mf as any).getValue?.('ascii-math') || filledLatex;
    } catch {
      rawLike = filledLatex;
    }

    onSolve(rawLike, filledLatex);
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
    mf.style.fontSize = isExpanded
      ? isCompact ? '1.35rem' : '1.55rem'
      : isCompact ? '1.12rem' : '1.2rem';
    mf.style.minHeight = isExpanded
      ? isCompact ? '48px' : '56px'
      : isCompact ? '36px' : '40px';
    mf.style.padding = isExpanded ? '8px 12px' : '4px 8px';
    mf.style.background = 'transparent';
    mf.style.border = 'none';
    mf.style.outline = 'none';
    mf.style.boxShadow = 'none';
    mf.style.color = '#111827';
    mf.style.fontFamily = "'Lora', Georgia, serif";
    mf.style.transition = 'font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

    // CRITICAL: Must append to DOM FIRST so custom element connectedCallback runs
    container.appendChild(mf);
    mathFieldRef.current = mf;

    // Now that mf is connected, options can safely be applied without "Mathfield not mounted"
    try {
      mf.mathVirtualKeyboardPolicy = 'manual';
      mf.smartFence = true;
      mf.smartSuperscript = true;
      mf.smartMode = false;

      // Merge user shortcuts with default shortcuts
      const currentShortcuts = (mf as any).inlineShortcuts || {};
      const mergedShortcuts = {
        ...currentShortcuts,
        ...CUSTOM_INLINE_SHORTCUTS,
      };

      (mf as any).setOptions?.({
        inlineShortcuts: mergedShortcuts,
        smartFence: true,
        smartSuperscript: true,
        smartMode: false,
        onInlineShortcut: (_sender: any, candidate: string) => {
          const key = candidate.toLowerCase();
          if (CUSTOM_INLINE_SHORTCUTS[key]) {
            return CUSTOM_INLINE_SHORTCUTS[key];
          }
          return '';
        },
      });
      mf.inlineShortcuts = mergedShortcuts;

      // Native MathLive hook to intercept words like "raiz", "raíz", "derivada"
      mf.onInlineShortcut = (_sender, candidate) => {
        const key = candidate.toLowerCase();
        if (CUSTOM_INLINE_SHORTCUTS[key]) {
          return CUSTOM_INLINE_SHORTCUTS[key];
        }
        return '';
      };
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
        if (!mf.isConnected) return;
        setLatexValue(mf.value);
      } catch {}
    };

    // Event listener: Enter key to solve
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmitRef.current();
      }
    };

    // Event listener: paste text converting natural language to LaTeX
    const handlePaste = (e: ClipboardEvent) => {
      try {
        const text = e.clipboardData?.getData('text/plain');
        if (text && text.trim()) {
          const converted = naturalInputToLatex(text.trim());
          if (converted && converted !== text.trim()) {
            e.preventDefault();
            mf.setValue(converted);
            setLatexValue(converted);
          }
        }
      } catch {}
    };

    const handleMfFocus = () => {
      setIsFocused(true);
    };

    const handleMfBlur = () => {
      setIsFocused(false);
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('keydown', handleKeyDown);
    mf.addEventListener('paste', handlePaste);
    mf.addEventListener('focus', handleMfFocus);
    mf.addEventListener('blur', handleMfBlur);

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('keydown', handleKeyDown);
      mf.removeEventListener('paste', handlePaste);
      mf.removeEventListener('focus', handleMfFocus);
      mf.removeEventListener('blur', handleMfBlur);
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

  const hasValue = !!latexValue.trim();

  // Focus the math field when clicking anywhere in the container, excluding buttons
  const handleAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    const mf = mathFieldRef.current;
    if (mf && mf.isConnected) {
      mf.focus();
    }
  };

  return (
    <div
      onClick={handleAreaClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      className={`w-full transition-all duration-300 ease-in-out cursor-text ${
        isCompact
          ? 'max-w-4xl mx-auto'
          : `max-w-3xl sm:max-w-4xl mx-auto bg-white rounded-2xl border transition-all duration-300 ${
              isExpanded
                ? 'p-3 sm:p-4 border-gray-300 ring-2 ring-black/5 shadow-md'
                : 'p-1.5 sm:p-2 border-gray-200/90 shadow-xs hover:border-gray-300'
            }`
      }`}
    >
      <div className="relative">
        {/* Unified Interactive Math Editor Container */}
        <div
          className={`relative bg-white transition-all duration-300 ease-in-out rounded-xl ${
            isCompact
              ? isExpanded
                ? 'p-2 sm:p-2.5'
                : 'p-1 sm:p-1.5'
              : 'p-1'
          }`}
        >
          {/* Interactive MathField Canvas + Solve Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`flex items-center text-gray-400 font-serif-math italic select-none shrink-0 transition-all duration-300 pl-1 ${
                isExpanded ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
              }`}
            >
              f(x) =
            </div>

            {/* Container where MathLive mounts its custom element */}
            <div className="flex-1 min-w-0 relative flex items-center">
              <div
                ref={containerRef}
                id="interactive-math-field-container"
                className="w-full overflow-x-auto py-0.5"
              />

              {/* Clean animated placeholder when mathfield is empty */}
              {!hasValue && (
                <div
                  className={`absolute pointer-events-none text-gray-400 select-none transition-all duration-200 truncate pr-2 ${
                    isExpanded
                      ? 'left-3 text-sm sm:text-base font-normal opacity-70'
                      : 'left-2 text-xs sm:text-sm font-normal opacity-55'
                  }`}
                >
                  {isCompact
                    ? 'Introduce una función o cálculo (ej: x² + 2x)...'
                    : 'Introduce una función, integral o cálculo (ej: ∫x² dx)...'}
                </div>
              )}
            </div>

            {/* Action Buttons (Clear & Solve): Hidden with opacity and width transition when not expanded */}
            <div
              className={`flex items-center gap-1.5 shrink-0 transition-all duration-300 ease-in-out ${
                isExpanded
                  ? 'opacity-100 max-w-[200px] scale-100 pointer-events-auto ml-1'
                  : 'opacity-0 max-w-0 scale-95 pointer-events-none overflow-hidden ml-0'
              }`}
            >
              {/* Inline Clear Button */}
              {hasValue && !isLoading && (
                <button
                  type="button"
                  onClick={handleClear}
                  title="Limpiar fórmula"
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

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
        </div>

        {/* Quick Math Symbols (Snippets): Hidden with smooth max-height and opacity transition when not expanded */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isExpanded
              ? 'opacity-100 max-h-16 mt-2 pointer-events-auto'
              : 'opacity-0 max-h-0 mt-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar pt-0.5">
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
    </div>
  );
};
