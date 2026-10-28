// @ts-check
import esbuild from 'esbuild';
import sveltePlugin from 'esbuild-svelte';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import svelteConfig from './svelte.config.js';

const cwd = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.resolve(cwd, 'build');
const srcDir = path.resolve(cwd, 'src');

const WATCH = process.argv.includes('--watch');

fs.rmSync(outdir, { recursive: true, force: true });
fs.mkdirSync(outdir, { recursive: true });

for (const file of ['manifest.json', 'icon.png', 'settings.html'])
{
    const from = path.join(srcDir, file);

    if (fs.existsSync(from))
    {
        fs.copyFileSync(from, path.join(outdir, file));
    }
}

const sharedPlugins = [
    sveltePlugin({
        preprocess: svelteConfig.preprocess,
        compilerOptions: { css: 'injected' },
    }),
];

const ctx = await esbuild.context({
    define: {
        WATCH: JSON.stringify(WATCH),
        'process.env.NODE_ENV': JSON.stringify(WATCH ? 'development' : 'production'),
    },
    entryPoints: [
        path.join(srcDir, 'content-dock.ts'),
        path.join(srcDir, 'content-bridge.ts'),
        path.join(srcDir, 'settings.ts'),
    ],
    mainFields: ['svelte', 'browser', 'module', 'main'],
    conditions: WATCH ? undefined : ['production'],
    bundle: true,
    minify: !WATCH,
    outdir,
    format: 'iife',
    target: 'chrome120',
    plugins: sharedPlugins,
    logLevel: 'info',
});

const overlayCtx = await esbuild.context({
    define: {
        WATCH: JSON.stringify(false),
        'process.env.NODE_ENV': JSON.stringify(WATCH ? 'development' : 'production'),
    },
    entryPoints: [path.join(srcDir, 'overlay.ts')],
    mainFields: ['svelte', 'browser', 'module', 'main'],
    conditions: WATCH ? undefined : ['production'],
    bundle: true,
    minify: !WATCH,
    outfile: path.join(outdir, 'overlay.js'),
    format: 'esm',
    target: 'es2022',
    external: ['svelte', 'svelte/*'],
    plugins: sharedPlugins,
    logLevel: 'info',
});

if (WATCH)
{
    await Promise.all([ctx.watch(), overlayCtx.watch()]);
    await ctx.serve({ port: 10809, cors: { origin: '*' } });

    // eslint-disable-next-line no-console
    console.log('Watching… load unpacked extension from ./build');
}
else
{
    await Promise.all([ctx.rebuild(), overlayCtx.rebuild()]);
    await Promise.all([ctx.dispose(), overlayCtx.dispose()]);
}

fs.copyFileSync(
    path.join(srcDir, 'overlay-public.d.ts'),
    path.join(outdir, 'overlay.d.ts'),
);
