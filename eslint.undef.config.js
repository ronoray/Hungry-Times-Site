// eslint.undef.config.js
// A deliberately narrow config that checks ONE thing: does the code reference an
// identifier that does not exist in scope?
//
// Why it exists: on 2026-07-25 the checkout page shipped JSX that read
// `offersAllowed` from component scope while the variable was declared inside a
// useMemo callback. `vite build` passed — it bundles, it does not resolve
// identifier scope — so the break reached production and every render of the
// order page threw "offersAllowed is not defined", replacing checkout with the
// error boundary for ~8 hours. Customers could browse but could not order.
//
// The main eslint.config.js imports `js` but never spreads
// `js.configs.recommended`, so no-undef was never switched on. Turning it on
// there wholesale would drag in the rest of recommended and fail CI on unrelated
// pre-existing issues. This config gates the one class of error that takes the
// site down, and currently reports zero problems — so any hit is a real
// regression, not noise.
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{js,jsx}'],
    // Registered with no rules enabled purely so the inline
    // `eslint-disable-next-line react-hooks/exhaustive-deps` comments already in
    // the source resolve instead of erroring as unknown rules.
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, process: 'readonly' },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-undef': 'error',
    },
  },
];
