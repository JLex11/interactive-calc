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

  // Convert Euler constant mentions ("euler", "Euler")
  str = str.replace(/\beuler\b/gi, 'e');

  // Interpret dot '.' as multiplication when between algebraic tokens (NOT numeric decimals like 3.14)
  str = str.replace(/([a-zA-Z)\]}])\s*\.\s*([a-zA-Z0-9(\[{])/g, '$1 * $2');
  str = str.replace(/(\d)\s*\.\s*([a-zA-Z(\[{])/g, '$1 * $2');

  // Definite integral: "integral de 0 a 1 ...", "integral de a hasta b ...", "int a to b f(x) dx", "∫_a^b ..."
  // IMPORTANT: Use word boundary \b on integral/int to prevent 'integral' from matching 'int' + 'egr' + 'a' + 'l'
  const defIntMatch = str.match(/^(?:integral|int|∫)\b\s*(?:(?:desde|de)\s+([^\s^]+)\s*(?:hasta|a|to)\s*([^\s_]+)|_\{?([^}^_]+)\}?\^\{?([^}]+)\}?)\s+(?:de\s+)?(.*)$/i);
  if (defIntMatch) {
    const lower = cleanTerm(defIntMatch[1] || defIntMatch[3]);
    const upper = cleanTerm(defIntMatch[2] || defIntMatch[4]);
    let body = (defIntMatch[5] || '').trim();
    let diffVar = 'dx';
    body = body.replace(/(?:\\,|\\s)*d([a-zA-Z])$/i, (_m, v) => {
      diffVar = `d${v}`;
      return '';
    }).trim();
    const parsedBody = parseMathBody(body);
    return `\\int_{${lower}}^{${upper}} ${parsedBody} \\, ${diffVar}`;
  }

  // Indefinite integral: "integral de x.euler^xdx", "integral x^2 sin(x) dx", "∫ x/ √(x^2 + 4) dx", or "∫ x^2"
  const indIntMatch = str.match(/^(?:integral|int|∫)\b\s*(?:de\s+)?(.*)$/i);
  if (indIntMatch) {
    let body = indIntMatch[1].trim();
    let diffVar = 'dx';
    body = body.replace(/(?:\\,|\\s)*d([a-zA-Z])$/i, (_m, v) => {
      diffVar = `d${v}`;
      return '';
    }).trim();
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

  // Natural language roots: "raiz cubica de ...", "raiz cuadrada de ...", "raiz de ..."
  s = s.replace(/ra[ií]z\s+c[uú]bica(?:\s+de)?\s*\(([^)]+)\)/gi, '\\sqrt[3]{$1}');
  s = s.replace(/ra[ií]z\s+c[uú]bica(?:\s+de)?\s*([a-zA-Z0-9]+)/gi, '\\sqrt[3]{$1}');
  s = s.replace(/ra[ií]z(?:\s+cuadrada)?(?:\s+de)?\s*\(([^)]+)\)/gi, '\\sqrt{$1}');
  s = s.replace(/ra[ií]z(?:\s+cuadrada)?(?:\s+de)?\s*([a-zA-Z0-9]+)/gi, '\\sqrt{$1}');

  // Natural language powers: "x elevado a la 3", "x elevado a 2", "x al cuadrado", "x al cubo"
  s = s.replace(/([a-zA-Z0-9\)\}\]]+)\s+elevado\s+(?:a\s+(?:la\s+)?)?([0-9a-zA-Z]+|\([^)]+\))/gi, (_m, base, exp) => {
    const cleanExp = exp.replace(/^\((.*)\)$/, '$1');
    return `${base}^{${cleanExp}}`;
  });
  s = s.replace(/([a-zA-Z0-9\)\}\]]+)\s+(?:al\s+cuadrado|cuadrado)\b/gi, '$1^{2}');
  s = s.replace(/([a-zA-Z0-9\)\}\]]+)\s+(?:al\s+cubo|cubo)\b/gi, '$1^{3}');

  // Natural language fractions: "x sobre 2", "x entre 3", "(x+1) sobre (x-1)"
  s = s.replace(/\(([^()]+)\)\s+(?:sobre|entre|dividido\s+por|dividido\s+entre)\s+\(([^()]+)\)/gi, '\\frac{$1}{$2}');
  s = s.replace(/([a-zA-Z0-9]+)\s+(?:sobre|entre|dividido\s+por|dividido\s+entre)\s+([a-zA-Z0-9]+)/gi, '\\frac{$1}{$2}');

  // Greek and special symbols
  s = s.replace(/\bpi\b|π/gi, '\\pi');
  s = s.replace(/\binfinito\b|\binf\b|∞/gi, '\\infty');
  s = s.replace(/\btheta\b|θ/gi, '\\theta');
  s = s.replace(/\balpha\b|\balfa\b|α/gi, '\\alpha');
  s = s.replace(/\bbeta\b|β/gi, '\\beta');
  s = s.replace(/\bgamma\b|\bgama\b|γ/gi, '\\gamma');
  s = s.replace(/\bdelta\b|δ/gi, '\\delta');
  s = s.replace(/\blambda\b|\blamda\b|λ/gi, '\\lambda');
  s = s.replace(/\bsigma\b|σ/gi, '\\sigma');
  s = s.replace(/\bomega\b|ω/gi, '\\omega');

  // Trig and log functions
  s = s.replace(/\bsin\b/gi, '\\sin');
  s = s.replace(/\bsen\b/gi, '\\sin');
  s = s.replace(/\bseno\b/gi, '\\sin');
  s = s.replace(/\bcos\b/gi, '\\cos');
  s = s.replace(/\bcoseno\b/gi, '\\cos');
  s = s.replace(/\btan\b/gi, '\\tan');
  s = s.replace(/\btg\b/gi, '\\tan');
  s = s.replace(/\btangente\b/gi, '\\tan');
  s = s.replace(/\bsec\b/gi, '\\sec');
  s = s.replace(/\bsecante\b/gi, '\\sec');
  s = s.replace(/\bcsc\b|\bcosec\b|\bcosecante\b/gi, '\\csc');
  s = s.replace(/\bcot\b|\bctg\b|\bcotangente\b/gi, '\\cot');
  s = s.replace(/\barcsin\b|\barcsen\b|\barcoseno\b/gi, '\\arcsin');
  s = s.replace(/\barccos\b|\barcocoseno\b/gi, '\\arccos');
  s = s.replace(/\barctan\b|\barcotangente\b/gi, '\\arctan');
  s = s.replace(/\bln\b|\bneperiano\b/gi, '\\ln');
  s = s.replace(/\blog\b|\blogaritmo\b/gi, '\\log');
  s = s.replace(/\bexp\b|\bexponencial\b/gi, '\\exp');

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

/**
 * Autocompletes empty placeholders in user math expressions:
 * - Empty exponents: ^{} or ^{\placeholder{}} or ^(\placeholder{}) or ^{#?} -> ^{2}
 * - Empty roots: \sqrt{} or \sqrt{\placeholder{}} or \sqrt{#?} -> \sqrt{x}
 * - Root with degree but empty radicand: \sqrt[3]{} -> \sqrt[3]{x}
 * - Empty trig/logs: \sin() -> \sin(x), \cos() -> \cos(x), \ln() -> \ln(x)
 * - Empty derivatives: \frac{d}{dx}() -> \frac{d}{dx}(x)
 * - Empty fraction numerators/denominators -> x / 1
 * - Empty placeholders \placeholder{...} or #? -> x
 * - Empty integrals: \int \, dx -> \int x \, dx
 * - Pasted plain text roots: raiz(x) -> \sqrt{x}
 */
export function fillMathPlaceholdersWithDefaults(latex: string): string {
  if (!latex) return '';
  let result = latex.trim();

  // 1. Pasted or unparsed plain text words for roots
  result = result.replace(/\\?ra[ií]z\s*\\left\(\s*([^)]*?)\s*\\right\)/gi, (_m, g1) => `\\sqrt{${g1.trim() || 'x'}}`);
  result = result.replace(/\\?ra[ií]z\s*\(\s*([^)]*?)\s*\)/gi, (_m, g1) => `\\sqrt{${g1.trim() || 'x'}}`);
  result = result.replace(/\\?ra[ií]z\s+([a-zA-Z0-9]+)/gi, '\\sqrt{$1}');

  // 2. Exponents without body: ^{} or ^{\placeholder{...}} or ^{#?} -> ^{2}
  result = result.replace(/\^\{\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\}/g, '^{2}');
  result = result.replace(/\^\s*(\\placeholder\{[^}]*\}|\#\?|\#@)/g, '^{2}');

  // 3. Square roots without body: \sqrt{} or \sqrt{\placeholder{...}} or \sqrt{#?} -> \sqrt{x}
  result = result.replace(/\\sqrt\{\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\}/g, '\\sqrt{x}');
  result = result.replace(/\\sqrt\[(.*?)\]\{\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\}/g, '\\sqrt[$1]{x}');

  // 4. Trig and log functions with empty parens: \sin() -> \sin(x), \cos() -> \cos(x), \ln() -> \ln(x)
  result = result.replace(/\\(sin|cos|tan|ln|sec|csc|cot)\\left\(\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\\right\)/g, '\\$1\\left(x\\right)');
  result = result.replace(/\\(sin|cos|tan|ln|sec|csc|cot)\(\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\)/g, '\\$1(x)');

  // 5. Derivatives d/dx with empty body
  result = result.replace(/\\frac\{d\}\{dx\}\\left\(\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\\right\)/g, '\\frac{d}{dx}\\left(x\\right)');
  result = result.replace(/\\frac\{d\}\{dx\}\{\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\}/g, '\\frac{d}{dx}\\left[x\\right]');

  // 6. Fractions with empty numerator or denominator:
  result = result.replace(/\\frac\{\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\}\{([^}]+)\}/g, '\\frac{x}{$2}');
  result = result.replace(/\\frac\{([^}]+)\}\{\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\}/g, '\\frac{$1}{x}');
  result = result.replace(/\\frac\{\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\}\{\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\}/g, '\\frac{x}{2}');

  // 7. Integrals without integrand: \int \, dx or \int \placeholder \, dx -> \int x \, dx
  result = result.replace(/\\int\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\\,\s*dx/g, '\\int x \\, dx');
  result = result.replace(/\\int\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*dx/g, '\\int x \\, dx');
  result = result.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}\s*(\\placeholder\{[^}]*\}|\#\?|\#@|\?)?\s*\\,\s*dx/g, '\\int_{$1}^{$2} x \\, dx');

  // 8. Generic remaining placeholders (\placeholder{...} or #? or #@) -> x
  result = result.replace(/\\placeholder\{[^}]*\}/g, 'x');
  result = result.replace(/\\placeholder/g, 'x');
  result = result.replace(/#\?/g, 'x');
  result = result.replace(/#@/g, 'x');

  // 9. Cleanup any double spaces
  result = result.replace(/\s{2,}/g, ' ').trim();

  return result;
}

