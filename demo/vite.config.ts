import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import svelteConfig from '../svelte.config.js';
import { svelte } from '@sveltejs/vite-plugin-svelte';

import type { Plugin } from 'vite';

const demoDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(demoDir, '..');
const docsDir = join(rootDir, 'docs');
const PSI_VERSION = JSON.parse(
    readFileSync(join(rootDir, 'package.json'), 'utf8'),
).version as string;

function emptyDocsKeep3d(): Plugin
{
    return {
        name  : 'empty-docs-keep-3d',
        apply : 'build',
        buildStart()
        {
            let entries: Array<string> = [];

            try
            {
                entries = readdirSync(docsDir);
            }
            catch
            {
                return;
            }

            for (const name of entries)
            {
                if (name === '3d')
                {
                    continue;
                }

                rmSync(join(docsDir, name), { recursive: true, force: true });
            }
        },
    };
}

export default defineConfig(({ command }) => ({
    root   : 'demo',
    base   : command === 'build' ? '/pixi-scene-inspector/' : '/',
    server : { port: 5179 },
    define : {
        PSI_VERSION: JSON.stringify(PSI_VERSION),
    },
    build: {
        outDir      : '../docs',
        emptyOutDir : false,
        minify      : false,
    },
    plugins: [
        emptyDocsKeep3d(),
        svelte({
            ...svelteConfig,
            compilerOptions: { css: 'injected' },
        }),
    ],
}));
