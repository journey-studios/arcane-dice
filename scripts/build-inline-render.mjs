import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputPath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(root, 'standalone.html');

const fontFaces = [
  { family: 'Cinzel', style: 'normal', weight: '500 700', file: 'cinzel-latin.woff2' },
  { family: 'Cormorant Garamond', style: 'normal', weight: '500 700', file: 'cormorant-garamond-latin.woff2' },
  { family: 'Cormorant Garamond', style: 'italic', weight: '500 600', file: 'cormorant-garamond-latin-italic.woff2' },
];

const result = await build({
  root,
  base: './',
  logLevel: 'error',
  build: {
    write: false,
    modulePreload: false,
  },
});

const [bundle] = Array.isArray(result) ? result : [result];
const document = bundle.output.find(item => item.fileName === 'index.html');
const entry = bundle.output.find(item => item.type === 'chunk' && item.isEntry);
const stylesheet = bundle.output.find(item => item.type === 'asset' && item.fileName.endsWith('.css'));

if (!document || !entry || !stylesheet || bundle.output.length !== 3) {
  throw new Error('Expected a single HTML page with one JavaScript bundle and one stylesheet.');
}

const inlinedFonts = await Promise.all(fontFaces.map(async ({ family, style, weight, file }) => {
  const bytes = await readFile(new URL(`./assets/${file}`, import.meta.url));
  return `@font-face{
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2');
}`;
}));
const css = String(stylesheet.source).replace(
  /@import\s+(?:url\()?['"]?https:\/\/fonts\.googleapis\.com\/[^'")]+['"]?\)?\s*;/g,
  '',
);

const notices = await Promise.all([
  readFile(new URL('./assets/cinzel-OFL.txt', import.meta.url), 'utf8'),
  readFile(new URL('./assets/cormorant-garamond-OFL.txt', import.meta.url), 'utf8'),
  readFile(new URL('../node_modules/three/LICENSE', import.meta.url), 'utf8'),
  readFile(new URL('../src/audio/recordings/CREDITS.txt', import.meta.url), 'utf8'),
]);

let inlinedScript = false;
let inlinedStylesheet = false;
const html = String(document.source)
  .replace(/<script\b[^>]*\bsrc="\.\/([^"]+)"[^>]*><\/script>/g, (tag, file) => {
    if (file !== entry.fileName) return tag;
    inlinedScript = true;
    return `<script type="module">\n${entry.code.replace(/<\/script/gi, '<\\/script')}\n</script>`;
  })
  .replace(/<link\b[^>]*\bhref="\.\/([^"]+)"[^>]*>/g, (tag, file) => {
    if (file !== stylesheet.fileName) return tag;
    inlinedStylesheet = true;
    return `<style>\n${inlinedFonts.join('\n')}\n${css}\n</style>`;
  })
  .replace('</head>', () => `<!-- Third-party licenses\n${notices.join('\n\n')}\n-->\n</head>`);

if (!inlinedScript || !inlinedStylesheet) {
  throw new Error('Could not locate the built JavaScript and stylesheet in index.html.');
}

await writeFile(outputPath, html, 'utf8');
console.log(`Standalone HTML written to ${outputPath} (${Buffer.byteLength(html)} bytes).`);
