Place your dataset JSON chunk files in this directory.

Expected format per file:
- root object with `metadata` and `jobs` keys
- `jobs` must be an array

Example:
- `chunk-01-tech.json`
- `chunk-02-management.json`

Run seed:
- `pnpm seed:jobs`

Optional env override:
- `JOB_DATASET_DIR=/absolute/path/to/chunks pnpm seed:jobs`
