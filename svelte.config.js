import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const svelteConfig = {
    preprocess: [vitePreprocess()],
    compilerOptions: { css: 'injected' },
};

export default svelteConfig;
