# Mezoir web (Vite + React)

## Setup

```bash
cp .env.example .env
# Edit .env — variables must use the VITE_ prefix (see .env.example).
npm install
```

## Scripts

- `npm run dev` — dev server (default port **3000**)
- `npm run build` — typecheck + production bundle to `dist/`
- `npm run preview` — serve `dist/` locally
- `npm run clean` — remove `dist/`

Entry: `index.html` → `src/main.tsx` → `src/App.tsx`.
