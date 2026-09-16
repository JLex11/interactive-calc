# Guía de Despliegue en Cloudflare Pages

Esta aplicación está completamente configurada para desplegarse de manera nativa en **Cloudflare Pages con Cloudflare Functions** (`functions/api/*`).

---

## 🚀 Pasos para desplegar en Cloudflare Pages

### Método 1: Conectar repositorio de Git (GitHub o GitLab) — *Recomendado*

1. **Sube tu código a GitHub**:
   Crea un repositorio en GitHub y sube todos los archivos del proyecto.

2. **Crea el proyecto en Cloudflare**:
   - Entra al dashboard de [Cloudflare](https://dash.cloudflare.com/).
   - Ve a **Compute (Workers & Pages)** > **Create application** > pestaña **Pages**.
   - Haz clic en **Connect to Git** y selecciona tu repositorio.

3. **Configura las opciones de compilación**:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build:pages`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (o vacío)
   - **Versión de Node (Node 22)**:
     - El repositorio incluye `.nvmrc` y `.node-version` fijados en `22`.
     - En Cloudflare Pages > **Environment variables**, también puedes definir:
       - `NODE_VERSION`: `22` (o `22.14.0`)

4. **Agrega la variable de entorno de Gemini**:
   - En la sección **Environment variables (advanced)** (o en *Settings > Environment variables*):
     - Variable name: `GEMINI_API_KEY`
     - Value: *Tu clave de Google AI Studio*
     - Tipo: **Secret / Encriptada**

5. **Haz clic en "Save and Deploy"**:
   Cloudflare compilará el frontend estático con Vite (`dist/`), detectará automáticamente la carpeta `/functions` para desplegar las Serverless Edge Functions de `/api/*`, y te dará un dominio gratuito `*.pages.dev` con HTTPS y CDN global.

---

### Método 2: Despliegue directo mediante Wrangler CLI

Si prefieres desplegar directamente desde tu terminal sin conectar Git:

```bash
# 1. Instala wrangler si no lo tienes
npm install -g wrangler

# 2. Inicia sesión en Cloudflare
wrangler login

# 3. Compila el frontend
npm run build:pages

# 4. Despliega a Cloudflare Pages (reemplaza 'calculo-interactivo' por el nombre que desees)
npx wrangler pages deploy dist --project-name=calculo-interactivo
```

Luego, en el dashboard de Cloudflare Pages, añade la variable secreta `GEMINI_API_KEY` en la configuración de tu proyecto.

---

## ⚠️ Solución al error `UnknownLockfileVersion` en Cloudflare Pages

Si Cloudflare Pages arrojó este error en el log de compilación:
```
error: Unknown lockfile version
UnknownLockfileVersion: failed to parse lockfile: 'bun.lock'
error: lockfile had changes, but lockfile is frozen
```

**Causa:**
Cloudflare Pages detecta automáticamente `bun.lock` e intenta instalar dependencias con su versión integrada de Bun (`bun@1.2.15`). Sin embargo, los lockfiles generados por versiones más recientes de Bun (Bun 1.4+) usan `"lockfileVersion": 2`, la cual no es compatible con Bun 1.2.15.

**Solución aplicada:**
1. Se ha eliminado `bun.lock` del repositorio para que Cloudflare Pages utilice de forma nativa **NPM** y `package-lock.json` junto a Node.js 22 (`npm ci`).
2. Si prefieres usar **Bun** explícitamente en Cloudflare Pages, ve a **Settings > Environment variables** en el dashboard de Pages y añade:
   - `BUN_VERSION`: `1.4.0` (o superior compatible)
   - O bien define `SKIP_DEPENDENCY_INSTALL`: `true` y en el Build command usa `bun install && npm run build:pages`.

---

## 🛠️ Arquitectura en Cloudflare
- **Frontend SPA**: Servido nativamente desde el CDN global de Cloudflare (`dist/`), con fallback automático a `index.html` manejado por Cloudflare Pages sin necesidad de reglas de redirección manuales.
- **Edge API (`/functions/api/*`)**:
  - `/api/health`: Estado del servicio y verificación de la API key.
  - `/api/solve`: Resolución paso a paso guiada por `gemini-3.1-flash-lite`.
  - `/api/explain-step`: Subflujos de dudas socráticas, analogías y derivación de términos específicos.
  - `/api/practice/generate` y `/api/practice/validate`: Motor de práctica interactiva guiada.
- **Motor de IA**: Utiliza el modelo ultraligero y rápido `gemini-3.1-flash-lite`.
