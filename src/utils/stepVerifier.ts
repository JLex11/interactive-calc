import { SolutionStep, StepVerificationStatus } from '../types';
import {
  areExpressionsEquivalent,
  createIsolatedEngine,
} from './symbolicEngine';

export interface TransformationVerification {
  status: StepVerificationStatus;
  reason?: string;
  hasRiskOfExtraneousSolutions?: boolean;
  hasRiskOfLostSolutions?: boolean;
  constraintsDetected?: string[];
}

/**
 * Verifies whether a step transition from `beforeLatex` to `afterLatex` is mathematically valid.
 * For equations: checks if solution sets are preserved and detects risky operations
 * (dividing by an expression that could be zero, squaring that adds extraneous roots, etc.).
 * For expressions: checks algebraic equivalence.
 */
export function isValidTransformation(
  beforeLatex: string,
  afterLatex: string,
  ruleId?: string
): TransformationVerification {
  if (!beforeLatex || !afterLatex) {
    return { status: 'unknown', reason: 'Expresiones incompletas' };
  }

  const cleanBefore = beforeLatex.trim();
  const cleanAfter = afterLatex.trim();

  if (cleanBefore === cleanAfter) {
    return { status: 'verified', reason: 'Identidad directa' };
  }

  const ce = createIsolatedEngine();

  // Case A: Equations (both sides contain '=')
  const beforeIsEq = cleanBefore.includes('=');
  const afterIsEq = cleanAfter.includes('=');

  if (beforeIsEq && afterIsEq) {
    return verifyEquationTransformation(cleanBefore, cleanAfter, ruleId, ce);
  }

  // Case B: Algebraic Expressions (no '=')
  const eqResult = areExpressionsEquivalent(cleanBefore, cleanAfter, ce);
  if (eqResult === 'true') {
    return { status: 'verified', reason: 'Equivalencia algebraica demostrada' };
  }
  if (eqResult === 'false') {
    return { status: 'invalid', reason: 'Discrepancia algebraica detectada' };
  }

  return { status: 'unknown', reason: 'No pudo demostrarse equivalencia estricta en este paso' };
}

/**
 * Checks equation transformations for preservation of solution sets and domain risks.
 */
function verifyEquationTransformation(
  beforeEq: string,
  afterEq: string,
  ruleId: string | undefined,
  ce: any
): TransformationVerification {
  try {
    const parsedBefore = ce.parse(beforeEq);
    const parsedAfter = ce.parse(afterEq);

    if (!parsedBefore.isValid || !parsedAfter.isValid) {
      return { status: 'unknown', reason: 'Sintaxis de ecuación no interpretable' };
    }

    const leftB = parsedBefore.op1;
    const rightB = parsedBefore.op2;
    const leftA = parsedAfter.op1;
    const rightA = parsedAfter.op2;

    if (!leftB || !rightB || !leftA || !rightA) {
      return { status: 'unknown' };
    }

    // Difference representation: Left - Right = 0
    const diffBefore = leftB.sub(rightB).simplify();
    const diffAfter = leftA.sub(rightA).simplify();

    // 1. Direct equivalence of the zero-equated forms
    const diffEq = areExpressionsEquivalent(diffBefore.latex, diffAfter.latex, ce);
    if (diffEq === 'true') {
      return { status: 'verified' };
    }

    // 2. Check if a non-zero scalar constant multiple was applied: diffBefore = k * diffAfter (k != 0)
    try {
      const ratio = diffBefore.div(diffAfter).simplify();
      const isScalarConstant =
        (ratio.unknowns?.length === 0) &&
        (ratio.isConstant === true || ratio.symbols?.length === 0) &&
        ratio.isZero !== true;

      if (isScalarConstant) {
        return {
          status: 'verified',
          reason: `Multiplicación o división por escalar constante no nulo (${ratio.latex})`,
        };
      }
    } catch {
      // Continue
    }

    // 3. Detect known dangerous transformations
    let hasRiskOfExtraneous = false;
    let hasRiskOfLost = false;
    const constraints: string[] = [];

    // Squaring both sides introduces extraneous roots
    if (ruleId?.includes('square') || afterEq.includes('^2')) {
      hasRiskOfExtraneous = true;
      constraints.push('Verificar raíces extrañas generadas al elevar al cuadrado');
    }

    // Dividing by an expression with variables can lose solutions if expression == 0
    if (ruleId?.includes('divide') || ruleId?.includes('division')) {
      hasRiskOfLost = true;
      constraints.push('Requiere restricción de denominador distinto de cero');
    }

    // 4. Compare solution sets
    const varsB = Array.from(parsedBefore.unknowns || ['x']);
    const varName = varsB[0] || 'x';

    try {
      const rootsBefore = parsedBefore.solve(varName);
      const rootsAfter = parsedAfter.solve(varName);

      if (
        Array.isArray(rootsBefore) &&
        Array.isArray(rootsAfter) &&
        rootsBefore.length > 0 &&
        rootsAfter.length > 0
      ) {
        const setB = new Set(rootsBefore.filter((r) => r.isValid).map((r) => r.latex));
        const setA = new Set(rootsAfter.filter((r) => r.isValid).map((r) => r.latex));

        const isSubset = Array.from(setB).every((r) => setA.has(r));
        const isEqualSets = setB.size === setA.size && isSubset;

        if (isEqualSets) {
          return {
            status: 'verified',
            hasRiskOfExtraneousSolutions: hasRiskOfExtraneous,
            hasRiskOfLostSolutions: hasRiskOfLost,
            constraintsDetected: constraints,
          };
        }

        if (isSubset && setA.size > setB.size) {
          return {
            status: 'verified',
            hasRiskOfExtraneousSolutions: true,
            reason: 'Operación válida pero introdujo posibles soluciones extrañas',
            constraintsDetected: constraints,
          };
        }

        // Roots are known and explicitly different -> Invalid step
        const disjoint = Array.from(setB).every((r) => !setA.has(r));
        if (disjoint) {
          return {
            status: 'invalid',
            reason: 'El conjunto solución cambió. Se introdujo una inconsistencia matemática.',
          };
        }
      }
    } catch {
      // Continue
    }

    return {
      status: 'unknown',
      hasRiskOfExtraneousSolutions: hasRiskOfExtraneous,
      hasRiskOfLostSolutions: hasRiskOfLost,
      constraintsDetected: constraints,
    };
  } catch {
    return { status: 'unknown' };
  }
}

/**
 * Validates an entire array of solution steps (e.g. from Gemini or hybrid generation).
 * Marks each step with 'verified', 'invalid', or 'unknown'.
 */
export function verifyAllSolutionSteps(
  initialLatex: string,
  steps: SolutionStep[]
): {
  verifiedSteps: SolutionStep[];
  allVerified: boolean;
  verifiedCount: number;
  invalidCount: number;
} {
  let prevLatex = initialLatex;
  let verifiedCount = 0;
  let invalidCount = 0;

  const verifiedSteps = steps.map((step) => {
    const currentLatex = step.latex;
    const verification = isValidTransformation(prevLatex, currentLatex, step.ruleId || step.rule);

    let finalStatus = step.verificationStatus || verification.status;
    if (verification.status === 'verified') {
      verifiedCount++;
      finalStatus = 'verified';
    } else if (verification.status === 'invalid') {
      invalidCount++;
      finalStatus = 'invalid';
    } else {
      // Keep existing or unknown
      finalStatus = finalStatus || 'unknown';
    }

    const mergedConstraints = Array.from(
      new Set([...(step.constraints || []), ...(verification.constraintsDetected || [])])
    );

    // Update prevLatex for chaining (if current step has valid math)
    if (currentLatex && !currentLatex.includes('...')) {
      prevLatex = currentLatex;
    }

    return {
      ...step,
      verificationStatus: finalStatus,
      constraints: mergedConstraints.length > 0 ? mergedConstraints : undefined,
    };
  });

  return {
    verifiedSteps,
    allVerified: invalidCount === 0 && verifiedCount === steps.length,
    verifiedCount,
    invalidCount,
  };
}
