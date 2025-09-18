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
GitHub Actions (automatic deploy)

This repo includes a GitHub Actions workflow `.github/workflows/deploy-vercel.yml` that can deploy to Vercel on every push to `main` or via manual Dispatch. To use it you must add the following repository secrets in GitHub:

- `VERCEL_TOKEN` - a personal token from Vercel (Account Settings → Tokens).
- `VERCEL_ORG_ID` - your Vercel organization ID (found in Project > Settings → General or via Vercel CLI).
- `VERCEL_PROJECT_ID` - your Vercel project ID (found in Project → Settings → General).

When those secrets are configured, pushes to `main` will build and push the site to Vercel production automatically.

Notes
- No code changes are required to deploy — the workflow runs `pnpm build` then the Vercel action to deploy.

Enjoy your deployment!
