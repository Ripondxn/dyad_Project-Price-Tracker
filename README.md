Perfume Tracker - Vercel deployment helper

This repository is a Next.js app prepared to deploy on Vercel.

Quick deploy steps

1. Push this repo to GitHub (or connect your Git provider) if not already.
2. Go to https://vercel.com and import the project.
3. During import, make sure Build Command is `pnpm build` (or `npm run build`) and Output Directory is left blank (Next.js default).
4. If you use environment variables in the future, add them in the Vercel project settings.

Notes
- The app targets Node 18 via `vercel.json` and `package.json` `engines` field.
- We added a small Node memory hint in `vercel.json` to reduce OOM incidents during build.
- The API route `pages/api/fetch-products.js` makes outbound HTTP requests; Vercel serverless functions must be able to reach those external endpoints.
# Perfume-Price-Tracker
Perfume-Price-Tracker
test
