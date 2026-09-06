/**
 * Converts user natural math input into clean, standard LaTeX for KaTeX rendering
 */
export function naturalInputToLatex(input: string): string {
  if (!input || !input.trim()) return '';

  let str = input.trim();

  // If already full LaTeX (starts with \int, \frac, \lim, \frac{d}{dx})
  if (str.startsWith('\\') && (str.includes('\\int') || str.includes('\\frac') || str.includes('\\lim'))) {
    return str;
  }

  // Normalize common symbols
  str = str.replace(/·/g, ' * ');
  str = str.replace(/→/g, '->');

  // Definite integral: "integral de a a b ..." or "int a to b f(x) dx" or "∫_a^b ..." or "∫ 0 a 1 ..."
  const defIntMatch = str.match(/^(?:integral|int|∫)\s*(?:(?:de\s+)?([^\s^]+)\s*(?:a|to)\s*([^\s_]+)|_\{?([^}^_]+)\}?\^\{?([^}]+)\}?)\s+(.*)$/i);
  if (defIntMatch) {
    const lower = cleanTerm(defIntMatch[1] || defIntMatch[3]);
    const upper = cleanTerm(defIntMatch[2] || defIntMatch[4]);
    let body = (defIntMatch[5] || '').trim();
    let diffVar = 'dx';
    const diffMatch = body.match(/\s+d([a-zA-Z])$/i);
    if (diffMatch) {
      diffVar = `d${diffMatch[1]}`;
      body = body.substring(0, body.length - diffMatch[0].length).trim();
    }
    const parsedBody = parseMathBody(body);
    return `\\int_{${lower}}^{${upper}} ${parsedBody} \\, ${diffVar}`;
  }

  // Indefinite integral: "integral x^2 sin(x) dx", "∫ x/ √(x^2 + 4) dx", or "∫ x^2"
  const indIntMatch = str.match(/^(?:integral|int|∫)\s*(.*)$/i);
  if (indIntMatch) {
    let body = indIntMatch[1].trim();
    // check if ends with dx, dt, du, etc.
    let diffVar = 'dx';
    const diffMatch = body.match(/\s+d([a-zA-Z])$/i);
    if (diffMatch) {
      diffVar = `d${diffMatch[1]}`;
      body = body.substring(0, body.length - diffMatch[0].length).trim();
    }
    const parsedBody = parseMathBody(body);
    return `\\int ${parsedBody} \\, ${diffVar}`;
  }

  // Derivative: "derivada de f(x)" or "derivada f(x)" or "d/dx f(x)" or "diff f(x)"
  const derivMatch = str.match(/^(?:derivada(?:\s+de)?|d\/dx|diff)\s+(.*)$/i);
  if (derivMatch) {
    const body = parseMathBody(derivMatch[1]);
    return `\\frac{d}{dx}\\left[ ${body} \\right]`;
  }

  // Limit: "limite x->0 f(x)" or "lim x->0 f(x)" or "limite cuando x tiende a 0 f(x)" or "lim x→0 f(x)"
  const limitMatch = str.match(/^(?:l[ií]mite(?:\s+cuando)?|lim)\s+([a-zA-Z])\s*(?:->|tiende a|\u2192)\s*([^\s]+)\s+(.*)$/i);
  if (limitMatch) {
    const variable = limitMatch[1];
    let toVal = limitMatch[2];
    if (toVal.toLowerCase() === 'inf' || toVal.toLowerCase() === 'infinito' || toVal === '∞') toVal = '\\infty';
    if (toVal.toLowerCase() === '-inf' || toVal.toLowerCase() === '-infinito' || toVal === '-∞') toVal = '-\\infty';
    if (toVal.toLowerCase() === 'pi' || toVal === 'π') toVal = '\\pi';
    const body = parseMathBody(limitMatch[3]);
    return `\\lim_{${variable} \\to ${toVal}} ${body}`;
  }

  // Standard algebraic or functional expression
  return parseMathBody(str);
}

function cleanTerm(t: string): string {
  if (!t) return '';
  if (t === 'inf' || t === 'infinito' || t === '∞') return '\\infty';
  if (t === '-inf' || t === '-infinito' || t === '-∞') return '-\\infty';
  if (t === 'pi' || t === 'π') return '\\pi';
  return t;
}

function parseMathBody(raw: string): string {
  let s = raw.trim();

  // Greek and special symbols
  s = s.replace(/\bpi\b|π/gi, '\\pi');
  s = s.replace(/\binfinito\b|\binf\b|∞/gi, '\\infty');
  s = s.replace(/\btheta\b|θ/gi, '\\theta');
  s = s.replace(/\balpha\b|α/gi, '\\alpha');
  s = s.replace(/\bbeta\b|β/gi, '\\beta');

  // Trig and log functions
  s = s.replace(/\bsin\b/gi, '\\sin');
  s = s.replace(/\bsen\b/gi, '\\sin');
  s = s.replace(/\bcos\b/gi, '\\cos');
  s = s.replace(/\btan\b/gi, '\\tan');
  s = s.replace(/\btg\b/gi, '\\tan');
  s = s.replace(/\barcsin\b/gi, '\\arcsin');
  s = s.replace(/\barccos\b/gi, '\\arccos');
  s = s.replace(/\barctan\b/gi, '\\arctan');
  s = s.replace(/\bln\b/gi, '\\ln');
  s = s.replace(/\blog\b/gi, '\\log');
  s = s.replace(/\bexp\b/gi, '\\exp');

  // Roots: √(expr), sqrt(expr), raiz(expr), √{expr} or √x
  s = s.replace(/(?:√|sqrt|ra[ií]z)\(([^)]+)\)/gi, '\\sqrt{$1}');
  s = s.replace(/(?:√|sqrt|ra[ií]z)\{([^}]+)\}/gi, '\\sqrt{$1}');
  s = s.replace(/√([a-zA-Z0-9])/g, '\\sqrt{$1}');

  // Multiplication symbol: * or · to \cdot
  s = s.replace(/\s*[\*·]\s*/g, ' \\cdot ');

  // Powers with parenthesis: x^(expr) -> x^{expr}
  s = s.replace(/\^([0-9a-zA-Z]+)/g, '^{$1}');
  s = s.replace(/\^\(([^)]+)\)/g, '^{$1}');

  // Fractions:
  // 1. Grouped with parentheses: (a)/(b) -> \frac{a}{b}
  s = s.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, '\\frac{$1}{$2}');
  // 2. Term with square root denominator or numerator: x / \sqrt{...} or (x) / \sqrt{...}
  s = s.replace(/([a-zA-Z0-9]+|\([^)]+\))\s*\/\s*(\\sqrt\{[^}]+\})/g, (_m, num, den) => {
    const cleanNum = num.replace(/^\((.*)\)$/, '$1');
    return `\\frac{${cleanNum}}{${den}}`;
  });
  s = s.replace(/(\\sqrt\{[^}]+\})\s*\/\s*([a-zA-Z0-9]+|\([^)]+\))/g, (_m, num, den) => {
    const cleanDen = den.replace(/^\((.*)\)$/, '$1');
    return `\\frac{${num}}{${cleanDen}}`;
  });
  // 3. Single variable/number fraction: a/b
  s = s.replace(/([0-9a-zA-Z]+)\s*\/\s*([0-9a-zA-Z]+)/g, '\\frac{$1}{$2}');

  // e^x notation
  s = s.replace(/e\^\{([^}]+)\}/g, 'e^{$1}');
  s = s.replace(/e\^([0-9a-zA-Z])/g, 'e^{$1}');

  return s;
}

export function detectCategory(input: string): 'integral' | 'derivative' | 'limit' | 'equation' | 'algebraic' | 'other' {
  const low = input.toLowerCase();
  if (low.includes('int') || low.includes('\\int') || input.includes('∫')) return 'integral';
  if (low.includes('deriv') || low.includes('d/dx') || low.includes('\\frac{d}{dx}')) return 'derivative';
  if (low.includes('lim') || low.includes('\\lim')) return 'limit';
  if (low.includes('=')) return 'equation';
  return 'algebraic';
}
