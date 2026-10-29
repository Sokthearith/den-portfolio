# den: portfolio

Personal site of Kheng Sokthearith (den), full-stack developer and software engineering student at CADT.

- **Hero:** the night drawn in a WebGL shader (React Three Fiber), paused off screen, still under reduced motion.
- **Work:** Agrix and Planify, each with how it works.
- **Skills:** a 3D rack of keys; pressing one lights the projects built with it.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # prerenders the page into dist/
npm run preview  # serve the build
```

## Edit the content

Everything you'd change lives in `src/data/`:

- `profile.ts`: headline, about, email, links
- `projects.ts`: projects, their stack and screenshots (`images`)
- `skills.ts`: the keys on the rack

## Leave a light on (the guestbook)

Notes visitors leave in the footer live in Supabase. Each one waits until you approve it.

1. In a Supabase project, open the SQL Editor and run `supabase/lights.sql`.
2. Add `SUPABASE_URL` (Project Settings → API) and `SUPABASE_SECRET_KEY` (a secret key, or the legacy `service_role` key) to Vercel and to `.env.local`.
3. To approve a note: Table Editor → `lights` → tick `approved`.

Without the keys, the form stays hidden and the footer looks as before.

Built with Vite, React, TypeScript, React Three Fiber and drei. Design: Hallmark, Ribbon theme.
