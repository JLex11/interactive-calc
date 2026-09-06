import { SolutionSession, PracticeExercise } from '../types';

export const PRESET_SESSIONS: SolutionSession[] = [
  {
    id: 'preset-int-sub-x-sqrt',
    title: 'Integral por sustitución: x / √(x² + 4)',
    createdAt: Date.now() - 1800000,
    expression: {
      id: 'expr-sub-1',
      rawInput: 'integral x/ sqrt(x^2 + 4)',
      formattedLatex: '\\int \\frac{x}{\\sqrt{x^2 + 4}} \\, dx',
      category: 'integral',
      title: 'Integral de x / √(x² + 4)',
      timestamp: Date.now() - 1800000,
    },
    summary: 'Esta integral se resuelve de manera limpia mediante sustitución simple (cambio de variable), aprovechando que la derivada de x² + 4 es proporcional al factor x dx en el numerador.',
    steps: [
      {
        id: 'step-sqrt-1',
        stepNumber: 1,
        title: 'Elegir la sustitución (cambio de variable)',
        latex: 'u = x^2 + 4 \\implies du = 2x \\, dx \\implies x \\, dx = \\frac{du}{2}',
        explanation: 'Elegimos la expresión dentro de la raíz cuadrada u = x² + 4 porque al derivarla aparece 2x dx, lo que nos permite sustituir directamente el numerador x dx por du/2.',
        rule: 'Método de sustitución simple (Regla de la cadena en reversa)',
        subterms: ['u = x^2 + 4', 'du = 2x \\, dx', 'x \\, dx = \\frac{du}{2}', '\\sqrt{u}'],
        intermediateSteps: [
          {
            latex: '\\frac{du}{dx} = \\frac{d}{dx}[x^2 + 4] = 2x',
            explanation: 'Derivamos la variable auxiliar u con respecto a x.'
          },
          {
            latex: 'du = 2x \\, dx \\iff \\frac{du}{2} = x \\, dx',
            explanation: 'Despejamos el producto x dx que está presente en la integral original.'
          }
        ]
      },
      {
        id: 'step-sqrt-2',
        stepNumber: 2,
        title: 'Reescribir la integral en términos de u',
        latex: '\\int \\frac{x}{\\sqrt{x^2 + 4}} \\, dx = \\int \\frac{1}{\\sqrt{u}} \\cdot \\frac{du}{2} = \\frac{1}{2} \\int u^{-1/2} \\, du',
        explanation: 'Reemplazamos √(x² + 4) por √u en el denominador, y x dx por du/2. Expresamos la raíz en el denominador como una potencia negativa u^(-1/2) para aplicar la regla de potencias.',
        rule: 'Leyes de los exponentes: \\frac{1}{\\sqrt{u}} = u^{-1/2} y extracción de la constante 1/2',
        subterms: ['\\frac{1}{2} \\int u^{-1/2} \\, du', 'u^{-1/2}', '\\frac{du}{2}'],
        intermediateSteps: [
          {
            latex: '\\frac{1}{\\sqrt{u}} = u^{-1/2}',
            explanation: 'Toda raíz en el denominador equivale a una potencia fraccionaria negativa.'
          }
        ]
      },
      {
        id: 'step-sqrt-3',
        stepNumber: 3,
        title: 'Aplicar la regla de la potencia para integrales',
        latex: '\\frac{1}{2} \\left( \\frac{u^{-1/2 + 1}}{-1/2 + 1} \\right) + C = \\frac{1}{2} \\left( \\frac{u^{1/2}}{1/2} \\right) + C = u^{1/2} + C',
        explanation: 'Sumamos 1 al exponente: -1/2 + 1 = 1/2, y dividimos entre el nuevo exponente 1/2. Observa cómo el factor 1/2 que teníamos afuera se cancela exactamente con la división por 1/2.',
        rule: 'Regla de la potencia: \\int u^n du = \\frac{u^{n+1}}{n+1} + C \\quad (n \\neq -1)',
        subterms: ['\\frac{u^{1/2}}{1/2}', 'u^{1/2}', '+ C'],
        intermediateSteps: [
          {
            latex: '\\frac{1}{2} \\cdot \\frac{1}{1/2} = \\frac{1}{2} \\cdot 2 = 1',
            explanation: 'Los factores 1/2 y 2 se simplifican mutuamente.'
          }
        ]
      },
      {
        id: 'step-sqrt-4',
        stepNumber: 4,
        title: 'Regresar a la variable original x',
        latex: 'u^{1/2} + C = \\sqrt{u} + C = \\sqrt{x^2 + 4} + C',
        explanation: 'Sustituimos nuevamente u por su definición original (x² + 4) para expresar el resultado final en términos de x.',
        rule: 'Restitución de variable u = x² + 4',
        subterms: ['\\sqrt{x^2 + 4}', '+ C']
      }
    ],
    finalResult: {
      latex: '\\sqrt{x^2 + 4} + C',
      explanation: 'Antiderivada exacta: al derivar d/dx[√(x² + 4)] por regla de la cadena obtenemos (1 / (2√(x² + 4))) * 2x = x / √(x² + 4), verificando la solución.'
    },
    branches: {
      'step-sqrt-1': [
        {
          id: 'branch-sqrt-1',
          stepId: 'step-sqrt-1',
          questionType: 'how_did_we_get_here',
          questionText: '¿Cómo supimos que debíamos usar u = x² + 4?',
          title: 'Detección de patrones de sustitución',
          conceptualExplanation: 'La clave en sustitución simple es buscar una función u(x) cuya derivada u\'(x) ya esté presente en el integrando multiplicando al dx. Aquí el radicando es x² + 4, cuya derivada es 2x. En el numerador tenemos precisamente una x. Como la constante 2 se puede ajustar dividiendo entre 2, la sustitución u = x² + 4 es la elección ideal.',
          analogy: 'Es como una cerradura y una llave: la cerradura dentro de la raíz es x² + 4, y afuera tienes la llave x dx esperando encajar. Solo necesitas girarla con el factor 1/2.',
          timestamp: Date.now() - 1700000
        }
      ]
    }
  },
  {
    id: 'preset-int-x2-sinx',
    title: 'Integral por partes: x² sen(x)',
    createdAt: Date.now() - 3600000 * 2,
    expression: {
      id: 'expr-1',
      rawInput: 'integral x^2 sin(x) dx',
      formattedLatex: '\\int x^2 \\sin(x) \\, dx',
      category: 'integral',
      title: 'Integral de x² sen(x)',
      timestamp: Date.now() - 3600000 * 2,
    },
    summary: 'Esta integral se resuelve aplicando el método de integración por partes en dos etapas sucesivas para reducir la potencia de x² hasta una función trigonométrica elemental.',
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        title: 'Primera elección por partes (u y dv)',
        latex: 'u = x^2 \\implies du = 2x \\, dx, \\quad dv = \\sin(x) \\, dx \\implies v = -\\cos(x)',
        explanation: 'Usamos el criterio ALGET / LIATE para elegir como "u" la función algebraica x², ya que al derivarla baja su grado a 2x.',
        rule: 'Fórmula de integración por partes: \\int u \\, dv = u v - \\int v \\, du',
        subterms: ['x^2', '\\sin(x)', '2x \\, dx', '-\\cos(x)'],
        intermediateSteps: [
          {
            latex: '\\frac{d}{dx}[x^2] = 2x \\implies du = 2x \\, dx',
            explanation: 'Derivamos u con respecto a x para hallar el diferencial du.'
          },
          {
            latex: 'v = \\int \\sin(x) \\, dx = -\\cos(x)',
            explanation: 'Integramos dv para obtener v. Recuerda que la antiderivada del seno es el coseno negativo.'
          }
        ]
      },
      {
        id: 'step-2',
        stepNumber: 2,
        title: 'Aplicar la fórmula por partes',
        latex: '\\int x^2 \\sin(x) \\, dx = -x^2 \\cos(x) - \\int (-\\cos(x))(2x) \\, dx',
        explanation: 'Sustituimos u, v, du y dv en la identidad u·v - ∫ v du. El signo negativo de v altera los signos de la integral.',
        rule: 'Linealidad y extracción de constantes: -\\int (-k) = +k \\int',
        subterms: ['-x^2 \\cos(x)', '-\\cos(x)', '2x'],
        intermediateSteps: [
          {
            latex: '= -x^2 \\cos(x) + 2 \\int x \\cos(x) \\, dx',
            explanation: 'Sacamos la constante 2 y multiplicamos los dos signos negativos (- por - = +).'
          }
        ]
      },
      {
        id: 'step-3',
        stepNumber: 3,
        title: 'Segunda integración por partes en ∫ x cos(x) dx',
        latex: 'u_2 = x \\implies du_2 = dx, \\quad dv_2 = \\cos(x) \\, dx \\implies v_2 = \\sin(x)',
        explanation: 'La nueva integral ∫ x cos(x) dx aún tiene un producto, por lo que aplicamos una segunda integración por partes para eliminar x por completo.',
        rule: 'Integración por partes iterada',
        subterms: ['u_2 = x', 'dv_2 = \\cos(x) \\, dx', 'v_2 = \\sin(x)'],
        intermediateSteps: [
          {
            latex: '\\int x \\cos(x) \\, dx = x \\sin(x) - \\int \\sin(x) \\, dx',
            explanation: 'Aplicamos nuevamente u·v - ∫ v du.'
          },
          {
            latex: '= x \\sin(x) - (-\\cos(x)) = x \\sin(x) + \\cos(x)',
            explanation: 'La integral de sen(x) es -cos(x). Menos por menos da más.'
          }
        ]
      },
      {
        id: 'step-4',
        stepNumber: 4,
        title: 'Sustituir y simplificar el resultado global',
        latex: '\\int x^2 \\sin(x) \\, dx = -x^2 \\cos(x) + 2 \\left( x \\sin(x) + \\cos(x) \\right) + C',
        explanation: 'Multiplicamos el factor 2 distribuido por el resultado de la segunda integral y sumamos la constante de integración C.',
        rule: 'Propiedad distributiva y adición de la constante de integración C',
        subterms: ['2 x \\sin(x)', '2 \\cos(x)', '+ C'],
        intermediateSteps: [
          {
            latex: '= -x^2 \\cos(x) + 2x \\sin(x) + 2 \\cos(x) + C',
            explanation: 'Expandimos los paréntesis para obtener la forma canónica final.'
          }
        ]
      }
    ],
    finalResult: {
      latex: '-x^2 \\cos(x) + 2x \\sin(x) + 2 \\cos(x) + C',
      explanation: 'Solución exacta obtenida tras dos iteraciones del método de partes, reduciendo el grado algebraico de x² a 1 y luego a 0.'
    },
    branches: {
      'step-1': [
        {
          id: 'branch-1-1',
          stepId: 'step-1',
          questionType: 'how_did_we_get_here',
          questionText: '¿Por qué elegimos u = x² en vez de u = sen(x)?',
          title: 'Criterio de elección para u y dv',
          conceptualExplanation: 'El objetivo de la integración por partes es transformar una integral difícil en una más sencilla. Si hubiéramos elegido u = sen(x), su derivada du = cos(x) no simplifica nada, y dv = x² dx daría v = x³/3, ¡aumentando la potencia de x y complicando el problema! Al elegir u = x², cada derivada disminuye el exponente (x² → 2x → 2), hasta que la x desaparece por completo.',
          analogy: 'Imagina que tienes una madeja con dos hilos: uno de ellos (x²) se acorta cada vez que lo cortas (derivas), mientras que el otro (sen(x)) simplemente cambia de color en un ciclo continuo (sen → cos → -sen). Conviene cortar el que se reduce hasta desaparecer.',
          timestamp: Date.now() - 3500000
        }
      ]
    }
  },
  {
    id: 'preset-int-x-ex',
    title: 'Integral clásica: x · eˣ',
    createdAt: Date.now() - 3600000 * 5,
    expression: {
      id: 'expr-2',
      rawInput: 'integral x * e^x dx',
      formattedLatex: '\\int x e^x \\, dx',
      category: 'integral',
      title: 'Integral de x·eˣ',
      timestamp: Date.now() - 3600000 * 5,
    },
    summary: 'La integral de un polinomio de grado 1 multiplicado por la exponencial natural eˣ es el prototipo fundamental para entender la integración por partes.',
    steps: [
      {
        id: 'step-ex-1',
        stepNumber: 1,
        title: 'Asignar u y dv',
        latex: 'u = x \\implies du = dx, \\quad dv = e^x \\, dx \\implies v = e^x',
        explanation: 'Elegimos u = x porque su derivada es 1 (desaparece la variable x), y dv = e^x dx porque la integral de e^x es simplemente ella misma.',
        rule: 'Derivada elemental y antiderivada de la función exponencial eˣ',
        subterms: ['x', 'e^x', 'du = dx', 'v = e^x'],
        intermediateSteps: [
          {
            latex: '\\frac{d}{dx}[x] = 1 \\implies du = 1 \\cdot dx',
            explanation: 'Diferencial de x.'
          },
          {
            latex: '\\int e^x \\, dx = e^x',
            explanation: 'La función exponencial es su propia antiderivada.'
          }
        ]
      },
      {
        id: 'step-ex-2',
        stepNumber: 2,
        title: 'Aplicar la fórmula de integración por partes',
        latex: '\\int x e^x \\, dx = x e^x - \\int e^x \\, dx',
        explanation: 'Multiplicamos u·v y restamos la integral de v du. Nota cómo la nueva integral ya no contiene x multiplicando.',
        rule: '\\int u \\, dv = u v - \\int v \\, du',
        subterms: ['x e^x', '\\int e^x \\, dx']
      },
      {
        id: 'step-ex-3',
        stepNumber: 3,
        title: 'Resolver la integral residual y factorizar',
        latex: '= x e^x - e^x + C = e^x (x - 1) + C',
        explanation: 'Calculamos ∫ eˣ dx = eˣ y extraemos eˣ como factor común para una presentación elegante.',
        rule: 'Factorización de términos comunes',
        subterms: ['e^x (x - 1)', '+ C']
      }
    ],
    finalResult: {
      latex: 'e^x (x - 1) + C',
      explanation: 'Resultado obtenido en 3 pasos directos con u=x y dv=eˣ dx.'
    },
    branches: {
      'step-ex-1': [
        {
          id: 'branch-ex-1',
          stepId: 'step-ex-1',
          questionType: 'part_question',
          targetPart: 'e^x',
          questionText: '¿Por qué la derivada y la integral de eˣ siguen siendo eˣ?',
          title: 'La naturaleza única de la constante e y eˣ',
          conceptualExplanation: 'La función f(x) = eˣ está definida matemáticamente de modo que la pendiente de su recta tangente en cualquier punto es exactamente igual a la altura (el valor de la función) en ese punto. Por tanto, d/dx[eˣ] = eˣ. Como la integración es la operación inversa de la derivación, la antiderivada de eˣ también es eˣ + C.',
          analogy: 'En una cuenta de ahorros que crece continuamente con una tasa del 100%, la tasa instantánea de crecimiento en cada microsegundo es idéntica a la cantidad de dinero acumulada en ese instante.',
          timestamp: Date.now() - 3400000
        }
      ]
    }
  },
  {
    id: 'preset-deriv-lnx-x',
    title: 'Derivada del cociente: ln(x)/x',
    createdAt: Date.now() - 3600000 * 8,
    expression: {
      id: 'expr-3',
      rawInput: 'derivada ln(x)/x',
      formattedLatex: '\\frac{d}{dx}\\left[ \\frac{\\ln(x)}{x} \\right]',
      category: 'derivative',
      title: 'Derivada de ln(x)/x',
      timestamp: Date.now() - 3600000 * 8,
    },
    summary: 'Cálculo de la razón de cambio instantánea mediante la regla del cociente, identificando el numerador y denominador claramente.',
    steps: [
      {
        id: 'step-ln-1',
        stepNumber: 1,
        title: 'Identificar funciones u(x) y v(x) para la regla del cociente',
        latex: 'u(x) = \\ln(x) \\implies u\'(x) = \\frac{1}{x}, \\quad v(x) = x \\implies v\'(x) = 1',
        explanation: 'En una fracción f(x)/g(x), identificamos el numerador como u y el denominador como v, calculando sus derivadas individuales.',
        rule: 'Derivadas elementales: d/dx[ln(x)] = 1/x, d/dx[x] = 1',
        subterms: ['\\ln(x)', '\\frac{1}{x}', 'v(x) = x']
      },
      {
        id: 'step-ln-2',
        stepNumber: 2,
        title: 'Aplicar la fórmula de la regla del cociente',
        latex: '\\frac{d}{dx}\\left[ \\frac{u}{v} \\right] = \\frac{u\' v - u v\'}{v^2} = \\frac{\\left( \\frac{1}{x} \\right)(x) - \\ln(x)(1)}{x^2}',
        explanation: 'Colocamos "(derivada de arriba × abajo) - (arriba × derivada de abajo)" todo dividido entre el cuadrado del denominador.',
        rule: 'Regla del cociente para diferenciación',
        subterms: ['\\left(\\frac{1}{x}\\right)(x)', '\\ln(x)(1)', 'x^2']
      },
      {
        id: 'step-ln-3',
        stepNumber: 3,
        title: 'Simplificar el numerador',
        latex: '= \\frac{1 - \\ln(x)}{x^2}',
        explanation: 'Al multiplicar (1/x) · x obtenemos 1 (para todo x > 0). El término ln(x)·1 queda simplemente como ln(x).',
        rule: 'Cancelación algebraica: (1/x) · x = 1 (x ≠ 0)',
        subterms: ['1 - \\ln(x)', 'x^2']
      }
    ],
    finalResult: {
      latex: '\\frac{1 - \\ln(x)}{x^2}',
      explanation: 'Derivada simplificada, válida en el dominio x > 0.'
    },
    branches: {}
  },
  {
    id: 'preset-lim-sinx-x',
    title: 'Límite notable: sen(x)/x cuando x → 0',
    createdAt: Date.now() - 3600000 * 12,
    expression: {
      id: 'expr-4',
      rawInput: 'limite x->0 sin(x)/x',
      formattedLatex: '\\lim_{x \\to 0} \\frac{\\sin(x)}{x}',
      category: 'limit',
      title: 'Límite trigonométrico fundamental',
      timestamp: Date.now() - 3600000 * 12,
    },
    summary: 'El límite trigonométrico más célebre del cálculo. Genera una forma indeterminada del tipo 0/0 que puede resolverse mediante la Regla de L\'Hôpital o geométricamente con el Teorema del Emparedado.',
    steps: [
      {
        id: 'step-lim-1',
        stepNumber: 1,
        title: 'Evaluar por sustitución directa',
        latex: '\\lim_{x \\to 0} \\frac{\\sin(x)}{x} \\to \\frac{\\sin(0)}{0} = \\frac{0}{0} \\quad \\text{(Indeterminación)}',
        explanation: 'Al sustituir x = 0 directamente, obtenemos la forma indeterminada 0/0, lo que nos indica que debemos transformar la expresión o usar una regla analítica.',
        rule: 'Formas indeterminadas 0/0',
        subterms: ['\\frac{0}{0}']
      },
      {
        id: 'step-lim-2',
        stepNumber: 2,
        title: 'Aplicar la Regla de L\'Hôpital',
        latex: '\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = \\lim_{x \\to 0} \\frac{\\frac{d}{dx}[\\sin(x)]}{\\frac{d}{dx}[x]}',
        explanation: 'Dado que tenemos 0/0 y ambas funciones son diferenciables cerca de 0, derivamos el numerador y el denominador por separado.',
        rule: 'Regla de L\'Hôpital: Si lim f/g = 0/0, entonces lim f/g = lim f\'/g\'',
        subterms: ['\\frac{d}{dx}[\\sin(x)]', '\\frac{d}{dx}[x]']
      },
      {
        id: 'step-lim-3',
        stepNumber: 3,
        title: 'Calcular derivadas y evaluar el límite',
        latex: '= \\lim_{x \\to 0} \\frac{\\cos(x)}{1} = \\frac{\\cos(0)}{1} = \\frac{1}{1} = 1',
        explanation: 'La derivada de sen(x) es cos(x) y la derivada de x es 1. Sustituyendo x=0, cos(0)=1, resolviendo la indeterminación.',
        rule: 'Valor trigonométrico fundamental: \\cos(0) = 1',
        subterms: ['\\cos(x)', '1']
      }
    ],
    finalResult: {
      latex: '1',
      explanation: 'El límite vale exactamente 1. Esto significa que para ángulos muy pequeños medidos en radianes, sen(x) ≈ x.'
    },
    branches: {}
  }
];

export const PRESET_PRACTICE_EXERCISES: PracticeExercise[] = [
  {
    id: 'practice-parts-1',
    topic: 'Integración por partes',
    title: 'Integral de x · cos(x) dx',
    difficulty: 'intermedio',
    problemLatex: '\\int x \\cos(x) \\, dx',
    context: 'Practica la elección adecuada de las variables u y dv en un producto algebraico-trigonométrico.',
    currentStepIndex: 0,
    isCompleted: false,
    userAttempts: [],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Paso 1: Define las variables u y dv para la fórmula de partes.',
        expectedConcept: 'Elegir u = x y dv = cos(x) dx.',
        expectedLatex: 'u = x, \\quad dv = \\cos(x) \\, dx',
        hints: [
          'Recuerda la regla LIATE o ALGET: las funciones algebraicas van antes que las trigonométricas.',
          '¿Cuál función se vuelve más sencilla al derivarla: x o cos(x)?',
          'Elige u = x y dv = cos(x) dx.'
        ]
      },
      {
        stepNumber: 2,
        instruction: 'Paso 2: Halla du y v correspondientes.',
        expectedConcept: 'du = dx y v = sen(x)',
        expectedLatex: 'du = dx, \\quad v = \\sin(x)',
        hints: [
          'Deriva u = x con respecto a x.',
          'Integra dv = cos(x) dx para hallar v.',
          'La derivada de x es 1 dx, y la integral del coseno es el seno positivo.'
        ]
      },
      {
        stepNumber: 3,
        instruction: 'Paso 3: Aplica la fórmula u·v - ∫ v du.',
        expectedConcept: 'x sen(x) - ∫ sen(x) dx',
        expectedLatex: 'x \\sin(x) - \\int \\sin(x) \\, dx',
        hints: [
          'Multiplica u por v: x · sen(x).',
          'Resta la integral del producto v · du.',
          'Queda: x sen(x) - ∫ sen(x) dx.'
        ]
      },
      {
        stepNumber: 4,
        instruction: 'Paso 4: Calcula la integral restante y escribe el resultado con la constante C.',
        expectedConcept: 'x sen(x) + cos(x) + C',
        expectedLatex: 'x \\sin(x) + \\cos(x) + C',
        hints: [
          '¿Cuál es la integral de sen(x)? Recuerda que es -cos(x).',
          'Observa el doble signo negativo: - (-cos(x)) = + cos(x).',
          'No olvides sumar la constante de integración + C.'
        ]
      }
    ]
  },
  {
    id: 'practice-chain-rule',
    topic: 'Regla de la cadena',
    title: 'Derivada de f(x) = (3x² - 5)⁴',
    difficulty: 'fácil',
    problemLatex: '\\frac{d}{dx}\\left[ (3x^2 - 5)^4 \\right]',
    context: 'Identifica la función exterior y la función interior (derivada interna).',
    currentStepIndex: 0,
    isCompleted: false,
    userAttempts: [],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Paso 1: Identifica la función interior u(x) y su derivada u\'(x).',
        expectedConcept: 'u = 3x² - 5 y u\' = 6x',
        expectedLatex: 'u = 3x^2 - 5 \\implies u\' = 6x',
        hints: [
          'La expresión que está dentro del paréntesis elevado a la 4 es la función interior u.',
          'Deriva 3x² - 5 aplicando la regla de potencias.',
          'La derivada de 3x² es 6x, y la de la constante 5 es 0.'
        ]
      },
      {
        stepNumber: 2,
        instruction: 'Paso 2: Aplica la derivada de la función exterior u⁴.',
        expectedConcept: '4 u³ · u\'',
        expectedLatex: '4 (3x^2 - 5)^3 \\cdot (6x)',
        hints: [
          'Baja el exponente 4 multiplicando y resta 1 al exponente (queda potencia 3).',
          'Multiplica el resultado por la derivada interna u\'.',
          'Queda: 4 (3x² - 5)³ · 6x.'
        ]
      },
      {
        stepNumber: 3,
        instruction: 'Paso 3: Multiplica los factores constantes para simplificar la respuesta.',
        expectedConcept: '24x (3x² - 5)³',
        expectedLatex: '24x (3x^2 - 5)^3',
        hints: [
          'Multiplica 4 por 6x.',
          '4 × 6x = 24x.',
          'Resultado final: 24x(3x² - 5)³.'
        ]
      }
    ]
  }
];
