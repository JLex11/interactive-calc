import { callGemini, jsonResponse, handleOptions } from '../_gemini';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost(context: any) {
  try {
    const request = context.request;
    const env = context.env || {};
    const body: any = await request.json();
    const { problem, currentStepIndex, userProposal } = body || {};

    const currentStep = problem?.steps?.[currentStepIndex];
    if (!currentStep) {
      return jsonResponse({ error: 'Paso no válido' }, 400);
    }

    const apiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);

    if (!apiKey) {
      const cleanUser = (userProposal || '').toLowerCase().replace(/[\s\\]/g, '');
      const cleanExpected = (currentStep.expectedLatex || '').toLowerCase().replace(/[\s\\]/g, '');
      const isClose = cleanUser.length > 2 && (cleanExpected.includes(cleanUser) || cleanUser.includes(cleanExpected));

      return jsonResponse({
        isCorrect: isClose,
        feedback: isClose
          ? '¡Excelente razonamiento! Has identificado la relación matemática correcta.'
          : 'Revisa con cuidado las operaciones de este paso. Compara con la instrucción.',
        hint: currentStep.hints?.[0] || 'Piensa en la regla principal de este paso.',
        canAdvance: isClose,
        revealedStep: isClose ? currentStep.expectedLatex : undefined,
      });
    }

    const prompt = `Eres un tutor de cálculo ayudando a un estudiante en un ejercicio de práctica interactiva con el modelo gemini-3.1-flash-lite.
Problema principal: ${problem.problemLatex}
Paso actual (#${currentStep.stepNumber}):
Instrucción dada al alumno: "${currentStep.instruction}"
Paso esperado por el tutor (LaTeX): "${currentStep.expectedLatex}"
Concepto esperado: "${currentStep.expectedConcept}"

Respuesta o propuesta del estudiante:
"${userProposal}"

Tu tarea pedagógica:
1. Evalúa si la respuesta del alumno es matemáticamente equivalente o correcta para este paso, permitiendo variaciones de notación comunes (ej. u=x; v=sin(x) vs u=x, dv=cos(x)dx).
2. Si es CORRECTA (isCorrect=true): Felicita brevemente y resalta por qué su razonamiento es acertado. canAdvance=true.
3. Si es INCORRECTA (isCorrect=false): NO le des la respuesta directa. Explica el error conceptual o matemático con empatía, y dale una pista ("hint") que le permita reflexionar e intentarlo nuevamente. canAdvance=false.
4. Mantén la filosofía: "Ayudar al usuario a pensar antes de darle la respuesta".
Responde en formato JSON estrictamente en español.`;

    const validateSchema = {
      type: 'OBJECT',
      properties: {
        isCorrect: { type: 'BOOLEAN' },
        feedback: { type: 'STRING' },
        hint: { type: 'STRING' },
        canAdvance: { type: 'BOOLEAN' },
        revealedStep: { type: 'STRING' },
      },
      required: ['isCorrect', 'feedback', 'canAdvance'],
    };

    const parsed = await callGemini(apiKey, prompt, validateSchema);
    return jsonResponse(parsed);
  } catch (err: any) {
    console.error('Cloudflare Pages practice/validate error:', err);
    return jsonResponse({
      isCorrect: false,
      feedback: 'No pudimos validar con el modelo en este momento. Revisa el planteamiento.',
      hint: 'Revisa las fórmulas y operaciones algebraicas de este paso.',
      canAdvance: false
    });
  }
}
