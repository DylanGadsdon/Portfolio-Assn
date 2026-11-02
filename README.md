# Iceberg — Dylan's portfolio journal

Individual blog project for **Berghs · Programming & Methods (ACE2627)**.

The site is one vertical world: deep space at the top, an iceberg with my name on it at sea level, and the ocean below. My portfolio pieces are frozen into the iceberg at different depths. A submarine in the twilight zone takes you to **The Logbook**, the blog itself, on its own readable page. From orbit you can **zoom out** past the satellites, the planets and the Milky Way, all the way to the Big Bang.

- **Persona:** Dylan, AI content creator and creative technologist
- **Audience:** classmates, teachers, and creative clients looking at my AI film, brand and campaign work
- **Visual direction:** playful and interactive on the outside (the world), calm and readable on the inside (the Logbook)

## Pages

| URL | What it is |
|---|---|
| `/` | The world: space → sky → iceberg → ocean → seabed |
| `/blog` | The Logbook: post list, posts, sign-in, writing, comments, search |
| `/universe` | The zoom-out, from Earth to the Big Bang |

## What's been done (brief tasks)

| # | Task | How |
|---|---|---|
| 1 | Content and navigation | Post list and single post view with hash routing (`#/post/3`); back link returns to the list |
| 2 | Interaction | Signed-in users write posts (`POST /api/posts`). **PD:** comments stored in PostgreSQL |
| 3 | Layout and readability | Readable serif "paper" layout for posts, responsive from 320 px phones to desktop |
| 4 | JavaScript feature | Search (debounced, server-side `ILIKE` on title and body) plus category filter chips |
| 5 | External API | **Open-Meteo** weather for 5 cities, **USGS** earthquakes (seismograph), **CelesTrak** satellite orbits |
| 6 | Authentication | Username and password, bcrypt-hashed, sessions stored in Postgres, httpOnly cookie. Sign-in required to post |
| 7 | AI API (PD) | **OpenRouter** writes an automatic summary of each new post, shown with the post. Can be regenerated |
| 8 | SQL database (PD) | **PostgreSQL on Neon**: `posts`, `comments`, `users`, `session` tables |

Extras in the world: draggable and clickable sea life at realistic depths, live moon phase and tidal pull (astronomy-engine), a live world-population estimate, a rocket trip to a space station, an alien raid and crash cycle, and a depth gauge.

## How it's built

```
server/
  index.js              Express app: static files, sessions, routes
  db.js                 PostgreSQL connection pool + query() helper ($1 placeholders)
  schema.sql            Tables (safe to re-run)
  ai.js                 OpenRouter call for summaries (server-side: the key never reaches the browser)
  routes/posts.js       Posts, search, comments, AI summary
  routes/auth.js        Sign in / sign out / who am I, requireLogin middleware
  routes/satellites.js  CelesTrak proxy with a 2-hour cache
scripts/
  setup-db.js           Creates tables, adds starter posts
  create-user.js        Makes a login (there is no public sign-up)
public/
  blog.html, js/blog.js, js/api.js, js/dom.js   The Logbook
  index.html, js/world/*                         The world (SVG + Web Animations API)
  universe.html, js/universe/*                   The zoom-out (Three.js)
```

**Data flow (example: comments).** The browser runs `fetch('/api/posts/3/comments', { method: 'POST', body })`. Express checks the input, then calls `query('INSERT INTO comments … VALUES ($1,$2,$3)')`. Neon stores the row and returns it, and the browser redraws the list.

**Security choices**
- Passwords: bcrypt hashes (cost 12), never stored in plain text
- SQL: parameterised queries everywhere
- User text: rendered with `textContent`, never `innerHTML`, to prevent XSS
- Secrets: only in `.env`, which is git-ignored

## Running locally

1. Install Node.js 20+.
2. `npm install`
3. Copy `.env.example` to `.env` and fill in the values (see below).
4. `npm run db:setup` creates the tables and adds starter posts. Safe to run again.
5. `npm run create-user` makes your login.
6. `npm run dev`, then open http://localhost:3000

### Services and environment variables

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require   # Neon → Connect
SESSION_SECRET=any-long-random-string
OPENROUTER_API_KEY=sk-or-...                                          # openrouter.ai → Keys
OPENROUTER_MODEL=~anthropic/claude-sonnet-latest                      # optional
```

- **Neon (PostgreSQL):** create a free project at neon.tech, click Connect and copy the connection string.
- **SESSION_SECRET:** generate one with `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`.
- **OpenRouter:** without a key the blog still works; posts just have no AI summary.
- Open-Meteo, USGS and CelesTrak need no keys.

## Intentionally left out

- **Public sign-up.** Only accounts made with `npm run create-user` can post. It's a personal journal, and fewer accounts means less attack surface.
- **Editing and deleting posts** from the page. Not required by the brief; can be done in Neon's SQL editor.
- **Comment moderation and rate limiting.** There's a honeypot field against simple bots and strict length limits, but no CAPTCHA or per-IP limits.
- **Real-time population data.** No free live API exists. The counter is a model built from UN World Population Prospects 2024 rates, like the well-known world clocks.
- **Exact sky positions in the Milky Way view.** The galaxy is generated. Real nearby stars are placed at their true distances, but the frame isn't converted to galactic coordinates.
- **A build step or framework.** Plain ES modules keep every file readable and explainable.

## Use of AI assistance

Built with Claude (Anthropic) as an AI pair programmer. The concept and design direction are mine: the iceberg, the submarine, the space raid cycle and the zoom-out. The code was written with AI assistance in stages. Each stage was tested in a browser before it was committed, and every commit is one stage.

## Presentation

Slides go in `presentation/`.
