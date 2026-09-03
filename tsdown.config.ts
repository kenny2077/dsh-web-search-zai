import { defineConfig } from 'tsdown'

/** Match the DSH browser loader's lazy CommonJS factory; React comes from the shell. */
export default defineConfig({
  entry: ['src/client/index.tsx'], outDir: 'lib', format: 'cjs', platform: 'browser', target: 'es2022',
  deps: { neverBundle: ['react', 'react/jsx-runtime'] },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "dsh-web-search-zai", factory: (require) => { var module = { exports: {} }; var exports = module.exports;',
    footer: '\nreturn module.exports;\n} });',
  },
  dts: false, sourcemap: true, clean: false,
})
