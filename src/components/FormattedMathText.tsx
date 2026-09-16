import React, { useMemo } from 'react';
import { parseExplanationWithMath, TextMathSegment } from '../utils/mathTextParser';
import { MathView } from './MathView';

interface FormattedMathTextProps {
  text: string;
  className?: string;
  asPill?: boolean;
  onAskAboutPart?: (term: string) => void;
}

/**
 * Renders prose text containing mathematical expressions.
 * When math is detected (e.g. `u = x`, `dv = e^{x} dx`, `\int u \, dv = u v - \int v \, du`, `e^{x}`),
 * it is rendered using KaTeX as an elegant inline badge/chip or inline math component,
 * preventing raw unrendered LaTeX markup from leaking into descriptions and explanations.
 */
export const FormattedMathText: React.FC<FormattedMathTextProps> = ({
  text,
  className = '',
  asPill = true,
  onAskAboutPart,
}) => {
  const segments = useMemo(() => {
    return parseExplanationWithMath(text);
  }, [text]);

  if (!text) return null;

  return (
    <span className={`inline leading-relaxed ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <span key={idx}>{seg.content}</span>;
        }

        // Math segment
        if (asPill) {
          // If clickable handler exists
          if (onAskAboutPart) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onAskAboutPart(seg.content)}
                title={`Preguntar sobre ${seg.content}`}
                className="inline-flex items-center align-middle mx-1 px-2 py-0.5 rounded-md text-xs sm:text-sm font-serif-math bg-gray-100 hover:bg-indigo-50 text-gray-900 hover:text-indigo-900 border border-gray-200/80 transition-colors shadow-2xs"
              >
                <MathView math={seg.content} />
              </button>
            );
          }

          // Non-clickable chip / badge
          return (
            <span
              key={idx}
              className="inline-flex items-center align-middle mx-1 px-1.5 py-0.5 rounded text-xs sm:text-[13px] font-serif-math bg-gray-100/90 text-gray-900 border border-gray-200/60 shadow-2xs"
            >
              <MathView math={seg.content} />
            </span>
          );
        }

        // Pure inline math without pill background
        return (
          <span key={idx} className="inline-block align-middle mx-0.5 text-gray-950 font-serif-math">
            <MathView math={seg.content} />
          </span>
        );
      })}
    </span>
  );
};
