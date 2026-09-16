import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  EngineStatus,
  EquivalenceResult,
  MathCategory,
  SymbolicAnalysis,
} from '../types';

/** Maximum character length allowed to prevent regex/parser DoS */
const MAX_INPUT_LENGTH = 1200;
/** Maximum AST complexity allowed by ComputeEngine (calculus operators D/Integrate start at 100,000) */
const MAX_COMPLEXITY_LIMIT = 500000;

/**
 * Creates an isolated ComputeEngine instance per operation/request.
 * This guarantees no state/assumption leakage across asynchronous requests or user sessions.
 */
export function createIsolatedEngine(): ComputeEngine {
  const ce = new ComputeEngine();
  ce.precision = 10;
  ce.tolerance = 1e-10;
  return ce;
}

export interface SymbolicOperationResult {
  status: EngineStatus;
  resultLatex?: string;
  mathJson?: any;
  numericApproximation?: string;
  solutions?: string[];
  error?: string;
}

/**
 * Validates input sanity and basic syntax before running heavy engine operations.
 */
export function validateInputSanity(input: string): { ok: boolean; reason?: string } {
  if (!input || !input.trim()) {
    return { ok: false, reason: 'Entrada vacía' };
  }
  if (input.length > MAX_INPUT_LENGTH) {
    return { ok: false, reason: `Entrada excede el límite seguro (${MAX_INPUT_LENGTH} caracteres)` };
  }
  return { ok: true };
}

/**
 * Analyzes a mathematical expression from its AST representation.
 * Preserves both non-canonical (user intent) and canonical (formal) representations.
 */
export function analyzeExpression(latex: string, preferredVar?: string): SymbolicAnalysis {
  const sanity = validateInputSanity(latex);
  if (!sanity.ok) {
    return {
      category: 'other',
      rawInput: latex,
      rawLatex: latex,
      canonicalLatex: latex,
      targetVariable: preferredVar || 'x',
      variables: [],
      assumptions: [],
      complexity: 0,
      isValid: false,
      status: 'invalid',
    };
  }

  const ce = createIsolatedEngine();

  // Detect integral / derivative before parsing to prevent CortexJS from fragmenting \int into \imaginaryI * n * t
  const isIntegralExpr = latex.includes('\\int') || latex.includes('∫') || /\b(integral|int)\b/i.test(latex);
  const isDerivativeExpr = latex.includes('\\frac{d}{d') || latex.includes('\\partial') || /\b(derivada|diff)\b/i.test(latex);

  let rawParsed: any;
  let canonicalParsed: any;

  try {
    if (isIntegralExpr) {
      // Extract integrand to avoid CortexJS parsing \int as imaginary unit + n + t
      let integrandLatex = latex.trim();
      const intMatch = integrandLatex.match(/^\\int\s*(?:_\{([^}]+)\}\^\{([^}]+)\})?\s*([\s\S]*?)(?:\\,|\\quad|\s)*d([a-zA-Z])$/);
      let detectedVar = preferredVar || 'x';
      if (intMatch) {
        integrandLatex = intMatch[3].trim();
        if (intMatch[4]) detectedVar = intMatch[4];
      } else {
        integrandLatex = integrandLatex.replace(/^\\int\s*/, '').replace(/(?:\\,|\\quad|\s)*d[a-zA-Z]$/, '').trim();
      }
      const cleanIntegrand = (integrandLatex || 'x').replace(/\\cdot/g, ' ').replace(/\\times/g, ' ');
      rawParsed = ce.parse(cleanIntegrand);
      canonicalParsed = rawParsed.canonical || rawParsed;
      if (!preferredVar) preferredVar = detectedVar;
    } else {
      const cleanLatex = latex.replace(/\\cdot/g, ' ').replace(/\\times/g, ' ');
      rawParsed = ce.parse(cleanLatex);
      canonicalParsed = rawParsed.canonical || rawParsed;
    }
  } catch (err: any) {
    return {
      category: 'other',
      rawInput: latex,
      rawLatex: latex,
      canonicalLatex: latex,
      targetVariable: preferredVar || 'x',
      variables: [],
      assumptions: [],
      complexity: 0,
      isValid: false,
      status: 'invalid',
    };
  }

  const isValid = Boolean(canonicalParsed?.isValid && rawParsed?.isValid);
  const complexity = canonicalParsed?.complexity ?? 0;

  if (!isValid || complexity > MAX_COMPLEXITY_LIMIT) {
    return {
      category: 'other',
      rawInput: latex,
      rawLatex: latex,
      canonicalLatex: canonicalParsed?.latex || latex,
      targetVariable: preferredVar || 'x',
      variables: [],
      assumptions: [],
      complexity,
      isValid,
      status: isValid ? 'unsupported' : 'invalid',
    };
  }

  // Extract variables & unknowns from AST
  const unknowns: string[] = Array.from(canonicalParsed.unknowns || []).map(String);
  const symbols: string[] = Array.from(canonicalParsed.symbols || [])
    .map(String)
    .filter((s) => !['Pi', 'E', 'ImaginaryUnit', 'Infinity', 'NaN'].includes(s));
  const allVars = Array.from(new Set([...unknowns, ...symbols]));

  const targetVariable = preferredVar && allVars.includes(preferredVar)
    ? preferredVar
    : (allVars[0] || 'x');

  // Detect category from AST operator and MathJSON structure
  const rawJson = rawParsed.json;
  const canonicalJson = canonicalParsed.json;
  const rawOp = rawParsed.operator;
  const canonicalOp = canonicalParsed.operator;

  let category: MathCategory = 'algebraic';

  // 1. Equations: Equal operator
  if (rawOp === 'Equal' || canonicalOp === 'Equal' || (Array.isArray(rawJson) && rawJson[0] === 'Equal')) {
    category = 'equation';
  }
  // 2. Integrals: operator Integrate or integral notation
  else if (
    isIntegralExpr ||
    rawOp === 'Integrate' ||
    canonicalOp === 'Integrate' ||
    (Array.isArray(rawJson) && rawJson[0] === 'Integrate') ||
    latex.includes('\\int')
  ) {
    category = 'integral';
  }
  // 3. Derivatives: operator D or derivative symbol
  else if (
    isDerivativeExpr ||
    rawOp === 'D' ||
    canonicalOp === 'D' ||
    (Array.isArray(rawJson) && (rawJson[0] === 'D' || rawJson[0] === 'Derivative')) ||
    latex.includes('\\frac{d}{d') ||
    latex.includes('\\partial')
  ) {
    category = 'derivative';
  }
  // 4. Limits: operator Limit
  else if (
    rawOp === 'Limit' ||
    canonicalOp === 'Limit' ||
    (Array.isArray(rawJson) && rawJson[0] === 'Limit') ||
    latex.includes('\\lim')
  ) {
    category = 'limit';
  }
  // 5. Pure arithmetic (no variables)
  else if (allVars.length === 0) {
    category = 'algebraic';
  }

  // Derive domain restrictions / assumptions from AST
  const assumptions: string[] = [];
  try {
    extractDomainAssumptions(canonicalParsed, assumptions);
  } catch {
    // Non-blocking
  }

  // Perform baseline symbolic trial
  let status: EngineStatus = 'unresolved';
  let exactResultLatex: string | undefined;
  let numericApproximation: string | undefined;
  let solutions: string[] | undefined;

  try {
    if (category === 'equation') {
      const eqResult = solveEquation(latex, targetVariable, ce);
      status = eqResult.status;
      solutions = eqResult.solutions;
      exactResultLatex = eqResult.resultLatex;
    } else if (category === 'derivative') {
      const derivResult = computeDerivative(latex, targetVariable, ce);
      status = derivResult.status;
      exactResultLatex = derivResult.resultLatex;
    } else if (category === 'integral') {
      const intResult = computeIntegral(latex, targetVariable, undefined, ce);
      status = intResult.status;
      exactResultLatex = intResult.resultLatex;
    } else if (category === 'limit') {
      const limResult = computeLimit(latex, targetVariable, undefined, ce);
      status = limResult.status;
      exactResultLatex = limResult.resultLatex;
    } else {
      const simpResult = simplifyExpression(latex, ce);
      status = simpResult.status;
      exactResultLatex = simpResult.resultLatex;
    }

    // Try numeric approximation if appropriate
    const numEval = canonicalParsed.N();
    if (numEval && numEval.isValid && !numEval.has('NaN')) {
      const numLatex = numEval.latex;
      if (numLatex && numLatex !== exactResultLatex) {
        numericApproximation = numLatex;
      }
    }
  } catch {
    status = 'unresolved';
  }

  return {
    category,
    rawInput: latex,
    rawLatex: isIntegralExpr || isDerivativeExpr ? latex : (rawParsed.latex || latex),
    canonicalLatex: isIntegralExpr || isDerivativeExpr ? latex : (canonicalParsed.latex || latex),
    targetVariable,
    variables: allVars,
    assumptions,
    complexity,
    isValid,
    status,
    exactResultLatex,
    numericApproximation,
    solutions,
    mathJson: canonicalJson,
  };
}

/**
 * Extracts domain constraints from the AST (denominators cannot be 0, radicals >= 0).
 */
function extractDomainAssumptions(expr: any, assumptions: string[]): void {
  if (!expr || typeof expr !== 'object') return;

  const op = expr.operator;
  // Denominator: in Divide or Rational
  if (op === 'Divide' && expr.op2) {
    const denLatex = expr.op2.latex;
    if (denLatex && denLatex !== '1' && expr.op2.unknowns?.length > 0) {
      assumptions.push(`${denLatex} \\neq 0`);
    }
  }

  // Square root / radical
  if ((op === 'Sqrt' || (op === 'Root' && expr.op2?.value === 2)) && expr.op1) {
    const radLatex = expr.op1.latex;
    if (radLatex && expr.op1.unknowns?.length > 0) {
      assumptions.push(`${radLatex} \\ge 0`);
    }
  }

  // Recurse into children
  const ops = expr.ops;
  if (Array.isArray(ops)) {
    for (const child of ops) {
      extractDomainAssumptions(child, assumptions);
    }
  }
}

/**
 * Solves an algebraic equation symbolically using Compute Engine.
 */
export function solveEquation(
  latex: string,
  targetVar: string = 'x',
  existingCe?: ComputeEngine
): SymbolicOperationResult {
  const sanity = validateInputSanity(latex);
  if (!sanity.ok) return { status: 'invalid', error: sanity.reason };

  const ce = existingCe || createIsolatedEngine();

  try {
    // If not written with '=', treat as expr = 0
    let cleanLatex = latex.trim();
    if (!cleanLatex.includes('=')) {
      cleanLatex = `${cleanLatex} = 0`;
    }

    const parsed = ce.parse(cleanLatex);
    if (!parsed.isValid) {
      return { status: 'invalid', error: 'Ecuación inválida para el motor simbólico' };
    }

    const solutionsBoxed = (parsed as any).solve?.(targetVar);

    if (!solutionsBoxed || !Array.isArray(solutionsBoxed) || solutionsBoxed.length === 0) {
      return { status: 'unresolved' };
    }

    const validSolutions = solutionsBoxed
      .filter((s: any) => s && s.isValid && !(s as any).has?.('NaN'))
      .map((s: any) => s.latex || String(s));

    if (validSolutions.length === 0) {
      return { status: 'unresolved' };
    }

    const formattedResult = validSolutions.length === 1
      ? `${targetVar} = ${validSolutions[0]}`
      : `${targetVar} \\in \\{${validSolutions.join(', ')}\\}`;

    return {
      status: 'solved',
      solutions: validSolutions,
      resultLatex: formattedResult,
      mathJson: parsed.json,
    };
  } catch (err: any) {
    return { status: 'unresolved', error: err?.message };
  }
}

/**
 * Simplifies a mathematical expression symbolically.
 */
export function simplifyExpression(
  latex: string,
  existingCe?: ComputeEngine
): SymbolicOperationResult {
  const sanity = validateInputSanity(latex);
  if (!sanity.ok) return { status: 'invalid', error: sanity.reason };

  const ce = existingCe || createIsolatedEngine();

  try {
    const parsed = ce.parse(latex);
    if (!parsed.isValid) {
      return { status: 'invalid', error: 'Expresión inválida' };
    }

    const simplified = parsed.simplify();
    if (!simplified.isValid) {
      return { status: 'unresolved' };
    }

    return {
      status: 'solved',
      resultLatex: simplified.latex,
      mathJson: simplified.json,
    };
  } catch (err: any) {
    return { status: 'unresolved', error: err?.message };
  }
}

/**
 * Expands an algebraic expression (e.g. (x+2)(x-3) -> x^2 - x - 6).
 */
export function expandExpression(
  latex: string,
  existingCe?: ComputeEngine
): SymbolicOperationResult {
  const sanity = validateInputSanity(latex);
  if (!sanity.ok) return { status: 'invalid', error: sanity.reason };

  const ce = existingCe || createIsolatedEngine();

  try {
    const parsed = ce.parse(latex);
    if (!parsed.isValid) return { status: 'invalid' };

    // ComputeEngine expands through canonical evaluation or Expand rule
    const expanded = ce.box(['Expand', parsed]).evaluate();
    if (expanded && expanded.isValid) {
      return {
        status: 'solved',
        resultLatex: expanded.latex,
        mathJson: expanded.json,
      };
    }

    return {
      status: 'solved',
      resultLatex: parsed.simplify().latex,
      mathJson: parsed.json,
    };
  } catch (err: any) {
    return { status: 'unresolved', error: err?.message };
  }
}

/**
 * Factors an algebraic expression.
 */
export function factorExpression(
  latex: string,
  existingCe?: ComputeEngine
): SymbolicOperationResult {
  const sanity = validateInputSanity(latex);
  if (!sanity.ok) return { status: 'invalid', error: sanity.reason };

  const ce = existingCe || createIsolatedEngine();

  try {
    const parsed = ce.parse(latex);
    if (!parsed.isValid) return { status: 'invalid' };

    const factored = ce.box(['Factor', parsed]).evaluate();
    if (factored && factored.isValid && factored.latex !== parsed.latex) {
      return {
        status: 'solved',
        resultLatex: factored.latex,
        mathJson: factored.json,
      };
    }

    return {
      status: 'unresolved',
      resultLatex: parsed.latex,
    };
  } catch (err: any) {
    return { status: 'unresolved', error: err?.message };
  }
}

/**
 * Computes symbolic derivative d/dx of an expression.
 */
export function computeDerivative(
  latex: string,
  targetVar: string = 'x',
  existingCe?: ComputeEngine
): SymbolicOperationResult {
  const sanity = validateInputSanity(latex);
  if (!sanity.ok) return { status: 'invalid', error: sanity.reason };

  const ce = existingCe || createIsolatedEngine();

  try {
    // Extract inner function if latex is already in derivative notation
    let innerLatex = latex.trim();
    const dMatch = innerLatex.match(/^(?:\\frac\{d\}\{d[a-zA-Z]\}\s*(?:\\left\[|\[|\()?(.*?)(?:\\right\]|\]|\))?)$/s);
    if (dMatch && dMatch[1]) {
      innerLatex = dMatch[1].trim();
    }

    const parsedInner = ce.parse(innerLatex);
    if (!parsedInner.isValid) {
      return { status: 'invalid', error: 'Función a derivar no válida' };
    }

    const boxedDeriv = ce.box(['D', parsedInner, targetVar]);
    const evaluated = boxedDeriv.evaluate();

    if (!evaluated || !evaluated.isValid || evaluated.has('NaN')) {
      return { status: 'unresolved' };
    }

    return {
      status: 'solved',
      resultLatex: evaluated.latex,
      mathJson: evaluated.json,
    };
  } catch (err: any) {
    return { status: 'unresolved', error: err?.message };
  }
}

/**
 * Computes symbolic indefinite or definite integral of an expression.
 */
export function computeIntegral(
  latex: string,
  targetVar: string = 'x',
  limits?: [string, string],
  existingCe?: ComputeEngine
): SymbolicOperationResult {
  const sanity = validateInputSanity(latex);
  if (!sanity.ok) return { status: 'invalid', error: sanity.reason };

  const ce = existingCe || createIsolatedEngine();

  try {
    // Extract integrand if latex is already in \int ... dx form
    let integrandLatex = latex.trim();
    const intMatch = integrandLatex.match(/^(?:\\int\s*(?:_\{([^}]+)\}\^\{([^}]+)\})?\s*(.*?)(?:\\,|\\quad|\s)*d([a-zA-Z]))$/s);
    let extractedLimits: [string, string] | undefined = limits;
    let varName = targetVar;

    if (intMatch) {
      if (intMatch[1] && intMatch[2]) {
        extractedLimits = [intMatch[1], intMatch[2]];
      }
      integrandLatex = (intMatch[3] || '').trim();
      if (intMatch[4]) {
        varName = intMatch[4];
      }
    }

    const parsedIntegrand = ce.parse(integrandLatex || latex);
    if (!parsedIntegrand.isValid) {
      return { status: 'invalid', error: 'Integrando inválido' };
    }

    let boxedIntegral: any;
    if (extractedLimits && extractedLimits[0] && extractedLimits[1]) {
      const lower = ce.parse(extractedLimits[0]);
      const upper = ce.parse(extractedLimits[1]);
      boxedIntegral = ce.box(['Integrate', parsedIntegrand, ['Tuple', varName, lower, upper]]);
    } else {
      boxedIntegral = ce.box(['Integrate', parsedIntegrand, varName]);
    }

    const evaluated = boxedIntegral.evaluate();
    if (!evaluated || !evaluated.isValid || evaluated.has('NaN')) {
      return { status: 'unresolved' };
    }

    // Check if the result is just the unevaluated 'Integrate' operator (meaning CAS could not solve it)
    if (evaluated.operator === 'Integrate') {
      return { status: 'unresolved' };
    }

    const resultLatex = extractedLimits
      ? evaluated.latex
      : `${evaluated.latex} + C`;

    return {
      status: 'solved',
      resultLatex,
      mathJson: evaluated.json,
    };
  } catch (err: any) {
    return { status: 'unresolved', error: err?.message };
  }
}

/**
 * Computes symbolic limit of an expression.
 */
export function computeLimit(
  latex: string,
  targetVar: string = 'x',
  to: string = '0',
  existingCe?: ComputeEngine
): SymbolicOperationResult {
  const sanity = validateInputSanity(latex);
  if (!sanity.ok) return { status: 'invalid', error: sanity.reason };

  const ce = existingCe || createIsolatedEngine();

  try {
    let bodyLatex = latex.trim();
    let varName = targetVar;
    let toVal = to;

    // Check if latex already has \lim_{x \to a} body
    const limMatch = bodyLatex.match(/^\\lim_\{([a-zA-Z])\s*\\to\s*([^}]+)\}\s*(.*)$/s);
    if (limMatch) {
      varName = limMatch[1];
      toVal = limMatch[2];
      bodyLatex = limMatch[3];
    }

    const parsedBody = ce.parse(bodyLatex);
    const parsedTo = ce.parse(toVal);
    if (!parsedBody.isValid) return { status: 'invalid' };

    const boxedLimit = ce.box(['Limit', parsedBody, varName, parsedTo]);
    const evaluated = boxedLimit.evaluate();

    if (!evaluated || !evaluated.isValid || evaluated.operator === 'Limit' || evaluated.has('NaN')) {
      return { status: 'unresolved' };
    }

    return {
      status: 'solved',
      resultLatex: evaluated.latex,
      mathJson: evaluated.json,
    };
  } catch (err: any) {
    return { status: 'unresolved', error: err?.message };
  }
}

/**
 * Evaluates an expression numerically.
 */
export function evaluateNumeric(
  latex: string,
  existingCe?: ComputeEngine
): SymbolicOperationResult {
  const sanity = validateInputSanity(latex);
  if (!sanity.ok) return { status: 'invalid', error: sanity.reason };

  const ce = existingCe || createIsolatedEngine();

  try {
    const parsed = ce.parse(latex);
    if (!parsed.isValid) return { status: 'invalid' };

    const num = parsed.N();
    if (!num || !num.isValid || num.has('NaN')) {
      return { status: 'unresolved' };
    }

    return {
      status: 'solved',
      numericApproximation: num.latex,
      resultLatex: num.latex,
      mathJson: num.json,
    };
  } catch (err: any) {
    return { status: 'unresolved', error: err?.message };
  }
}

/**
 * Decides whether two mathematical expressions are equivalent.
 * Returns strictly: 'true' | 'false' | 'unknown'.
 * Never assumes false when it cannot prove it; returns 'unknown' instead.
 */
export function areExpressionsEquivalent(
  latexA: string,
  latexB: string,
  existingCe?: ComputeEngine
): EquivalenceResult {
  if (!latexA || !latexB) return 'unknown';

  const cleanA = latexA.trim();
  const cleanB = latexB.trim();

  // 1. Literal identity after stripping formatting whitespace
  if (cleanA === cleanB) return 'true';

  const ce = existingCe || createIsolatedEngine();

  try {
    const exprA = ce.parse(cleanA);
    const exprB = ce.parse(cleanB);

    if (!exprA.isValid || !exprB.isValid) return 'unknown';

    // 2. Direct structural equivalence
    if (exprA.isEqual(exprB) === true) return 'true';

    // 3. Difference simplification: (A - B) === 0
    try {
      const diffSim = exprA.sub(exprB).simplify();
      const isZeroNumeric =
        typeof diffSim.re === 'number' &&
        Number.isFinite(diffSim.re) &&
        diffSim.unknowns?.length === 0 &&
        Math.abs(diffSim.re) < 1e-12;

      if (diffSim.latex === '0' || (diffSim as any).isZero === true || isZeroNumeric) {
        return 'true';
      }
    } catch {
      // Continue to next checks
    }

    // 4. Comparison of expanded forms: Expand(A) vs Expand(B)
    try {
      const expA = ce.box(['Expand', exprA]).evaluate();
      const expB = ce.box(['Expand', exprB]).evaluate();
      if (expA.latex === expB.latex) return 'true';
      if (expA.sub(expB).simplify().latex === '0') return 'true';
    } catch {
      // Continue
    }

    // 5. Comparison of simplified forms: Simplify(A) vs Simplify(B)
    try {
      const simA = exprA.simplify();
      const simB = exprB.simplify();
      if (simA.latex === simB.latex || simA.isEqual(simB) === true) return 'true';
      if (simA.sub(simB).simplify().latex === '0') return 'true';
    } catch {
      // Continue
    }

    // 6. Pure numeric evaluation (no free variables)
    const varsA = Array.from(exprA.unknowns || []);
    const varsB = Array.from(exprB.unknowns || []);
    const allVars = Array.from(new Set([...varsA, ...varsB])).filter(
      (v) => !['Pi', 'E', 'ImaginaryUnit'].includes(v)
    );

    if (allVars.length === 0) {
      try {
        const valA = exprA.N().re;
        const valB = exprB.N().re;
        if (typeof valA === 'number' && typeof valB === 'number' && Number.isFinite(valA) && Number.isFinite(valB)) {
          return Math.abs(valA - valB) < 1e-9 ? 'true' : 'false';
        }
      } catch {
        // Continue
      }
    }

    // 7. Probabilistic evaluation on multiple random test points (Schwartz-Zippel approach)
    if (allVars.length > 0 && allVars.length <= 4) {
      const testPoints = [
        [1.7, 2.3, 3.1, 4.7],
        [0.85, 1.45, 2.65, 3.35],
        [2.2, 0.7, 1.9, 2.8],
        [-1.3, -2.1, 1.6, -0.4],
      ];

      let allMatched = true;
      let validTestCount = 0;

      for (const sample of testPoints) {
        const subsMap: Record<string, number> = {};
        allVars.forEach((v, idx) => {
          subsMap[v] = sample[idx % sample.length];
        });

        try {
          const valA = exprA.subs(subsMap).N().re;
          const valB = exprB.subs(subsMap).N().re;

          if (
            typeof valA === 'number' &&
            typeof valB === 'number' &&
            Number.isFinite(valA) &&
            Number.isFinite(valB)
          ) {
            validTestCount++;
            if (Math.abs(valA - valB) > 1e-6) {
              allMatched = false;
              return 'false';
            }
          }
        } catch {
          // Point might be outside domain
        }
      }

      if (validTestCount >= 2 && allMatched) {
        return 'true';
      }
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}
