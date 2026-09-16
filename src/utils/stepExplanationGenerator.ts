import { SolutionStep, ExplanationQuestionType, StepExplanationBranch } from '../types';

/**
 * Generates an analytical, mathematically sound explanation branch for any step.
 * Used for instant client-side response when the network stream is slow or as a fallback.
 */
export function generateDeterministicBranchExplanation(params: {
  expression: string;
  step: SolutionStep;
  questionType: ExplanationQuestionType;
  questionText?: string;
  targetPart?: string;
}): StepExplanationBranch {
  const { expression, step, questionType, questionText, targetPart } = params;
  const branchId = 'branch-' + Date.now();

  const defaultTitle = targetPart
    ? `Análisis del término ${targetPart}`
    : questionType === 'how_did_we_get_here'
    ? '¿Cómo llegamos a este paso?'
    : questionType === 'analogy'
    ? 'Analogía intuitiva'
    : questionType === 'simpler'
    ? 'Explicación más simple'
    : 'Profundización pedagógica';

  // Specific content based on question type
  if (questionType === 'how_did_we_get_here') {
    return {
      id: branchId,
      stepId: step.id,
      questionType,
      targetPart,
      questionText: questionText || '¿Cómo pasamos a esta expresión?',
      title: 'Desglose del paso analítico',
      conceptualExplanation: `En este paso aplicamos la regla fundamental: ${step.rule || 'equivalencia algebraica y cálculo'}. Partiendo de la estructura anterior, sustituimos y reagrupamos términos para llegar a la forma canónica actual: ${step.latex}.`,
      analogy: 'Es análogo a descomponer una transformación compuesta en sus movimientos elementales para verificar que cada transformación mantenga el equilibrio.',
      breakdownSteps: step.intermediateSteps && step.intermediateSteps.length > 0
        ? step.intermediateSteps
        : [
            {
              latex: step.latex,
              explanation: `Aplicamos ${step.rule || 'las reglas de derivación o integración correspondientes'}.`,
            },
          ],
      timestamp: Date.now(),
    };
  }

  if (questionType === 'analogy') {
    let analogyText = 'Es como desenredar un nudo complejo soltando primero las hebras exteriores antes de tocar el centro.';
    if (step.rule?.toLowerCase().includes('partes') || step.latex.includes('uv') || step.latex.includes('dv')) {
      analogyText = 'La integración por partes es como un intercambio comercial: cambias una integral difícil por el producto de dos componentes y una integral remanente mucho más accesible.';
    } else if (step.rule?.toLowerCase().includes('cadena') || step.rule?.toLowerCase().includes('chain')) {
      analogyText = 'Es como pelar una cebolla o abrir muñecas rusas (matrioshkas): primero derivas la capa exterior conservando el interior intacto, y luego multiplicas por la derivada de lo que había adentro.';
    } else if (step.rule?.toLowerCase().includes('factor') || step.rule?.toLowerCase().includes('distributiv')) {
      analogyText = 'Es como agrupar herramientas del mismo tipo en una sola caja: al sacar el factor común, la expresión se vuelve más ligera y fácil de manipular.';
    }

    return {
      id: branchId,
      stepId: step.id,
      questionType,
      targetPart,
      questionText: questionText || 'Dame una analogía intuitiva',
      title: 'Analogía intuitiva',
      conceptualExplanation: `Para entender conceptualmente ${step.title || 'este paso'}, podemos visualizarlo sin tecnicismos:`,
      analogy: analogyText,
      timestamp: Date.now(),
    };
  }

  if (questionType === 'simpler') {
    return {
      id: branchId,
      stepId: step.id,
      questionType,
      targetPart,
      questionText: questionText || 'Explícamelo más fácil',
      title: 'Explicación elemental sin tecnicismos',
      conceptualExplanation: `Lo que hicimos de manera directa fue transformar ${step.latex} usando la regla de ${step.rule || 'simplificación analítica'}. Conservamos exactamente el mismo valor matemático pero escrito en un formato más manejable.`,
      simplerExample: {
        latex: '2x + 3x = (2+3)x = 5x',
        explanation: 'Igual que sumamos términos semejantes agrupando coeficientes, en este paso aplicamos la misma idea de factor común o regla analítica.',
      },
      timestamp: Date.now(),
    };
  }

  // targetPart or custom
  if (targetPart) {
    return {
      id: branchId,
      stepId: step.id,
      questionType,
      targetPart,
      questionText: questionText || `¿Qué función cumple ${targetPart}?`,
      title: `Análisis de ${targetPart}`,
      conceptualExplanation: `El término ${targetPart} actúa como un componente clave en la ecuación ${step.latex}. Se deriva o transforma siguiendo la propiedad de ${step.rule || 'cálculo analítico'}, asegurando la conservación de la igualdad en todo momento.`,
      timestamp: Date.now(),
    };
  }

  return {
    id: branchId,
    stepId: step.id,
    questionType,
    targetPart,
    questionText: questionText || defaultTitle,
    title: defaultTitle,
    conceptualExplanation: `En este paso aplicamos ${step.rule || 'las leyes matemáticas fundamentales'}. La ecuación resultante ${step.latex} representa el avance analítico verificado hacia la solución final.`,
    timestamp: Date.now(),
  };
}
