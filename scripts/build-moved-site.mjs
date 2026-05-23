import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const outDir = 'dist-moved'
const currentSite = 'https://forosas.dev'

await mkdir(outDir, { recursive: true })

await writeFile(
  join(outDir, 'index.html'),
  `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FOROSAS se movio</title>
    <meta name="robots" content="noindex, follow" />
    <style>
      :root {
        color-scheme: dark;
        --cyan: #00fff5;
        --cyan-soft: rgba(0, 255, 245, 0.16);
        --text: rgba(222, 255, 253, 0.82);
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        min-height: 100%;
        background: #020405;
        color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      }

      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at 50% 0%, var(--cyan-soft), transparent 34%),
          linear-gradient(135deg, #020405 0%, #050813 100%);
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(0, 255, 245, 0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 245, 0.035) 1px, transparent 1px);
        background-size: 42px 42px;
      }

      main {
        width: min(100%, 620px);
        position: relative;
        border: 1px solid rgba(0, 255, 245, 0.34);
        background: rgba(0, 0, 0, 0.70);
        box-shadow: 0 0 44px rgba(0, 255, 245, 0.13);
        padding: clamp(36px, 8vw, 58px) 24px;
        text-align: center;
      }

      main::before,
      main::after {
        content: "";
        position: absolute;
        width: 22px;
        height: 22px;
        border-color: var(--cyan);
      }

      main::before {
        top: -1px;
        left: -1px;
        border-top: 1px solid;
        border-left: 1px solid;
      }

      main::after {
        right: -1px;
        bottom: -1px;
        border-right: 1px solid;
        border-bottom: 1px solid;
      }

      .eyebrow {
        margin: 0 0 18px;
        color: rgba(0, 255, 245, 0.64);
        font-size: 0.78rem;
        letter-spacing: 0.18em;
      }

      h1 {
        margin: 0 0 22px;
        color: var(--cyan);
        font-size: clamp(2.2rem, 9vw, 4.7rem);
        line-height: 1;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        text-shadow: 0 0 12px rgba(0, 255, 245, 0.76), 0 0 34px rgba(0, 255, 245, 0.28);
      }

      p {
        margin: 0 auto 34px;
        max-width: 30rem;
        font-size: 1rem;
        line-height: 1.7;
      }

      a {
        width: min(100%, 22rem);
        min-height: 54px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--cyan);
        background: rgba(0, 255, 245, 0.08);
        color: var(--cyan);
        box-shadow: 0 0 22px rgba(0, 255, 245, 0.20);
        font-weight: 700;
        letter-spacing: 0.14em;
        text-decoration: none;
        text-transform: uppercase;
      }

      a:focus-visible,
      a:hover {
        background: rgba(0, 255, 245, 0.15);
        outline: none;
      }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">FOROSAS</p>
      <h1>Nos movimos</h1>
      <p>La pagina actual de FOROSAS ahora esta en forosas.dev.</p>
      <a href="${currentSite}">Ir a forosas.dev</a>
    </main>
  </body>
</html>
`,
  'utf8',
)

await writeFile(join(outDir, '_redirects'), '/* / 302\n', 'utf8')
