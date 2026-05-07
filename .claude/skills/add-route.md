---
name: add-route
description: Use when adding a new API endpoint to the claude-monitor server. Covers all 5 required touch-points in the right order.
---

# Add a New API Route

This project requires touching 5 files in a specific order. Miss one and either the server crashes or the client types drift.

## Checklist (do in order)

1. **Create `server/src/routes/<name>.ts`**
   - Import `Router` from express and `memoTTL` from `../cache.js`
   - Wrap the handler: `const compute = memoTTL(3000, async (): Promise<YourType> => { ... })`
   - Export: `export const <name>Router = Router(); <name>Router.get('/<name>', async (_req, res) => res.json(await compute()));`
   - All relative imports **must** end in `.js` (ESM)

2. **Add response type to `server/src/types.ts`**
   - Add the new type(s) that the route returns
   - Use only primitives, arrays, and other types already in the file

3. **Mirror the type verbatim in `client/src/lib/types.ts`**
   - Copy the exact same type declaration — no import, no re-export trick, just duplicate it
   - Comment at top of file: `// Re-export server types so client and server stay in sync.`

4. **Register the router in `server/src/index.ts`**
   - Import: `import { <name>Router } from './routes/<name>.js';`
   - Mount: `app.use('/api', <name>Router);`

5. **Add API method to `client/src/lib/api.ts`**
   - Add inside the `api` object: `<name>: () => getJson<YourType>('/api/<name>'),`

## Patterns to Copy

```ts
// server/src/routes/example.ts
import { Router } from 'express';
import { memoTTL } from '../cache.js';
import type { ExampleData } from '../types.js';

const compute = memoTTL(3000, async (): Promise<ExampleData[]> => {
  // FS-walking logic here
  return [];
});

export const exampleRouter = Router();
exampleRouter.get('/example', async (_req, res) => {
  res.json(await compute());
});
```

## Rules
- **Always** wrap FS-walking routes with `memoTTL(3000, ...)` — no exceptions
- Server binds `127.0.0.1` — never add CORS or change host
- Unused params must be prefixed with `_` (strict TS)
- Never disable TS6133
