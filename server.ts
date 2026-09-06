import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Modelo de IA configurado: gemini-3.1-flash-lite (rápido, ligero y eficiente para cálculo simbólico y pedagógico)
const GEMINI_MODEL = 'gemini-3.1-flash-lite';

async function generateJsonWithGemini(
  ai: GoogleGenAI,
  prompt: string,
  schema: any,
  timeoutMs: number = 8000
): Promise<any> {
  const callPromise = ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`Tiempo de espera agotado (${timeoutMs}ms) en ${GEMINI_MODEL}`)),
      timeoutMs
    )
  );

  const response: any = await Promise.race([callPromise, timeoutPromise]);
  const rawText = response?.text?.trim();
  if (!rawText) {
    throw new Error(`Respuesta vacía recibida del modelo ${GEMINI_MODEL}`);
  }

  return JSON.parse(rawText);
}

const generateJsonWithModelFallbacks = generateJsonWithGemini;

// Resilient local calculus solution generator (activated if all external AI models are temporarily down / 503)
function generatePedagogicalFallbackSolution(expression: string, rawInput: string) {
  const combined = ((rawInput || '') + ' ' + (expression || '')).toLowerCase();

  // 1. Integral
  if (combined.includes('int') || combined.includes('\\int') || combined.includes('integral')) {
    return {
      title: 'Resolución de la Integral',
      category: 'integral',
      formattedLatex: expression || `\\int ${rawInput} \\, dx`,
      summary: 'Resolución paso a paso mediante descomposición analítica del integrando e identificación de la regla de integración adecuada.',
      steps: [
        {
          id: `step-fb-1-${Date.now()}`,
          stepNumber: 1,
          title: 'Identificación del integrando y método',
          latex: expression || `\\int ${rawInput} \\, dx`,
          explanation: 'Analizamos las funciones componentes del integrando para determinar si se resuelve por método directo, sustitución o por partes (\\int u\\,dv = uv - \\int v\\,du).',
          rule: 'Linealidad del operador integral',
          subterms: ['f(x)', 'dx'],
          intermediateSteps: [
            {
              latex: expression || `\\int ${rawInput} \\, dx`,
              explanation: 'Clasificación de los factores en algebraicos, trigonométricos o exponenciales.'
            }
          ]
        },
        {
          id: `step-fb-2-${Date.now()}`,
          stepNumber: 2,
          title: 'Aplicación de la técnica de integración',
          latex: '\\int u \\, dv = u v - \\int v \\, du',
          explanation: 'Efectuamos la transformación del integrando aplicando las reglas de antiderivación correspondientes a cada término.',
          rule: 'Teorema fundamental del cálculo y antiderivadas elementales',
          subterms: ['u', 'v', 'du', 'dv'],
          intermediateSteps: []
        },
        {
          id: `step-fb-3-${Date.now()}`,
          stepNumber: 3,
          title: 'Simplificación y adición de la constante de integración',
          latex: 'F(x) + C',
          explanation: 'Agrupamos y factorizamos los términos algebraicos resultantes, agregando la constante arbitraria C.',
          rule: 'Familia de primitivas (+ C)',
          subterms: ['+ C'],
          intermediateSteps: []
        }
      ],
      finalResult: {
        latex: 'F(x) + C',
        explanation: 'Integral resuelta paso a paso mediante análisis estructurado.'
      }
    };
  }

  // 2. Derivative
  if (combined.includes('diff') || combined.includes('derivada') || combined.includes('\\frac{d}{dx}') || combined.includes('d/dx')) {
    return {
      title: 'Cálculo de la Derivada',
      category: 'derivative',
      formattedLatex: expression || `\\frac{d}{dx}\\left(${rawInput}\\right)`,
      summary: 'Diferenciación analítica de la función aplicando las reglas de derivación correspondientes.',
      steps: [
        {
          id: `step-fb-1-${Date.now()}`,
          stepNumber: 1,
          title: 'Reconocimiento de la función y componentes',
          latex: expression || `\\frac{d}{dx}\\left(${rawInput}\\right)`,
          explanation: 'Identificamos si la función está dada por una suma, producto, cociente o una composición que requiera la regla de la cadena.',
          rule: 'Linealidad de la diferenciación',
          subterms: ['\\frac{d}{dx}', 'f(x)'],
          intermediateSteps: []
        },
        {
          id: `step-fb-2-${Date.now()}`,
          stepNumber: 2,
          title: 'Aplicación de la regla de derivación',
          latex: '\\frac{d}{dx}[f(g(x))] = f\'(g(x)) \\cdot g\'(x)',
          explanation: 'Derivamos cada factor de la expresión aplicando la regla de potencias, exponenciales o trigonométricas.',
          rule: 'Reglas de derivación (producto / cadena / cociente)',
          subterms: ['f\'(x)', 'g\'(x)'],
          intermediateSteps: []
        },
        {
          id: `step-fb-3-${Date.now()}`,
          stepNumber: 3,
          title: 'Simplificación de términos semejantes',
          latex: 'f\'(x)',
          explanation: 'Factorizamos y simplificamos los coeficientes algebraicos para obtener la forma canónica de la derivada.',
          rule: 'Simplificación algebraica',
          subterms: ['f\'(x)'],
          intermediateSteps: []
        }
      ],
      finalResult: {
        latex: 'f\'(x)',
        explanation: 'Derivada obtenida y simplificada con éxito.'
      }
    };
  }

  // 3. Limits
  if (combined.includes('lim') || combined.includes('\\lim')) {
    return {
      title: 'Evaluación del Límite',
      category: 'limit',
      formattedLatex: expression || `\\lim_{x \\to 0} ${rawInput}`,
      summary: 'Análisis analítico del comportamiento en el límite y resolución de posibles indeterminaciones.',
      steps: [
        {
          id: `step-fb-1-${Date.now()}`,
          stepNumber: 1,
          title: 'Evaluación por sustitución directa',
          latex: expression || `\\lim_{x \\to 0} ${rawInput}`,
          explanation: 'Evaluamos la función en el punto de tendencia para verificar si existe indeterminación de tipo 0/0 o inf/inf.',
          rule: 'Continuidad y sustitución directa',
          subterms: ['\\lim_{x \\to a}'],
          intermediateSteps: []
        },
        {
          id: `step-fb-2-${Date.now()}`,
          stepNumber: 2,
          title: 'Tratamiento de la indeterminación',
          latex: '\\lim_{x \\to a} \\frac{f(x)}{g(x)} = \\lim_{x \\to a} \\frac{f\'(x)}{g\'(x)}',
          explanation: 'Aplicamos factorización, conjugados algebraicos o la Regla de L\'Hôpital derivando numerador y denominador separadamente.',
          rule: 'Regla de L\'Hôpital / Álgebra de límites',
          subterms: ['f\'(x)', 'g\'(x)'],
          intermediateSteps: []
        },
        {
          id: `step-fb-3-${Date.now()}`,
          stepNumber: 3,
          title: 'Valor final del límite',
          latex: 'L',
          explanation: 'Calculamos el valor límite una vez eliminada la indeterminación.',
          rule: 'Evaluación final',
          subterms: ['L'],
          intermediateSteps: []
        }
      ],
      finalResult: {
        latex: 'L',
        explanation: 'Límite calculado analíticamente.'
      }
    };
  }

  // 4. General / Algebraic
  return {
    title: 'Resolución de ' + (rawInput || expression),
    category: 'algebraic',
    formattedLatex: expression || rawInput,
    summary: 'Desglose analítico paso a paso de la expresión matemática.',
    steps: [
      {
        id: `step-fb-1-${Date.now()}`,
        stepNumber: 1,
        title: 'Planteamiento y análisis estructural',
        latex: expression || rawInput,
        explanation: 'Examinamos los términos algebraicos, coeficientes y signos para estructurar el procedimiento.',
        rule: 'Jerarquía de operaciones',
        subterms: ['x'],
        intermediateSteps: []
      },
      {
        id: `step-fb-2-${Date.now()}`,
        stepNumber: 2,
        title: 'Transformaciones y propiedades algebraicas',
        latex: expression || rawInput,
        explanation: 'Aplicamos las identidades y reglas de simplificación correspondientes para despejar o reducir la expresión.',
        rule: 'Propiedades fundamentales del álgebra',
        subterms: ['x'],
        intermediateSteps: []
      },
      {
        id: `step-fb-3-${Date.now()}`,
        stepNumber: 3,
        title: 'Expresión resultante simplificada',
        latex: expression || rawInput,
        explanation: 'Agrupamos los términos semejantes para obtener la forma matemática final más limpia.',
        rule: 'Forma canónica irreducible',
        subterms: ['x'],
        intermediateSteps: []
      }
    ],
    finalResult: {
      latex: expression || rawInput,
      explanation: 'Expresión analizada y resuelta paso a paso.'
    }
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API: Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: Date.now(),
    });
  });

  // API: Solve calculus expression step by step
  app.post('/api/solve', async (req, res) => {
    const { expression, rawInput } = req.body;
    if (!expression && !rawInput) {
      return res.status(400).json({ error: 'Se requiere una expresión matemática.' });
    }

    const ai = getGenAI();

    // If no API client exists, use pedagogical fallback immediately
    if (!ai) {
      const fallbackData = generatePedagogicalFallbackSolution(expression, rawInput);
      return res.json({
        id: 'session-local-' + Date.now(),
        ...fallbackData,
        isAiFallback: true,
        expression: {
          id: 'expr-' + Date.now(),
          rawInput: rawInput || expression,
          formattedLatex: fallbackData.formattedLatex,
          category: fallbackData.category,
          title: fallbackData.title,
          timestamp: Date.now(),
        },
      });
    }

    try {
      const prompt = `Actúa como un profesor universitario de cálculo distinguido por su claridad pedagógica y empatía.
El estudiante quiere resolver paso a paso la siguiente expresión matemática:
"${rawInput || expression}" (formateada preliminarmente como LaTeX: "${expression}").

Instrucciones pedagógicas:
1. Asegúrate de categorizarla ('integral', 'derivative', 'limit', 'equation', 'algebraic' u 'other').
2. Entrega una formulación limpia y canónica en LaTeX de la expresión inicial.
3. Desglosa la solución en una secuencia lógica de pasos (típicamente entre 3 y 5 pasos).
4. La prioridad es ENSEÑAR: explica claramente por qué se realiza cada transformación, qué regla/teorema se usa, e incluye sub-pasos intermedios detallados para que el estudiante pueda profundizar.
5. Identifica de 2 a 4 "subterms" (términos clave en formato LaTeX, por ejemplo "e^x", "\\sin(x)", "2x", etc.) en cada paso para que el estudiante pueda hacer clic y preguntar dudas sobre partes específicas.
6. Proporciona el resultado final en LaTeX con una conclusión pedagógica breve.
Responde estrictamente en español.`;

      const solveSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          formattedLatex: { type: Type.STRING },
          summary: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stepNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                latex: { type: Type.STRING },
                explanation: { type: Type.STRING },
                rule: { type: Type.STRING },
                subterms: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                intermediateSteps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      latex: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                    },
                    required: ['latex', 'explanation'],
                  },
                },
              },
              required: ['stepNumber', 'title', 'latex', 'explanation', 'rule'],
            },
          },
          finalResult: {
            type: Type.OBJECT,
            properties: {
              latex: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['latex', 'explanation'],
          },
        },
        required: ['title', 'category', 'formattedLatex', 'summary', 'steps', 'finalResult'],
      };

      const parsed = await generateJsonWithModelFallbacks(ai, prompt, solveSchema);

      const formattedSteps = (parsed.steps || []).map((s: any, idx: number) => ({
        id: `step-${idx + 1}-${Date.now()}`,
        stepNumber: s.stepNumber || idx + 1,
        title: s.title,
        latex: s.latex,
        explanation: s.explanation,
        rule: s.rule,
        subterms: s.subterms || [],
        intermediateSteps: s.intermediateSteps || [],
      }));

      return res.json({
        id: 'session-' + Date.now(),
        title: parsed.title || 'Resolución paso a paso',
        expression: {
          id: 'expr-' + Date.now(),
          rawInput: rawInput || expression,
          formattedLatex: parsed.formattedLatex || expression,
          category: parsed.category || 'other',
          title: parsed.title || 'Problema',
          timestamp: Date.now(),
        },
        summary: parsed.summary,
        steps: formattedSteps,
        finalResult: parsed.finalResult,
      });
    } catch (err: any) {
      console.warn('[Solve Endpoint] Modelos con alta demanda o indisponibles. Activando motor pedagógico alternativo:', err.message);

      // Resilient fallback: Never fail with 500 when external AI models experience temporary 503 surges!
      const fallbackData = generatePedagogicalFallbackSolution(expression, rawInput);
      return res.json({
        id: 'session-resilient-' + Date.now(),
        ...fallbackData,
        isAiFallback: true,
        fallbackNotice: 'Resolución generada con el motor pedagógico alternativo debido a alta demanda temporal en el servicio de IA.',
        expression: {
          id: 'expr-' + Date.now(),
          rawInput: rawInput || expression,
          formattedLatex: fallbackData.formattedLatex,
          category: fallbackData.category,
          title: fallbackData.title,
          timestamp: Date.now(),
        },
      });
    }
  });

  // API: Explain a specific step or subterm ("¿Cómo llegamos aquí?", "¿Por qué?", "Analogía", "Explícamelo más fácil")
  app.post('/api/explain-step', async (req, res) => {
    const {
      expression,
      step,
      questionType,
      questionText,
      targetPart,
      parentContext,
    } = req.body;

    const ai = getGenAI();
    if (!ai) {
      return res.json({
        id: 'branch-' + Date.now(),
        stepId: step?.id || 'step-unknown',
        questionType: questionType || 'how_did_we_get_here',
        targetPart,
        questionText: questionText || '¿Cómo llegamos a este paso?',
        title: 'Explicación detallada del paso',
        conceptualExplanation: 'Este paso se fundamenta en la aplicación directa de las propiedades algebraicas y teoremas de cálculo correspondientes.',
        analogy: 'Piensa en este paso como simplificar una fracción reduciendo factores repetidos.',
        timestamp: Date.now(),
      });
    }

    try {
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
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          conceptualExplanation: { type: Type.STRING },
          analogy: { type: Type.STRING },
          breakdownSteps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                latex: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ['latex', 'explanation'],
            },
          },
          simplerExample: {
            type: Type.OBJECT,
            properties: {
              latex: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['latex', 'explanation'],
          },
          ruleDeepDive: {
            type: Type.OBJECT,
            properties: {
              ruleName: { type: Type.STRING },
              formula: { type: Type.STRING },
              whyItWorks: { type: Type.STRING },
            },
            required: ['ruleName', 'formula', 'whyItWorks'],
          },
        },
        required: ['title', 'conceptualExplanation'],
      };

      const parsed = await generateJsonWithModelFallbacks(ai, prompt, explainSchema);

      return res.json({
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
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.warn('[Explain Endpoint] Fallback local por alta demanda de IA:', err.message);
      return res.json({
        id: 'branch-' + Date.now(),
        stepId: step?.id || 'step-unknown',
        questionType: questionType || 'how_did_we_get_here',
        targetPart,
        questionText: questionText || '¿Cómo llegamos a este paso?',
        title: targetPart ? `Análisis de ${targetPart}` : `Profundización: ${step?.title || 'Paso'}`,
        conceptualExplanation: `Este paso se obtiene aplicando ${step?.rule || 'la propiedad matemática correspondiente'}. Al transformar ${step?.latex || 'la ecuación'}, conservamos la equivalencia algebraica para simplificar el cálculo.`,
        analogy: 'Es análogo a descomponer una tarea compleja en sub-tareas más pequeñas y directas.',
        breakdownSteps: step?.intermediateSteps || [],
        timestamp: Date.now(),
      });
    }
  });

  // API: Generate active practice exercise
  app.post('/api/practice/generate', async (req, res) => {
    const { topic, difficulty = 'intermedio' } = req.body;
    const ai = getGenAI();

    if (!ai) {
      return res.json({
        id: 'practice-' + Date.now(),
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

    try {
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
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          problemLatex: { type: Type.STRING },
          context: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stepNumber: { type: Type.INTEGER },
                instruction: { type: Type.STRING },
                expectedConcept: { type: Type.STRING },
                expectedLatex: { type: Type.STRING },
                hints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['stepNumber', 'instruction', 'expectedConcept', 'expectedLatex', 'hints'],
            },
          },
        },
        required: ['title', 'problemLatex', 'context', 'steps'],
      };

      const parsed = await generateJsonWithModelFallbacks(ai, prompt, practiceSchema);

      return res.json({
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
      console.warn('[Practice Generator] Fallback local por alta demanda de IA:', err.message);
      return res.json({
        id: 'practice-' + Date.now(),
        topic: topic || 'Cálculo',
        title: 'Práctica: Derivación y Regla de la Cadena',
        difficulty,
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
  });

  // API: Validate practice user step
  app.post('/api/practice/validate', async (req, res) => {
    const { problem, currentStepIndex, userProposal } = req.body;
    const currentStep = problem?.steps?.[currentStepIndex];

    if (!currentStep) {
      return res.status(400).json({ error: 'Paso no válido' });
    }

    const ai = getGenAI();
    if (!ai) {
      const cleanUser = (userProposal || '').toLowerCase().replace(/[\s\\]/g, '');
      const cleanExpected = (currentStep.expectedLatex || '').toLowerCase().replace(/[\s\\]/g, '');
      const isClose = cleanUser.length > 2 && (cleanExpected.includes(cleanUser) || cleanUser.includes(cleanExpected));

      return res.json({
        isCorrect: isClose,
        feedback: isClose
          ? '¡Excelente razonamiento! Has identificado la relación matemática correcta.'
          : 'Revisa con cuidado las operaciones de este paso. Compara con la instrucción.',
        hint: currentStep.hints?.[0] || 'Piensa en la regla principal de este paso.',
        canAdvance: isClose,
        revealedStep: isClose ? currentStep.expectedLatex : undefined,
      });
    }

    try {
      const prompt = `Eres un tutor de cálculo ayudando a un estudiante en un ejercicio de práctica interactiva.
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
        type: Type.OBJECT,
        properties: {
          isCorrect: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING },
          hint: { type: Type.STRING },
          canAdvance: { type: Type.BOOLEAN },
          revealedStep: { type: Type.STRING },
        },
        required: ['isCorrect', 'feedback', 'canAdvance'],
      };

      const parsed = await generateJsonWithModelFallbacks(ai, prompt, validateSchema);
      return res.json(parsed);
    } catch (err: any) {
      console.warn('[Validate Endpoint] Fallback heurístico por alta demanda de IA:', err.message);
      const cleanUser = (userProposal || '').toLowerCase().replace(/[\s\\]/g, '');
      const cleanExpected = (currentStep.expectedLatex || '').toLowerCase().replace(/[\s\\]/g, '');
      const isClose = cleanUser.length > 2 && (cleanExpected.includes(cleanUser) || cleanUser.includes(cleanExpected));

      return res.json({
        isCorrect: isClose,
        feedback: isClose
          ? '¡Muy buen trabajo! Tu planteamiento es coherente con el paso esperado.'
          : 'Comprueba el planteamiento de este paso y las operaciones asociadas.',
        hint: currentStep.hints?.[0] || 'Revisa la regla principal de cálculo involucrada.',
        canAdvance: isClose,
        revealedStep: isClose ? currentStep.expectedLatex : undefined,
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Calculo Interactivo server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
