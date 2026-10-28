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

Built with Vite, React, TypeScript, React Three Fiber and drei. Design: Hallmark, Ribbon theme.
