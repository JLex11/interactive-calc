import { callGemini, jsonResponse, handleOptions } from './_gemini';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost(context: any) {
  try {
    const request = context.request;
    const env = context.env || {};
    const body: any = await request.json();
    const {
      expression,
      step,
      questionType,
      questionText,
      targetPart,
      parentContext,
    } = body || {};

    const apiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);

    if (!apiKey) {
      return jsonResponse({
        id: 'branch-cf-' + Date.now(),
        stepId: step?.id || 'step-unknown',
        questionType: questionType || 'how_did_we_get_here',
        targetPart,
        questionText: questionText || '¿Cómo llegamos a este paso?',
        title: targetPart ? `Análisis de ${targetPart}` : `Profundización: ${step?.title || 'Paso'}`,
        conceptualExplanation: `Este paso se obtiene aplicando ${step?.rule || 'la propiedad matemática correspondiente'}. Al transformar ${step?.latex || 'la ecuación'}, conservamos la equivalencia algebraica para simplificar el cálculo.`,
        analogy: 'Es análogo a descomponer una tarea compleja en sub-tareas más pequeñas y directas.',
        breakdownSteps: step?.intermediateSteps || [],
        timestamp: Date.now()
      });
    }

    const prompt = `Eres un tutor de cálculo socrático y empático.
El estudiante está estudiando la expresión: "${expression}"
Y se encuentra en el Paso #${step?.stepNumber || 1}:
Título del paso: "${step?.title}"
Ecuación del paso (LaTeX): "${step?.latex}"
Explicación actual: "${step?.explanation}"
Regla utilizada: "${step?.rule}"

El estudiante tiene la siguiente duda o petición de profundización:
Tipo de pregunta: "${questionType}"
${targetPart ? `Parte específica seleccionada de la ecuación: "${targetPart}"` : ''}
${questionText ? `Pregunta del estudiante: "${questionText}"` : ''}
${parentContext ? `Contexto adicional previo: "${parentContext}"` : ''}

Objetivo del subflujo:
1. Responde de forma cálida, sin perder el hilo del problema principal.
2. Si preguntó "¿Cómo llegamos aquí?", desglosa los pasos intermedios que habitualmente se omiten en los libros de texto.
3. Si preguntó sobre una parte específica (ej. "${targetPart}"), explica qué rol cumple esa parte, por qué tiene esa derivada o integral y qué representa.
4. Si pidió una analogía o explicación más sencilla, utiliza comparaciones de la vida diaria o intuición visual/geométrica.
5. Si corresponde, incluye un mini-ejemplo más sencillo que ilustre exactamente el mismo concepto.
Responde en formato JSON estrictamente en español.`;

    const explainSchema = {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        conceptualExplanation: { type: 'STRING' },
        analogy: { type: 'STRING' },
        breakdownSteps: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              latex: { type: 'STRING' },
              explanation: { type: 'STRING' }
            },
            required: ['latex', 'explanation']
          }
        },
        simplerExample: {
          type: 'OBJECT',
          properties: {
            latex: { type: 'STRING' },
            explanation: { type: 'STRING' }
          },
          required: ['latex', 'explanation']
        },
        ruleDeepDive: {
          type: 'OBJECT',
          properties: {
            ruleName: { type: 'STRING' },
            formula: { type: 'STRING' },
            whyItWorks: { type: 'STRING' }
          },
          required: ['ruleName', 'formula', 'whyItWorks']
        }
      },
      required: ['title', 'conceptualExplanation']
    };

    const parsed = await callGemini(apiKey, prompt, explainSchema);

    return jsonResponse({
      id: 'branch-' + Date.now(),
      stepId: step?.id,
      questionType: questionType || 'how_did_we_get_here',
      targetPart,
      questionText: questionText || parsed.title || 'Profundización del paso',
      title: parsed.title || 'Explicación del paso',
      conceptualExplanation: parsed.conceptualExplanation,
      analogy: parsed.analogy,
      breakdownSteps: parsed.breakdownSteps || [],
      simplerExample: parsed.simplerExample,
      ruleDeepDive: parsed.ruleDeepDive,
      timestamp: Date.now()
    });
  } catch (err: any) {
    console.error('Cloudflare Pages explain-step error:', err);
    return jsonResponse({
      id: 'branch-cf-err-' + Date.now(),
      questionType: 'how_did_we_get_here',
      title: 'Profundización del paso',
      conceptualExplanation: 'Este paso se fundamenta en la aplicación de las reglas elementales de cálculo y simplificación algebraica.',
      analogy: 'Es como factorizar un número en sus componentes primos antes de dividir.',
      breakdownSteps: [],
      timestamp: Date.now()
    });
  }
}
