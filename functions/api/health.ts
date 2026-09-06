import { jsonResponse, handleOptions } from './_gemini';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet(context: any) {
  const env = context.env || {};
  const hasApiKey = !!(env.GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY));

  return jsonResponse({
    status: 'ok',
    platform: 'cloudflare-pages',
    hasApiKey,
    timestamp: Date.now()
  });
}
