import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import svelteConfig from '../svelte.config.js';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const demoDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(demoDir, '..');
const PSI_VERSION = JSON.parse(
    readFileSync(join(rootDir, 'package.json'), 'utf8'),
).version as string;

export default defineConfig(({ command }) => ({
    root   : 'demo-3d',
    base   : command === 'build' ? '/pixi-scene-inspector/3d/' : '/',
    server : { port: 5180 },
    define : {
        PSI_VERSION: JSON.stringify(PSI_VERSION),
    },
    optimizeDeps: {
        include: ['@pixi/3d', '@pixi/3d/extras'],
    },
    build: {
        outDir      : '../docs/3d',
        emptyOutDir : true,
        minify      : false,
    },
    plugins: [
        svelte({
            ...svelteConfig,
            compilerOptions: { css: 'injected' },
        }),
    ],
}));
