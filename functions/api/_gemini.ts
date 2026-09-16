// Cloudflare Pages Functions - Gemini API client
// Compatible with Cloudflare Workers Edge runtime (V8) without Node.js dependencies

export const GEMINI_MODEL = 'gemini-3.8-flash';

export async function callGemini(apiKey: string, prompt: string, responseSchema?: any, systemInstruction?: string): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const payload: any = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {}
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (responseSchema) {
    payload.generationConfig.responseMimeType = 'application/json';
    payload.generationConfig.responseSchema = responseSchema;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'aistudio-build'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText}`);
  }

  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Respuesta vacía del modelo Gemini');
  }

  if (responseSchema) {
    try {
      return JSON.parse(text);
    } catch {
      const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    }
  }
  return text;
}

export function jsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
