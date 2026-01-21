# Fantasy Basketball Analytics Frontend

Next.js frontend for the Fantasy Basketball Analytics website.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Runs on http://localhost:3000

## Build for Production

```bash
npm run build
npm run export
```

Outputs to `out/` directory for GitHub Pages deployment.

## Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
```
