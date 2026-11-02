# Iceberg — Dylan's portfolio journal

An interactive portfolio blog built for Berghs Programming & Methods (ACE2627).
The site is a vertical world: space above, the iceberg at sea level, and the ocean below,
with interactive marine life. A submarine in the ocean takes you to the journal (blog) on its own readable page.

## Status

- [x] Stage 0 — Express server, project structure, secrets handling
- [x] Stage 1 — Post list and single post view
- [x] Stage 2 — Posts stored in PostgreSQL (Neon)
- [ ] Stage 3 — Sign in / sign out
- [ ] Stage 4 — Add post (signed-in only)
- [ ] Stage 5 — Comments stored in the database
- [ ] Stage 6 — Search / filter
- [ ] Stage 7 — AI summary (OpenRouter)
- [ ] Stage 8–11 — Ocean, creatures, live data, space
- [ ] Stage 12 — Zoom out: Earth with live satellite positions (CelesTrak), solar system, galaxy, universe, Big Bang
- [ ] Stage 13 — Deploy + slides

## Running locally

1. Install Node.js 20+.
2. `npm install`
3. Copy `.env.example` to `.env` and fill in the values (see below).
4. `npm run db:setup` creates the tables and adds starter posts. Safe to run again.
5. `npm run dev` and open http://localhost:3000 (the journal is at /blog)

### Services

- **Neon (PostgreSQL):** create a free project at neon.tech, click Connect, copy the connection string into `DATABASE_URL`.

## Intentionally left out

_To be filled in as the project develops._
