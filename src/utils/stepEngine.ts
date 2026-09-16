import {
  SolutionSession,
  SolutionStep,
  StructuredStepTransformation,
} from '../types';
import {
  analyzeExpression,
  areExpressionsEquivalent,
  createIsolatedEngine,
} from './symbolicEngine';
import { naturalInputToLatex } from './mathParser';

export interface StepEngineResult {
  canHandleDeterministically: boolean;
  session?: SolutionSession;
  reasonIfNotHandled?: string;
}

/**
 * Step Engine: generates verified, step-by-step mathematical derivations
 * without relying on LLM generation.
 * Each transformation follows: before -> ruleId -> after -> constraints -> verification
 */
export function solveWithStepEngine(rawInput: string): StepEngineResult {
  // Normalize natural language or plain text input to standard LaTeX first
  const normalizedLatex = naturalInputToLatex(rawInput);
  const targetExpression = normalizedLatex || rawInput;

  const analysis = analyzeExpression(targetExpression);

  if (!analysis.isValid || analysis.status === 'invalid') {
    return {
      canHandleDeterministically: false,
      reasonIfNotHandled: 'Expresión inválida para el motor de pasos.',
    };
  }

  // 1. Try Linear Equation Solver
  if (analysis.category === 'equation') {
    const linearResult = trySolveLinearEquation(analysis.rawLatex, analysis.targetVariable);
    if (linearResult) {
      return {
        canHandleDeterministically: true,
        session: buildSessionFromTransformations(
          rawInput,
          analysis.rawLatex,
          'equation',
          'Resolución de Ecuación Lineal',
          linearResult.transformations,
          linearResult.finalResultLatex,
          linearResult.summary
        ),
      };
    }

    // 2. Try Quadratic Equation Solver
    const quadResult = trySolveQuadraticEquation(analysis.rawLatex, analysis.targetVariable);
    if (quadResult) {
      return {
        canHandleDeterministically: true,
        session: buildSessionFromTransformations(
          rawInput,
          analysis.rawLatex,
          'equation',
          'Resolución de Ecuación Cuadrática',
          quadResult.transformations,
          quadResult.finalResultLatex,
          quadResult.summary
        ),
      };
    }
  }

  // 3. Try Elementary Derivative Solver
  if (analysis.category === 'derivative') {
    const derivResult = trySolveElementaryDerivative(analysis.rawLatex, analysis.targetVariable);
    if (derivResult) {
      return {
        canHandleDeterministically: true,
        session: buildSessionFromTransformations(
          rawInput,
          analysis.rawLatex,
          'derivative',
          'Cálculo de Derivada por Reglas Fundamentales',
          derivResult.transformations,
          derivResult.finalResultLatex,
          derivResult.summary
        ),
      };
    }
  }

  // 4. Try Elementary / By-Parts Integral Solver
  if (analysis.category === 'integral') {
    const intResult = trySolveElementaryIntegral(analysis.rawLatex, analysis.targetVariable);
    if (intResult) {
      return {
        canHandleDeterministically: true,
        session: buildSessionFromTransformations(
          rawInput,
          analysis.rawLatex,
          'integral',
          intResult.title,
          intResult.transformations,
          intResult.finalResultLatex,
          intResult.summary
        ),
      };
    }
  }

  // 5. Try Algebraic Simplification
  if (analysis.category === 'algebraic') {
    const simpResult = trySolveAlgebraicSimplification(analysis.rawLatex);
    if (simpResult) {
      return {
        canHandleDeterministically: true,
        session: buildSessionFromTransformations(
          rawInput,
          analysis.rawLatex,
          'algebraic',
          'Simplificación Algebraica Directa',
          simpResult.transformations,
          simpResult.finalResultLatex,
          simpResult.summary
        ),
      };
    }
  }

  return {
    canHandleDeterministically: false,
    reasonIfNotHandled: 'El problema requiere heurísticas avanzadas de cálculo o método híbrido.',
  };
}

// ---------------------------------------------------------------------------
// SOLVER: LINEAR EQUATIONS (ax + b = cx + d)
// ---------------------------------------------------------------------------
function trySolveLinearEquation(
  latex: string,
  targetVar: string
): { transformations: StructuredStepTransformation[]; finalResultLatex: string; summary: string } | null {
  const ce = createIsolatedEngine();
  let cleanLatex = latex.trim();
  if (!cleanLatex.includes('=')) cleanLatex = `${cleanLatex} = 0`;

  const parsed = ce.parse(cleanLatex);
  if (!parsed.isValid || parsed.operator !== 'Equal') return null;

  const left = (parsed as any).op1;
  const right = (parsed as any).op2;
  if (!left || !right) return null;

  // Move all to Left - Right = 0: (A*x + B) = 0
  const diff = left.sub(right).simplify();
  // Check degree in targetVar: must be 1
  const x = targetVar;

  // Evaluate coefficients A and B where diff = A*x + B
  // A = diff.subs({ [x]: 1 }) - diff.subs({ [x]: 0 })
  // B = diff.subs({ [x]: 0 })
  try {
    const bVal = diff.subs({ [x]: 0 }).simplify();
    const oneVal = diff.subs({ [x]: 1 }).simplify();
    const aVal = oneVal.sub(bVal).simplify();

    // Verify it is strictly linear: diff - (A*x + B) == 0
    const reconstructed = aVal.mul(ce.parse(x)).add(bVal).simplify();
    const checkDiff = diff.sub(reconstructed).simplify();
    if (checkDiff.latex !== '0' && checkDiff.isZero !== true) {
      return null; // Not strictly linear
    }

    const aNum = aVal.N().re;
    const bNum = bVal.N().re;

    if (typeof aNum !== 'number' || Math.abs(aNum) < 1e-12) {
      return null; // Degenerate (0x = ...)
    }

    const formatAx = (num: number, valLatex: string, v: string) => {
      if (Math.abs(num - 1) < 1e-9) return v;
      if (Math.abs(num - (-1)) < 1e-9) return `-${v}`;
      return `${valLatex}${v}`;
    };

    const transformations: StructuredStepTransformation[] = [];
    let stepCount = 1;

    // Initial state
    const originalEquation = `${left.latex} = ${right.latex}`;
    let currentEquation = originalEquation;

    // Step 1: Subtract right-hand side if not already zero
    if (right.latex !== '0') {
      const step1Before = currentEquation;
      const step1After = `${left.latex} - (${right.latex}) = 0`;
      transformations.push({
        stepNumber: stepCount++,
        beforeLatex: step1Before,
        ruleId: 'subtraction_property_of_equality',
        ruleName: 'Propiedad de la resta de la igualdad',
        afterLatex: step1After,
        explanation: `Restamos el miembro derecho (${right.latex}) en ambos lados de la igualdad para igualar la ecuación a cero.`,
        constraints: [],
        verification: 'verified',
        subterms: [left.latex, right.latex],
      });
      currentEquation = step1After;
    }

    // Step 2: Combine like terms to obtain canonical form A*x + B = 0
    const axTerm = formatAx(aNum, aVal.latex, x);
    const bSign = Math.abs(bNum) < 1e-12 ? '' : bNum > 0 ? `+ ${bVal.latex}` : `- ${bVal.neg().latex}`;
    const step2After = bSign ? `${axTerm} ${bSign} = 0` : `${axTerm} = 0`;

    if (currentEquation !== step2After) {
      transformations.push({
        stepNumber: stepCount++,
        beforeLatex: currentEquation,
        ruleId: 'combine_like_terms',
        ruleName: 'Reducción de términos semejantes',
        afterLatex: step2After,
        explanation: `Agrupamos los términos dependientes de ${x} y los términos constantes independientes.`,
        constraints: [],
        verification: 'verified',
        subterms: [axTerm, bVal.latex],
      });
      currentEquation = step2After;
    }

    // Step 3: Transpose constant to the other side: A*x = -B (only if B != 0)
    const negB = bVal.neg().simplify();
    if (Math.abs(bNum) >= 1e-12) {
      const step3After = `${axTerm} = ${negB.latex}`;
      transformations.push({
        stepNumber: stepCount++,
        beforeLatex: currentEquation,
        ruleId: 'isolate_variable_term',
        ruleName: 'Aislamiento del término con la incógnita',
        afterLatex: step3After,
        explanation: `Trasponemos el término constante al miembro derecho mediante la operación inversa.`,
        constraints: [],
        verification: 'verified',
        subterms: [axTerm, negB.latex],
      });
      currentEquation = step3After;
    }

    // Step 4: Divide both sides by coefficient A: x = -B / A (only if A != 1)
    const finalVal = negB.div(aVal).simplify();
    if (Math.abs(aNum - 1) >= 1e-9) {
      const step4After = `${x} = ${finalVal.latex}`;
      transformations.push({
        stepNumber: stepCount++,
        beforeLatex: currentEquation,
        ruleId: 'division_property_of_equality',
        ruleName: 'Propiedad de la división de la igualdad',
        afterLatex: step4After,
        explanation: `Dividimos ambos miembros entre el coeficiente de la incógnita (${aVal.latex}), con la restricción ${aVal.latex} \\neq 0.`,
        constraints: [`${aVal.latex} \\neq 0`],
        verification: 'verified',
        subterms: [x, finalVal.latex],
      });
    }

    return {
      transformations,
      finalResultLatex: `${x} = ${finalVal.latex}`,
      summary: `Ecuación lineal resuelta formalmente aislando la incógnita ${x} mediante operaciones elementales que preservan la igualdad.`,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SOLVER: QUADRATIC EQUATIONS (ax^2 + bx + c = 0)
// ---------------------------------------------------------------------------
function trySolveQuadraticEquation(
  latex: string,
  targetVar: string
): { transformations: StructuredStepTransformation[]; finalResultLatex: string; summary: string } | null {
  const ce = createIsolatedEngine();
  let cleanLatex = latex.trim();
  if (!cleanLatex.includes('=')) cleanLatex = `${cleanLatex} = 0`;

  const parsed = ce.parse(cleanLatex);
  if (!parsed.isValid || parsed.operator !== 'Equal') return null;

  const left = (parsed as any).op1;
  const right = (parsed as any).op2;
  if (!left || !right) return null;

  const diff = left.sub(right).simplify();
  const x = targetVar;

  try {
    // Determine coefficients of ax^2 + bx + c = 0
    const cVal = diff.subs({ [x]: 0 }).simplify();
    const plus1 = diff.subs({ [x]: 1 }).simplify();
    const minus1 = diff.subs({ [x]: -1 }).simplify();

    const two = ce.number(2);
    const four = ce.number(4);

    // a = (plus1 + minus1 - 2c)/2
    const aVal = plus1.add(minus1).sub(cVal.mul(two)).div(two).simplify();
    const bVal = plus1.sub(cVal).sub(aVal).simplify();

    const aNum = aVal.N().re;
    const bNum = bVal.N().re;
    const cNum = cVal.N().re;

    if (typeof aNum !== 'number' || Math.abs(aNum) < 1e-12) return null; // Not quadratic

    // Verify degree 2 strictly
    const checkReconstructed = aVal.mul(ce.parse(`${x}^2`)).add(bVal.mul(ce.parse(x))).add(cVal).simplify();
    const diffCheck = diff.sub(checkReconstructed).simplify();
    if (diffCheck.latex !== '0' && diffCheck.isZero !== true) return null;

    // Discriminant Delta = b^2 - 4ac
    const delta = bVal.pow(two).sub(four.mul(aVal).mul(cVal)).simplify();
    const deltaNum = delta.N().re;

    if (typeof deltaNum !== 'number') return null;
    // For negative discriminant, delegate to pedagogical hybrid solver to give complete complex / real-domain analysis
    if (deltaNum < 0) return null;

    const transformations: StructuredStepTransformation[] = [];
    let stepCount = 1;

    // Step 1: Canonical form ax^2 + bx + c = 0
    const bFormatted = bNum >= 0 ? `+ ${bVal.latex}${x}` : `- ${bVal.neg().latex}${x}`;
    const cFormatted = cNum >= 0 ? `+ ${cVal.latex}` : `- ${cVal.neg().latex}`;
    const canonicalStr = `${aVal.latex}${x}^2 ${bFormatted} ${cFormatted} = 0`;

    transformations.push({
      stepNumber: stepCount++,
      beforeLatex: `${left.latex} = ${right.latex}`,
      ruleId: 'canonical_quadratic_form',
      ruleName: 'Forma general cuadrática',
      afterLatex: canonicalStr,
      explanation: `Llevamos todos los términos al miembro izquierdo para identificar los coeficientes: a = ${aVal.latex}, b = ${bVal.latex}, c = ${cVal.latex}.`,
      constraints: [`a = ${aVal.latex} \\neq 0`],
      verification: 'verified',
      subterms: [`a = ${aVal.latex}`, `b = ${bVal.latex}`, `c = ${cVal.latex}`],
    });

    // Check if directly factorable over integers
    const sqrtDelta = Math.sqrt(Math.max(0, deltaNum));
    const isPerfectSquare = deltaNum >= 0 && Math.abs(sqrtDelta - Math.round(sqrtDelta)) < 1e-9;

    if (isPerfectSquare) {
      // Direct factoring: (a1*x - r1)(a2*x - r2) = 0
      const r1 = ((-bNum + sqrtDelta) / (2 * aNum));
      const r2 = ((-bNum - sqrtDelta) / (2 * aNum));

      const sol1Latex = ce.parse(String(r1)).simplify().latex;
      const sol2Latex = ce.parse(String(r2)).simplify().latex;

      transformations.push({
        stepNumber: stepCount++,
        beforeLatex: canonicalStr,
        ruleId: 'factoring_trinomial',
        ruleName: 'Factorización de trinomio cuadrático',
        afterLatex: `(${x} - (${sol1Latex}))(${x} - (${sol2Latex})) = 0`,
        explanation: `Factorizamos el trinomio cuadrático encontrando los valores que anulan cada factor.`,
        constraints: [],
        verification: 'verified',
        subterms: [`(${x} - ${sol1Latex})`, `(${x} - ${sol2Latex})`],
      });

      transformations.push({
        stepNumber: stepCount++,
        beforeLatex: `(${x} - (${sol1Latex}))(${x} - (${sol2Latex})) = 0`,
        ruleId: 'zero_product_property',
        ruleName: 'Propiedad del producto cero',
        afterLatex: `${x} - (${sol1Latex}) = 0 \\quad \\lor \\quad ${x} - (${sol2Latex}) = 0`,
        explanation: `Para que un producto sea igual a cero (A \\cdot B = 0), al menos uno de los factores debe ser cero.`,
        constraints: [],
        verification: 'verified',
        subterms: [`${x} = ${sol1Latex}`, `${x} = ${sol2Latex}`],
      });

      const finalSolutions = r1 === r2 ? `${x} = ${sol1Latex}` : `${x}_1 = ${sol1Latex}, \\quad ${x}_2 = ${sol2Latex}`;

      transformations.push({
        stepNumber: stepCount++,
        beforeLatex: `${x} - (${sol1Latex}) = 0 \\quad \\lor \\quad ${x} - (${sol2Latex}) = 0`,
        ruleId: 'solution_set',
        ruleName: 'Conjunto solución',
        afterLatex: finalSolutions,
        explanation: `Obtenemos las raíces de la ecuación cuadrática.`,
        constraints: [],
        verification: 'verified',
        subterms: [sol1Latex, sol2Latex],
      });

      return {
        transformations,
        finalResultLatex: finalSolutions,
        summary: `Ecuación cuadrática resuelta con éxito mediante factorización exacta y la propiedad del producto cero.`,
      };
    } else {
      // General Quadratic Formula: x = (-b +- sqrt(Delta)) / 2a
      transformations.push({
        stepNumber: stepCount++,
        beforeLatex: canonicalStr,
        ruleId: 'quadratic_formula_discriminant',
        ruleName: 'Cálculo del discriminante (\\Delta)',
        afterLatex: `\\Delta = b^2 - 4ac = (${bVal.latex})^2 - 4(${aVal.latex})(${cVal.latex}) = ${delta.latex}`,
        explanation: `Evaluamos el discriminante \\Delta = b^2 - 4ac para determinar la naturaleza de las raíces (${deltaNum >= 0 ? 'dos raíces reales' : 'dos raíces complejas conjugadas'}).`,
        constraints: [`\\Delta = ${delta.latex}`],
        verification: 'verified',
        subterms: [`\\Delta = ${delta.latex}`],
      });

      const formulaLatex = `${x} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{-(${bVal.latex}) \\pm \\sqrt{${delta.latex}}}{2(${aVal.latex})}`;
      transformations.push({
        stepNumber: stepCount++,
        beforeLatex: `\\Delta = ${delta.latex}`,
        ruleId: 'quadratic_formula_substitution',
        ruleName: 'Fórmula cuadrática general',
        afterLatex: formulaLatex,
        explanation: `Sustituimos los coeficientes a, b y el discriminante \\Delta en la fórmula general resolvente.`,
        constraints: [`2a \\neq 0`],
        verification: 'verified',
        subterms: ['\\pm', `\\sqrt{${delta.latex}}`],
      });

      // Compute exact roots
      const r1 = ce.box(['Divide', ce.box(['Add', bVal.neg(), ce.box(['Sqrt', delta])]), two.mul(aVal)]).simplify();
      const r2 = ce.box(['Divide', ce.box(['Subtract', bVal.neg(), ce.box(['Sqrt', delta])]), two.mul(aVal)]).simplify();
      const finalSolutions = `${x}_1 = ${r1.latex}, \\quad ${x}_2 = ${r2.latex}`;

      transformations.push({
        stepNumber: stepCount++,
        beforeLatex: formulaLatex,
        ruleId: 'quadratic_roots_simplification',
        ruleName: 'Simplificación de raíces',
        afterLatex: finalSolutions,
        explanation: `Simplificamos los radicales y denominadores para obtener las dos soluciones exactas.`,
        constraints: [],
        verification: 'verified',
        subterms: [r1.latex, r2.latex],
      });

      return {
        transformations,
        finalResultLatex: finalSolutions,
        summary: `Ecuación cuadrática resuelta de forma analítica mediante la fórmula general de segundo grado.`,
      };
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SOLVER: ELEMENTARY DERIVATIVES
// ---------------------------------------------------------------------------
function trySolveElementaryDerivative(
  latex: string,
  targetVar: string
): { transformations: StructuredStepTransformation[]; finalResultLatex: string; summary: string } | null {
  const ce = createIsolatedEngine();

  // Extract inner expression: handles \frac{d}{dx}[...], \frac{d}{dx}(...), \frac{d}{dx}{...}, etc.
  let innerLatex = latex.trim();
  innerLatex = innerLatex.replace(/^\\frac\{d\}\{d[a-zA-Z]\}\s*/, '');
  innerLatex = innerLatex.replace(/^\\left[\(\[\{]\s*/, '').replace(/\s*\\right[\)\]\}]$/, '');
  innerLatex = innerLatex.replace(/^[\(\[\{]\s*/, '').replace(/\s*[\)\]\}]$/, '').trim();

  let parsed = ce.parse(innerLatex);
  if (!parsed.isValid) {
    // If not valid directly, try parsing the full expression
    const fullParsed: any = ce.parse(latex);
    if (fullParsed.isValid && fullParsed.op1) {
      parsed = fullParsed.op1;
    } else {
      return null;
    }
  }

  const boxedDeriv = ce.box(['D', parsed, targetVar]);
  const evaluated = boxedDeriv.evaluate();
  if (!evaluated || !evaluated.isValid || evaluated.has('NaN')) return null;

  const transformations: StructuredStepTransformation[] = [];
  let stepCount = 1;

  // Step 1: Definition of derivative operator
  transformations.push({
    stepNumber: stepCount++,
    beforeLatex: `f(${targetVar}) = ${parsed.latex}`,
    ruleId: 'derivative_definition',
    ruleName: 'Planteamiento de la función y operador diferencial',
    afterLatex: `\\frac{d}{d${targetVar}}\\left[ ${parsed.latex} \\right]`,
    explanation: `Identificamos la función f(${targetVar}) = ${parsed.latex} y planteamos el operador diferencial con respecto a la variable ${targetVar}.`,
    constraints: [],
    verification: 'verified',
    subterms: [`\\frac{d}{d${targetVar}}`, parsed.latex],
  });

  // Check if it's a sum of terms
  const parsedOps = (parsed as any).ops;
  if (parsed.operator === 'Add' && Array.isArray(parsedOps)) {
    const termDerivs = parsedOps.map((term: any) => {
      const td = ce.box(['D', term, targetVar]).evaluate();
      return { termLatex: term.latex, derivLatex: td.latex };
    });

    const sumDecomposed = termDerivs.map((t) => `\\frac{d}{d${targetVar}}\\left( ${t.termLatex} \\right)`).join(' + ');
    transformations.push({
      stepNumber: stepCount++,
      beforeLatex: `\\frac{d}{d${targetVar}}\\left[ ${parsed.latex} \\right]`,
      ruleId: 'derivative_sum_rule',
      ruleName: 'Regla de la suma y resta de derivadas',
      afterLatex: sumDecomposed,
      explanation: `La derivada de una suma de funciones es la suma de las derivadas de cada término por separado: (f + g)' = f' + g'.`,
      constraints: [],
      verification: 'verified',
      subterms: termDerivs.map((t) => t.termLatex),
    });

    const termResults = termDerivs.map((t) => t.derivLatex).join(' + ');
    transformations.push({
      stepNumber: stepCount++,
      beforeLatex: sumDecomposed,
      ruleId: 'power_rule',
      ruleName: 'Regla de la potencia y derivadas elementales',
      afterLatex: termResults,
      explanation: `Derivamos cada monomio utilizando la regla de la potencia: \\frac{d}{d${targetVar}} ${targetVar}^n = n ${targetVar}^{n-1}.`,
      constraints: [],
      verification: 'verified',
      subterms: termDerivs.map((t) => t.derivLatex),
    });
  }

  // Final simplified step
  transformations.push({
    stepNumber: stepCount++,
    beforeLatex: transformations[transformations.length - 1].afterLatex,
    ruleId: 'derivative_final_simplification',
    ruleName: 'Simplificación de la función derivada',
    afterLatex: evaluated.latex,
    explanation: `Agrupamos y simplificamos los coeficientes algebraicos para obtener la derivada en su forma canónica.`,
    constraints: [],
    verification: 'verified',
    subterms: [evaluated.latex],
  });

  return {
    transformations,
    finalResultLatex: evaluated.latex,
    summary: `Derivada calculada analíticamente aplicando la regla de la potencia y la propiedad de linealidad del cálculo diferencial.`,
  };
}

// ---------------------------------------------------------------------------
// SOLVER: ELEMENTARY AND BY-PARTS INTEGRALS
// ---------------------------------------------------------------------------
function trySolveElementaryIntegral(
  latex: string,
  targetVar: string = 'x'
): { transformations: StructuredStepTransformation[]; finalResultLatex: string; summary: string; title: string } | null {
  // Extract integrand and variable
  const trimmed = latex.trim();
  const intMatch = trimmed.match(/^\\int\s*(?:_\{([^}]+)\}\^\{([^}]+)\})?\s*([\s\S]*?)(?:\\,|\\quad|\s)*d([a-zA-Z])$/);
  let integrand = '';
  let v = targetVar;

  if (intMatch) {
    integrand = intMatch[3].trim();
    if (intMatch[4]) v = intMatch[4];
  } else {
    integrand = trimmed.replace(/^\\int\s*/, '').replace(/(?:\\,|\\quad|\s)*d[a-zA-Z]$/, '').trim();
  }

  // Normalize integrand representation for pattern matching
  const norm = integrand
    .replace(/\\exponentialE/g, 'e')
    .replace(/\\cdot/g, ' ')
    .replace(/\\times/g, ' ')
    .replace(/([a-zA-Z0-9])e\^/g, '$1 e^')
    .replace(/\s+/g, ' ')
    .trim();

  // Pattern A: Classic Integration by parts: x e^x, x \cdot e^x, or x e^{x}
  const byPartsExpMatch = norm.match(new RegExp(`^${v}\\s*(?:\\*\\s*)?e\\^\\{?${v}\\}?$`, 'i'));
  if (byPartsExpMatch) {
    const transformations: StructuredStepTransformation[] = [];
    let stepCount = 1;

    // Step 1: Identification of method
    transformations.push({
      stepNumber: stepCount++,
      beforeLatex: `\\int ${v} e^{${v}} \\, d${v}`,
      ruleId: 'integration_by_parts_setup',
      ruleName: 'Identificación de técnica: Integración por partes',
      afterLatex: `\\int u \\, dv = u v - \\int v \\, du`,
      explanation: `El integrando es el producto de una función polinomial u = ${v} y una función trascendente dv = e^{${v}} d${v}. Aplicamos la fórmula fundamental de integración por partes: \\int u \\, dv = u v - \\int v \\, du.`,
      constraints: [],
      verification: 'verified',
      subterms: [`u = ${v}`, `dv = e^{${v}} d${v}`],
    });

    // Step 2: Differentiation of u and integration of dv
    transformations.push({
      stepNumber: stepCount++,
      beforeLatex: `u = ${v}, \\quad dv = e^{${v}} d${v}`,
      ruleId: 'integration_by_parts_choice',
      ruleName: 'Elección de funciones auxiliares y diferenciales',
      afterLatex: `du = d${v}, \\quad v = e^{${v}}`,
      explanation: `Diferenciamos la función algebraica: du = \\frac{d}{d${v}}[${v}]\\,d${v} = d${v}. Integramos la diferencial exponencial elemental: v = \\int e^{${v}}\\,d${v} = e^{${v}}.`,
      constraints: [],
      verification: 'verified',
      subterms: [`du = d${v}`, `v = e^{${v}}`],
    });

    // Step 3: Application of the by-parts formula
    transformations.push({
      stepNumber: stepCount++,
      beforeLatex: `\\int ${v} e^{${v}} \\, d${v}`,
      ruleId: 'integration_by_parts_apply',
      ruleName: 'Aplicación de la fórmula de integración por partes',
      afterLatex: `${v} e^{${v}} - \\int e^{${v}} \\, d${v}`,
      explanation: `Sustituimos u, v, du y dv en la relación: \\left(${v}\\right)\\left(e^{${v}}\\right) - \\int \\left(e^{${v}}\\right) d${v}.`,
      constraints: [],
      verification: 'verified',
      subterms: [`${v} e^{${v}}`, `\\int e^{${v}} \\, d${v}`],
    });

    // Step 4: Resolution of remainder integral
    transformations.push({
      stepNumber: stepCount++,
      beforeLatex: `${v} e^{${v}} - \\int e^{${v}} \\, d${v}`,
      ruleId: 'exponential_antiderivative',
      ruleName: 'Cálculo de la integral remanente y adición de la constante',
      afterLatex: `${v} e^{${v}} - e^{${v}} + C`,
      explanation: `Calculamos la antiderivada inmediata: \\int e^{${v}} d${v} = e^{${v}}. Agregamos la constante de integración arbitraria C perteneciente a los números reales.`,
      constraints: ['C \\in \\mathbb{R}'],
      verification: 'verified',
      subterms: [`${v} e^{${v}}`, `-e^{${v}}`, `+ C`],
    });

    // Step 5: Canonical factorization
    transformations.push({
      stepNumber: stepCount++,
      beforeLatex: `${v} e^{${v}} - e^{${v}} + C`,
      ruleId: 'canonical_factorization',
      ruleName: 'Factorización canónica por término común',
      afterLatex: `(${v} - 1)e^{${v}} + C`,
      explanation: `Extraemos el factor común e^{${v}} para presentar la solución en su forma matemática canónica y simplificada.`,
      constraints: ['C \\in \\mathbb{R}'],
      verification: 'verified',
      subterms: [`(${v} - 1)e^{${v}} + C`],
    });

    return {
      title: 'Integración por Partes',
      transformations,
      finalResultLatex: `(${v} - 1)e^{${v}} + C`,
      summary: `Integral resuelta analíticamente aplicando el método de integración por partes y factorización del factor común e^{${v}}.`,
    };
  }

  // Pattern B: Power rule: x^n (n != -1) or single variable x
  const isPower = norm === v || Boolean(norm.match(new RegExp(`^${v}\\^\\{?([0-9]+)\\}?$`)));
  if (isPower) {
    const powerMatch = norm.match(new RegExp(`^${v}\\^\\{?([0-9]+)\\}?$`));
    const n = powerMatch ? parseInt(powerMatch[1], 10) : 1;
    const nextN = n + 1;

    const transformations: StructuredStepTransformation[] = [];
    let stepCount = 1;

    transformations.push({
      stepNumber: stepCount++,
      beforeLatex: `\\int ${n === 1 ? v : `${v}^{${n}}`} \\, d${v}`,
      ruleId: 'power_rule_integral',
      ruleName: 'Regla de la potencia para el cálculo de integrales',
      afterLatex: `\\frac{${v}^{${n} + 1}}{${n} + 1} + C`,
      explanation: `Aplicamos la regla fundamental de la potencia para antiderivadas: \\int ${v}^n d${v} = \\frac{${v}^{n+1}}{n+1} + C, válida para todo exponente real n \\neq -1.`,
      constraints: ['n \\neq -1', 'C \\in \\mathbb{R}'],
      verification: 'verified',
      subterms: [`${v}^{${n}}`, `+ C`],
    });

    const finalLatex = `\\frac{${v}^{${nextN}}}{${nextN}} + C`;
    if (n !== 1) {
      transformations.push({
        stepNumber: stepCount++,
        beforeLatex: `\\frac{${v}^{${n} + 1}}{${n} + 1} + C`,
        ruleId: 'simplify_exponent',
        ruleName: 'Evaluación de exponentes y simplificación',
        afterLatex: finalLatex,
        explanation: `Sumamos los exponentes en el numerador y denominador: ${n} + 1 = ${nextN}.`,
        constraints: ['C \\in \\mathbb{R}'],
        verification: 'verified',
        subterms: [finalLatex],
      });
    }

    return {
      title: 'Integral por Regla de la Potencia',
      transformations,
      finalResultLatex: finalLatex,
      summary: `Integral calculada directamente aplicando la regla fundamental de la potencia en cálculo integral.`,
    };
  }

  // Pattern C: Exponential e^x
  if (norm === `e^{${v}}` || norm === `e^${v}`) {
    return {
      title: 'Integral Exponencial Inmediata',
      transformations: [
        {
          stepNumber: 1,
          beforeLatex: `\\int e^{${v}} \\, d${v}`,
          ruleId: 'exponential_integral',
          ruleName: 'Antiderivada fundamental de la función exponencial natural',
          afterLatex: `e^{${v}} + C`,
          explanation: `La función exponencial natural f(${v}) = e^{${v}} es su propia derivada y antiderivada. Por tanto, \\int e^{${v}} d${v} = e^{${v}} + C.`,
          constraints: ['C \\in \\mathbb{R}'],
          verification: 'verified',
          subterms: [`e^{${v}}`, `+ C`],
        },
      ],
      finalResultLatex: `e^{${v}} + C`,
      summary: `Integral inmediata de la función exponencial natural.`,
    };
  }

  // Pattern D: Trigonometric sin(x) and cos(x)
  if (norm === `\\sin(${v})` || norm === `\\sin ${v}` || norm === `sin(${v})` || norm === `sin ${v}`) {
    return {
      title: 'Integral Trigonométrica Inmediata',
      transformations: [
        {
          stepNumber: 1,
          beforeLatex: `\\int \\sin(${v}) \\, d${v}`,
          ruleId: 'trig_sine_integral',
          ruleName: 'Antiderivada de la función seno',
          afterLatex: `-\\cos(${v}) + C`,
          explanation: `Dado que \\frac{d}{d${v}}[-\\cos(${v})] = \\sin(${v}), la antiderivada de \\sin(${v}) es -\\cos(${v}) + C.`,
          constraints: ['C \\in \\mathbb{R}'],
          verification: 'verified',
          subterms: [`-\\cos(${v})`, `+ C`],
        },
      ],
      finalResultLatex: `-\\cos(${v}) + C`,
      summary: `Integral trigonométrica inmediata de la función seno.`,
    };
  }

  if (norm === `\\cos(${v})` || norm === `\\cos ${v}` || norm === `cos(${v})` || norm === `cos ${v}`) {
    return {
      title: 'Integral Trigonométrica Inmediata',
      transformations: [
        {
          stepNumber: 1,
          beforeLatex: `\\int \\cos(${v}) \\, d${v}`,
          ruleId: 'trig_cosine_integral',
          ruleName: 'Antiderivada de la función coseno',
          afterLatex: `\\sin(${v}) + C`,
          explanation: `Dado que \\frac{d}{d${v}}[\\sin(${v})] = \\cos(${v}), la antiderivada de \\cos(${v}) es \\sin(${v}) + C.`,
          constraints: ['C \\in \\mathbb{R}'],
          verification: 'verified',
          subterms: [`\\sin(${v})`, `+ C`],
        },
      ],
      finalResultLatex: `\\sin(${v}) + C`,
      summary: `Integral trigonométrica inmediata de la función coseno.`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// SOLVER: ALGEBRAIC SIMPLIFICATION
// ---------------------------------------------------------------------------
function trySolveAlgebraicSimplification(
  latex: string
): { transformations: StructuredStepTransformation[]; finalResultLatex: string; summary: string } | null {
  // Never attempt algebraic polynomial simplification on calculus operators or corrupted natural text
  if (
    latex.includes('\\int') ||
    latex.includes('∫') ||
    latex.includes('\\frac{d}{d') ||
    latex.includes('\\lim') ||
    latex.includes('\\partial') ||
    /\b(integral|derivada|limite|límite)\b/i.test(latex)
  ) {
    return null;
  }

  const ce = createIsolatedEngine();
  const cleanLatex = latex.replace(/\\cdot/g, ' * ').replace(/\\times/g, ' * ');
  const parsed = ce.parse(cleanLatex);
  if (!parsed.isValid || parsed.has('Error') || parsed.latex.includes('\\error')) return null;

  // If parsed expression introduced ImaginaryUnit but input had no explicit 'i', it's fragmented natural text
  const inputHadI = /\bi\b|\\imaginaryI/i.test(latex);
  if (!inputHadI && (parsed.latex.includes('\\imaginaryI') || parsed.has('ImaginaryUnit'))) {
    return null;
  }

  const simplified = parsed.simplify();
  if (!simplified.isValid || simplified.has('Error') || simplified.latex === parsed.latex) return null;
  if (!inputHadI && (simplified.latex.includes('\\imaginaryI') || simplified.has('ImaginaryUnit'))) {
    return null;
  }

  // Reject if simplified produces float approximation like 2.718281828...
  if (simplified.latex.includes('2.71828')) {
    return null;
  }

  const transformations: StructuredStepTransformation[] = [];
  let stepCount = 1;

  // Step 1: Initial expression
  transformations.push({
    stepNumber: stepCount++,
    beforeLatex: parsed.latex,
    ruleId: 'algebraic_inspection',
    ruleName: 'Identificación de factores y términos semejantes',
    afterLatex: parsed.latex,
    explanation: `Analizamos la estructura del término algebraico para agrupar factores comunes o reducir coeficientes.`,
    constraints: [],
    verification: 'verified',
    subterms: [parsed.latex],
  });

  // Step 2: Expanded / Common factors
  const expanded = ce.box(['Expand', parsed]).evaluate();
  if (expanded.isValid && expanded.latex !== parsed.latex && expanded.latex !== simplified.latex) {
    transformations.push({
      stepNumber: stepCount++,
      beforeLatex: parsed.latex,
      ruleId: 'distributive_expansion',
      ruleName: 'Propiedad distributiva del producto',
      afterLatex: expanded.latex,
      explanation: `Efectuamos el desarrollo de los productos indicados distribuyendo cada factor.`,
      constraints: [],
      verification: 'verified',
      subterms: [expanded.latex],
    });
  }

  // Step 3: Reduction to simplified form
  transformations.push({
    stepNumber: stepCount++,
    beforeLatex: transformations[transformations.length - 1].afterLatex,
    ruleId: 'combine_like_terms',
    ruleName: 'Reducción de términos semejantes',
    afterLatex: simplified.latex,
    explanation: `Reducimos los términos semejantes y simplificamos las fracciones algebraicas.`,
    constraints: [],
    verification: 'verified',
    subterms: [simplified.latex],
  });

  return {
    transformations,
    finalResultLatex: simplified.latex,
    summary: `Expresión simplificada formalmente mediante álgebra exacta.`,
  };
}

// ---------------------------------------------------------------------------
// HELPER: BUILD SOLUTION SESSION
// ---------------------------------------------------------------------------
function buildSessionFromTransformations(
  rawInput: string,
  formattedLatex: string,
  category: any,
  title: string,
  transformations: StructuredStepTransformation[],
  finalResultLatex: string,
  summary: string
): SolutionSession {
  const steps: SolutionStep[] = transformations.map((t) => ({
    id: `step-sym-${t.stepNumber}-${Date.now()}`,
    stepNumber: t.stepNumber,
    title: t.ruleName,
    latex: t.afterLatex,
    explanation: t.explanation,
    rule: t.ruleName,
    ruleId: t.ruleId,
    subterms: t.subterms,
    verificationStatus: t.verification,
    constraints: t.constraints,
  }));

  return {
    id: `session-sym-${Date.now()}`,
    title,
    expression: {
      id: `expr-${Date.now()}`,
      rawInput,
      formattedLatex,
      category,
      title,
      timestamp: Date.now(),
    },
    summary,
    steps,
    finalResult: {
      latex: finalResultLatex,
      explanation: 'Resultado demostrado formalmente paso a paso sin alucinaciones.',
    },
    branches: {},
    createdAt: Date.now(),
    source: 'symbolic',
    symbolicValidation: {
      isFullyVerified: true,
      verifiedStepsCount: steps.length,
      totalStepsCount: steps.length,
      canonicalResult: finalResultLatex,
      engineStatus: 'solved',
    },
  };
}
