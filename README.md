# PathFinder

AI-powered career recommendation and guidance platform built with Next.js.

## Tech Stack

- Next.js (App Router)
- TypeScript
- MongoDB + Mongoose
- Tailwind CSS
- Multi-provider AI fallback (Groq -> Gemini -> OpenRouter -> Bytez -> deterministic fallback)

## Project Structure

```text
app/                     Next.js routes and API endpoints
components/              Shared UI and feature components
lib/                     Utility modules and shared logic
models/                  Mongoose models
scripts/                 Data seeding and maintenance scripts
data/
	datasets/              Source job datasets (JSON)
	job-dataset-chunks/    Chunked dataset files used by seed scripts
```

## Dataset Organization

All root-level dataset JSON files were moved into `data/datasets`.

Current dataset files:

- `data/datasets/tech_jobs_dataset_v2.json`
- `data/datasets/management_jobs_dataset_v2.json`
- `data/datasets/non_tech_non_management_jobs_dataset.json`

Updated scripts now read from this folder:

- `scripts/seed-tech-dataset.mjs`
- `scripts/seed-dataset.mjs`

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment variables in `.env.local`.

3. Run dev server:

```bash
pnpm run dev
```

## Useful Commands

```bash
pnpm run build         # Production build
pnpm run start         # Start production server
pnpm run lint          # Lint checks
pnpm run test:smoke    # Runtime smoke checks
pnpm run test:system   # Build + smoke checks
pnpm run seed:jobs     # Seed chunked dataset from data/job-dataset-chunks
```

## Data Safety Notes

- File paths were updated to keep seeding scripts connected after dataset reorganization.
- No API route contract was changed by this move.
- Existing chunk-based seeding (`data/job-dataset-chunks`) remains unchanged.