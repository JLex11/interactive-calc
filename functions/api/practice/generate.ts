import { callGemini, jsonResponse, handleOptions } from '../_gemini';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost(context: any) {
  try {
    const request = context.request;
    const env = context.env || {};
    const body: any = await request.json();
    const { topic, difficulty = 'intermedio' } = body || {};

    const apiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);

    if (!apiKey) {
      return jsonResponse({
        id: 'practice-cf-' + Date.now(),
        topic: topic || 'Integración por partes',
        title: 'Integral de x e^(2x) dx',
        difficulty: difficulty || 'intermedio',
        problemLatex: '\\int x e^{2x} \\, dx',
        context: 'Aplica el método de integración por partes definiendo adecuadamente u y dv.',
        currentStepIndex: 0,
        isCompleted: false,
        userAttempts: [],
        steps: [
          {
            stepNumber: 1,
            instruction: 'Paso 1: Define las variables u y dv.',
            expectedConcept: 'u = x, dv = e^(2x) dx',
            expectedLatex: 'u = x, \\quad dv = e^{2x} \\, dx',
            hints: ['Elige u como la función que se simplifica al derivarla.', 'La exponencial se integra con facilidad.'],
          },
          {
            stepNumber: 2,
            instruction: 'Paso 2: Calcula du y v.',
            expectedConcept: 'du = dx, v = (1/2) e^(2x)',
            expectedLatex: 'du = dx, \\quad v = \\frac{1}{2} e^{2x}',
            hints: ['La derivada de x es 1.', 'Recuerda dividir por el coeficiente 2 al integrar e^(2x).'],
          },
          {
            stepNumber: 3,
            instruction: 'Paso 3: Aplica la fórmula u·v - ∫ v du y resuelve el resultado final.',
            expectedConcept: '(1/2) x e^(2x) - (1/4) e^(2x) + C',
            expectedLatex: '\\frac{1}{2} x e^{2x} - \\frac{1}{4} e^{2x} + C',
            hints: ['Multiplica u y v, luego integra la segunda parte.', 'Suma la constante de integración C.'],
          },
        ],
      });
    }

    const prompt = `Genera un ejercicio educativo de práctica activa de cálculo.
Tema: "${topic || 'Integración por partes'}"
Nivel de dificultad: "${difficulty}"

El ejercicio debe estar diseñado para que el usuario intente resolverlo paso a paso.
Estructura:
- Título claro y conciso
- Expresión del problema en LaTeX (ej: \\int x \\sin(2x) \\, dx)
- Contexto o meta de aprendizaje breve
- 3 a 4 pasos guiados. Cada paso debe tener:
  - instruction: la instrucción pedagógica para ese paso (ej. "Paso 1: Define u y dv")
  - expectedConcept: descripción conceptual de lo esperado
  - expectedLatex: fórmula matemática en LaTeX que representa el paso correcto
  - hints: 2 a 3 pistas progresivas (la primera muy sutil, la última más explícita) que ayuden a pensar antes de dar la respuesta.
Responde estrictamente en formato JSON en español.`;

    const practiceSchema = {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        problemLatex: { type: 'STRING' },
        context: { type: 'STRING' },
        steps: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              stepNumber: { type: 'INTEGER' },
              instruction: { type: 'STRING' },
              expectedConcept: { type: 'STRING' },
              expectedLatex: { type: 'STRING' },
              hints: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: ['stepNumber', 'instruction', 'expectedConcept', 'expectedLatex', 'hints'],
          },
        },
      },
      required: ['title', 'problemLatex', 'context', 'steps'],
    };

    const parsed = await callGemini(apiKey, prompt, practiceSchema);

    return jsonResponse({
      id: 'practice-' + Date.now(),
      topic: topic || 'Cálculo',
      title: parsed.title,
      difficulty,
      problemLatex: parsed.problemLatex,
      context: parsed.context,
      currentStepIndex: 0,
      isCompleted: false,
      userAttempts: [],
      steps: parsed.steps || [],
    });
  } catch (err: any) {
    console.error('Cloudflare Pages practice/generate error:', err);
    return jsonResponse({
      id: 'practice-cf-fallback-' + Date.now(),
      topic: 'Cálculo',
      title: 'Práctica: Derivación y Regla de la Cadena',
      difficulty: 'intermedio',
      problemLatex: '\\frac{d}{dx}\\left[ (3x^2 + 1)^4 \\right]',
      context: 'Aplica la regla de la cadena reconociendo la función exterior y la función interior.',
      currentStepIndex: 0,
      isCompleted: false,
      userAttempts: [],
      steps: [
        {
          stepNumber: 1,
          instruction: 'Paso 1: Identifica la función exterior u^4 y su derivada respecto a u.',
          expectedConcept: '4u^3, donde u = 3x^2 + 1',
          expectedLatex: '4(3x^2 + 1)^3',
          hints: ['Deriva como si fuera una potencia simple.', 'Mantén la función interior intacta en este primer paso.'],
        },
        {
          stepNumber: 2,
          instruction: 'Paso 2: Deriva la función interior u = 3x^2 + 1 respecto a x.',
          expectedConcept: '6x',
          expectedLatex: '6x',
          hints: ['La derivada de 3x^2 es 6x.', 'La derivada de la constante 1 es 0.'],
        },
        {
          stepNumber: 3,
          instruction: 'Paso 3: Multiplica ambas derivadas y simplifica el resultado final.',
          expectedConcept: '24x(3x^2 + 1)^3',
          expectedLatex: '24x(3x^2 + 1)^3',
          hints: ['Multiplica el coeficiente 4 por 6x.', 'Deja el binomio elevado al cubo sin expandir.'],
        },
      ],
    });
  }
}
