import { defineConfig } from 'vite';
import svelteConfig from '../svelte.config.js';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ command }) => ({
    root    : 'demo',
    base    : command === 'build' ? '/pixi-scene-inspector/' : '/',
    server  : { port: 5179 },
    build   : {
        outDir      : '../docs',
        emptyOutDir : true,
    },
    plugins : [
        svelte({
            ...svelteConfig,
            compilerOptions: { css: 'injected' },
        }),
    ],
}));
