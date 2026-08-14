// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import vue from '@astrojs/vue';

// Components are imported straight from ../../compiler/out/ (a different
// project root, own tree, no local node_modules) — Vite's default bare-import
// resolution walks up from the *importing file's* directory looking for
// node_modules, so "vue"/"react" inside a .vue/.tsx file under compiler/out/
// can't be found that way. Aliasing them to this project's own node_modules
// makes cross-project component imports resolve correctly. Confirmed by
// testing: build failed with "Failed to resolve import 'vue'" before this.
export default defineConfig({
  integrations: [react(), vue()],
  vite: {
    resolve: {
      alias: {
        vue: fileURLToPath(new URL('./node_modules/vue', import.meta.url)),
        react: fileURLToPath(new URL('./node_modules/react', import.meta.url)),
        'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
      },
    },
  },
});