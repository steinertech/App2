import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(rootDir, 'dist');
const template = readFileSync(join(distDir, 'index.html'), 'utf-8');

const { render, routePaths } = await import(join(rootDir, 'dist-server', 'entry-server.js'));

for (const language of ['', 'de']) {
  for (const path of routePaths) {
    const routePath = [language, path].filter(Boolean).join('/');
    const appHtml = render(`/${routePath}`);
    const html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

    const outDir = routePath ? join(distDir, routePath) : distDir;
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html);
  }
}

rmSync(join(rootDir, 'dist-server'), { recursive: true, force: true });
