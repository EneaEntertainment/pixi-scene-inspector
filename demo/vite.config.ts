import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import svelteConfig from '../svelte.config.js';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const PSI_VERSION = JSON.parse(
    readFileSync(join(rootDir, 'package.json'), 'utf8'),
).version as string;

export default defineConfig(({ command }) => ({
    root   : 'demo',
    base   : command === 'build' ? '/pixi-scene-inspector/' : '/',
    server : { port: 5179 },
    define : {
        PSI_VERSION: JSON.stringify(PSI_VERSION),
    },
    build  : {
        outDir      : '../docs',
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
