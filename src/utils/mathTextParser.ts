import katex from 'katex';

export interface TextMathSegment {
  type: 'text' | 'math';
  content: string;
}

/**
 * Checks whether KaTeX can successfully parse and render this string as a math expression.
 */
export function canRenderKaTeX(expr: string): boolean {
  if (!expr || expr.trim().length === 0) return false;
  const trimmed = expr.trim();
  // Do not consider single common punctuation or plain letters without math context as standalone chips
  if (/^[a-zA-Z]$/.test(trimmed)) return true; // variables like x, u, v
  try {
    katex.renderToString(trimmed, { throwOnError: true, strict: false });
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes unicode math symbols that might appear in text (such as ², ³, ⁻¹, √, ≈, ∫, etc.)
 * to standard LaTeX notation so KaTeX can render them cleanly.
 */
export function normalizeMathInText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/√([a-zA-Z0-9]+)/g, '\\sqrt{$1}')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/⁻¹/g, '^{-1}')
    .replace(/⁻²/g, '^{-2}')
    .replace(/⁻½/g, '^{-1/2}')
    .replace(/≈/g, ' \\approx ')
    .replace(/≠/g, ' \\neq ')
    .replace(/≤/g, ' \\le ')
    .replace(/≥/g, ' \\ge ')
    .replace(/±/g, ' \\pm ')
    .replace(/∫/g, '\\int ')
    .replace(/·/g, ' \\cdot ')
    .replace(/×/g, ' \\times ')
    .replace(/→/g, ' \\to ');
}

/**
 * Parses a paragraph of text containing embedded mathematical expressions (such as
 * formulas starting with \int or \frac, variable assignments like u = x, differential
 * terms like dv = e^{x} dx, or expressions like \int u \, dv = u v - \int v \, du)
 * into a sequence of text and math tokens for chip/inline math rendering.
 */
export function parseExplanationWithMath(text: string): TextMathSegment[] {
  if (!text) return [];

  const normalized = normalizeMathInText(text);

  // Stop words in Spanish explanatory math text where formulas naturally end
  const stopWordsLookahead = '(?=(?:\\s+(?:y|o|que|para|porque|al|con|en|donde|obtenemos|aplicamos|elegimos|sustituimos|calculamos|dado|siendo|como|reemplazamos|cuando)\\b)|[.,;:!?\\n]|$)';

  // Math regex supporting:
  // 1. $$...$$
  // 2. $...$
  // 3. \[...\]
  // 4. \(...\)
  // 5. Explicit LaTeX formulas starting with \command (handling escaped commas \, and braces)
  // 6. Algebraic equation or assignment (e.g. u = x, dv = e^{x} dx, du = \frac{d}{dx}[x]\,dx = dx, x dx = du/2, etc.)
  // 7. Expressions with power/fractions/roots: e^{x}, x^{2}, u^{-1/2}, e^x, x^2, \sqrt{...}
  const mathRegex = new RegExp(
    '(?:' +
    // 1. Delimited $$...$$
    '\\$\\$([\\s\\S]+?)\\$\\$' +
    // 2. Delimited $...$
    '|\\$([^$\\n]+?)\\$' +
    // 3. Delimited \[...\]
    '|\\\\\\[([\\s\\S]+?)\\\\\\]' +
    // 4. Delimited \(...\)
    '|\\\\\\(([\\s\\S]+?)\\\\\\)' +
    // 5. Explicit LaTeX formula starting with backslash (e.g. \int u \, dv = u v - \int v \, du, \frac{d}{dx}..., \left(x\right)...)
    '|(\\\\(?:int|frac|sqrt|left|right|sum|prod|lim|sin|cos|tan|ln|log|exp|cdot|times|pm|partial|alpha|beta|gamma|pi|theta|infty)(?:\\\\[,;!\\s]|\\{[^}]*\\}|\\[[^\\]]*\\]|[^.,;:!?\\n])*?' + stopWordsLookahead + ')' +
    // 6. Algebraic equation or assignment: u = x, dv = e^{x} dx, du = dx, v = e^{x}, x dx = du/2, etc.
    '|(\\b(?:[a-zA-Z](?:_[a-zA-Z0-9]+|\\_\\{[^}]+\\})?|du|dv|dx|dt|dy|dz|x\\s*dx|u\\s*\\,\\s*v)\\s*=\\s*(?:\\\\[,;!\\s]|\\{[^}]*\\}|\\[[^\\]]*\\]|[^.,;:!?\\n])*?' + stopWordsLookahead + ')' +
    // 7. Standalone power/exponential/root expression: e^{x}, x^{2}, u^{-1/2}, e^x, x^2, u^(-1/2)
    '|(\\b[a-zA-Z0-9]+(?:\\^\\{[^}]+\\}|\\^[a-zA-Z0-9+\\-]+|\\^\\([^)]+\\))(?:\\s*(?:dx|du|dt))?)' +
    ')',
    'gi'
  );

  const segments: TextMathSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(normalized)) !== null) {
    const matchIndex = match.index;

    // Add preceding plain text
    if (matchIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: normalized.slice(lastIndex, matchIndex),
      });
    }

    let rawMath = match[1] || match[2] || match[3] || match[4] || match[5] || match[6] || match[7] || match[0];
    rawMath = rawMath.trim();

    // Check if trailing punctuation was accidentally captured
    let trailingPunct = '';
    const punctMatch = rawMath.match(/([.,;:!?]+)$/);
    if (punctMatch) {
      trailingPunct = punctMatch[1];
      rawMath = rawMath.slice(0, -trailingPunct.length).trim();
    }

    // Check for trailing word in stop words
    let trailingWord = '';
    const stopWordMatch = rawMath.match(new RegExp('\\s+(y|o|que|para|porque|al|con|en|donde|obtenemos|aplicamos|elegimos|sustituimos|calculamos|dado|siendo|como|reemplazamos|cuando)$', 'i'));
    if (stopWordMatch) {
      trailingWord = stopWordMatch[0];
      rawMath = rawMath.slice(0, -trailingWord.length).trim();
    }

    // Replace u^(-1/2) with u^{-1/2} for KaTeX
    rawMath = rawMath.replace(/\^\(([^)]+)\)/g, '^{$1}');

    if (rawMath && canRenderKaTeX(rawMath)) {
      segments.push({
        type: 'math',
        content: rawMath,
      });
    } else if (rawMath) {
      segments.push({
        type: 'text',
        content: rawMath,
      });
    }

    if (trailingWord) {
      segments.push({
        type: 'text',
        content: trailingWord,
      });
    }

    if (trailingPunct) {
      segments.push({
        type: 'text',
        content: trailingPunct,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < normalized.length) {
    segments.push({
      type: 'text',
      content: normalized.slice(lastIndex),
    });
  }

  return segments;
}
