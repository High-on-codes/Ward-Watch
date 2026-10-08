# Decisions (deviations from the spec)

- Next.js pinned to 14.2.35 (latest 14.x patch) instead of 14.2.15, which has a published security advisory.
- Added `src/lib/upload.ts` (file validation, storage upload, shared error helper) and `src/lib/client.ts` (image compression, admin-passcode fetch) to avoid duplicating code across routes/pages; no new dependencies.
- Added `scripts/make-icons.mjs` to generate the PWA PNG icons without dependencies.
- Dashboard filters (a COULD item) were small, so they are included.
- Offline queue, side-by-side photo viewer, and Hindi/Telugu labels (COULD) are not built.
- Band text colours for `high`/`medium`/`low` badges are slightly darker than the map colours to keep 4.5:1 contrast with white text.
- The sample fixtures in `scripts/fixtures/` are tiny valid JPEGs meant for mock mode; use real photos to exercise the live AI.
- Not verified against a live Supabase project in this build environment (no credentials): `npm run build` passes, but `schema.sql`, the RPC, seed and smoke test still need a run against a real project.
- Seed uses 1-6 reports per hotspot (as the spec's hotspot rule says) instead of topping up to ~85 total, which made nearly every issue critical.
