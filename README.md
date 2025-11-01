# eslint-prefer-object-params

A humble ESLint plugin that gently nudges your codebase toward object parameters.

## Why Object Parameters?

We've all been there—you write a function with two parameters, then three, then four. Before you know it, you're playing parameter roulette:

```js
// Which order was it again? 🤔
createUser(true, "john@example.com", false, "John", null, 25)
```

Object parameters fix this by making every call self-documenting:

```js
// Ah, much better! ✨
createUser({
  email: "john@example.com",
  name: "John",
  age: 25,
  isAdmin: true,
  sendWelcomeEmail: false,
  referralCode: null
})
```

The benefits compound over time:
- **Self-documenting calls** - No more guessing parameter order
- **Easy to extend** - Add new options without breaking existing calls
- **Optional parameters** - Just leave them out, no need for `null` placeholders
- **IDE-friendly** - Autocomplete shows you all available options
- **Refactor-safe** - Rename or reorder without breaking call sites

> **Note:** This is an opinionated pattern. It trades a bit of verbosity for long-term maintainability. Like all patterns, it's not right for every function—which is why we've made it easy to configure.

---

## Installation

You'll need [ESLint](https://eslint.org/) installed first:

```bash
# Pick your package manager
npm install eslint --save-dev
pnpm add -D eslint
bun add -D eslint
```

Then add this plugin:

```bash
npm install eslint-plugin-prefer-object-params --save-dev
pnpm add -D eslint-plugin-prefer-object-params
bun add -D eslint-plugin-prefer-object-params
```

---

## Quick Start

Add to your ESLint config (we recommend the flat config format for ESLint 9+):

```js
// eslint.config.js
import onlyObjectParams from 'eslint-plugin-prefer-object-params';

export default [
  {
    plugins: {
      'prefer-object-params': onlyObjectParams,
    },
    rules: {
      'prefer-object-params/prefer-object-params': 'error',
    },
  },
];
```

That's it! The rule will now flag functions with multiple parameters.

> **Using ESLint 8 or earlier?** See the [Traditional Config](#traditional-eslint-config) section below.

---

## Configuration

The rule is designed to be flexible. Here's how to adapt it to your codebase:

### Excluding Files and Directories

Use ESLint's standard `files` and `ignores` options—this works just like any other ESLint rule:

```js
// eslint.config.js
import onlyObjectParams from 'eslint-plugin-prefer-object-params';

export default [
  {
    files: ['**/*.{js,ts,jsx,tsx}'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.test.{js,ts}',  // Skip tests
      'src/legacy/**',      // Skip legacy code during migration
      'scripts/**',         // Skip build scripts
    ],
    plugins: {
      'prefer-object-params': onlyObjectParams,
    },
    rules: {
      'prefer-object-params/prefer-object-params': 'error',
    },
  },
];
```

Or apply the rule only to specific directories:

```js
export default [
  {
    files: ['src/api/**/*.{js,ts}'],  // Only enforce in API routes
    plugins: {
      'prefer-object-params': onlyObjectParams,
    },
    rules: {
      'prefer-object-params/prefer-object-params': 'error',
    },
  },
];
```

### Rule Options

Fine-tune the rule with these options:

```js
{
  rules: {
    'prefer-object-params/prefer-object-params': ['error', {
      ignoreFunctions: [],       // Function names to skip
      ignoreMethods: [],         // Method names to skip
      ignoreConstructors: true,  // Skip class constructors (default: true)
      ignoreSingleParam: false,  // Allow single-parameter functions (default: false)
      ignoreNoParams: true,      // Allow zero-parameter functions (default: true)
    }],
  },
}
```

**Common patterns:**

```js
{
  // Skip legacy functions during gradual migration
  ignoreFunctions: ['legacyCreateUser', 'oldProcessOrder'],

  // Skip array-like methods
  ignoreMethods: ['map', 'filter', 'reduce', '0', '1'],

  // Allow single-parameter functions like callbacks
  ignoreSingleParam: true,
}
```

---

## What Gets Ignored (By Default)

We made some pragmatic choices about what to flag:

✅ **Ignored by default:**
- Functions with **no parameters** - `function foo() {}`
- Class **constructors** - They're often constrained by framework conventions
- **TypeScript `this` parameters** - These are type annotations, not real parameters
- **Rest parameters** - `function foo(...args) {}`
- **Array destructuring** - `function foo([a, b]) {}`

❌ **Flagged by default:**
- Functions with multiple regular parameters - `function foo(a, b) {}`
- Functions with default parameters - `function foo(a = 1, b = 2) {}`
- Mixed parameters - `function foo({ options }, flag) {}`

---

## Advanced: Ignore Patterns

The `ignoreFunctions` and `ignoreMethods` options support a surprising variety of patterns:

### Function Names

```js
{
  ignoreFunctions: ['legacyFunction', 'ignored', '0', '#privateHelper']
}
```

**Works with:**
- ✅ Named declarations: `function legacyFunction(a, b) {}`
- ✅ Arrow functions: `const ignored = (a, b) => {}`
- ✅ Function expressions: `const ignored = function(a, b) {}`
- ✅ Reassignments: `let ignored; ignored = (a, b) => {}`
- ✅ Object properties: `{ ignored: (a, b) => {} }`
- ✅ Computed keys: `{ ['ignored']: (a, b) => {} }`
- ✅ String literals: `{ "ignored": (a, b) => {} }`
- ✅ Numeric literals: `{ 0: (a, b) => {} }` (use `'0'` in config)

### Method Names

```js
{
  ignoreMethods: ['toString', 'legacyMethod', '0', '#privateMethod']
}
```

**Works with:**
- ✅ Class methods: `class { legacyMethod(a, b) {} }`
- ✅ Object methods: `{ legacyMethod(a, b) {} }`
- ✅ Computed keys: `{ ['legacyMethod'](a, b) {} }`
- ✅ String literals: `{ "legacyMethod"(a, b) {} }`
- ✅ Numeric literals: `class { 0(a, b) {} }` (use `'0'` in config)
- ✅ Private methods: `class { #privateMethod(a, b) {} }` (use `'#privateMethod'` in config)

> **Important:** For numeric properties, always use strings in your config: `['0', '42']`, not `[0, 42]`.

> **Important:** For private methods, include the `#` prefix: `['#privateMethod']`, not `['privateMethod']`.

---

## Examples

### ✅ Valid Code

```js
// Object parameters - the happy path
function createUser({ name, email, age }) {
  // Self-documenting and easy to extend
}

// Rest parameters are fine
function logMessages(...messages) {
  messages.forEach(console.log);
}

// Array destructuring is fine
function getCoordinates([x, y]) {
  return { x, y };
}

// TypeScript 'this' parameters work
function handleClick(this: HTMLElement, { x, y }: Point) {
  console.log(this, x, y);
}

// Constructors are skipped by default
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}
```

### ❌ Invalid Code

The rule will flag these patterns:

```js
// Multiple parameters - hard to remember order
function createUser(name, email, age, isAdmin) {
  // ❌ Which parameter is which?
}

// Better: self-documenting object
function createUser({ name, email, age, isAdmin }) {
  // ✅ Clear and extensible
}

// Default parameters still count as multiple params
function greet(greeting = "Hello", name = "World") {
  // ❌ Still positional
}

// Better: object with defaults
function greet({ greeting = "Hello", name = "World" } = {}) {
  // ✅ Named and optional
}

// Mixed parameters - inconsistent
function processOrder({ items, total }, shouldNotify) {
  // ❌ Why is shouldNotify separate?
}

// Better: everything in the object
function processOrder({ items, total, shouldNotify }) {
  // ✅ Consistent interface
}
```

---

## TypeScript Support

The plugin works seamlessly with TypeScript and `@typescript-eslint/parser`:

```js
// eslint.config.js
import onlyObjectParams from 'eslint-plugin-prefer-object-params';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      'prefer-object-params': onlyObjectParams,
    },
    rules: {
      'prefer-object-params/prefer-object-params': 'error',
    },
  },
];
```

**TypeScript-specific behavior:**

The rule understands TypeScript's explicit `this` parameter and won't count it as a violation:

```ts
// ✅ Valid - 'this' is a type annotation, not a real parameter
function handleEvent(this: HTMLElement, { type, target }: Event) {
  console.log(this, type, target);
}
```

---

## Traditional ESLint Config

If you're using ESLint 8 or earlier with the traditional config format:

```json
{
  "plugins": ["prefer-object-params"],
  "rules": {
    "prefer-object-params/prefer-object-params": ["error", {
      "ignoreFunctions": [],
      "ignoreMethods": [],
      "ignoreConstructors": true,
      "ignoreSingleParam": false,
      "ignoreNoParams": true
    }]
  }
}
```

---

## Migration Strategy

Adopting this pattern in an existing codebase? Here's a gentle approach:

**Phase 1: Observation**
```js
{
  rules: {
    'prefer-object-params/prefer-object-params': 'warn',  // Just warn for now
  },
}
```

**Phase 2: Selective Enforcement**
```js
{
  files: ['src/new-features/**/*.js'],  // Start with new code
  rules: {
    'prefer-object-params/prefer-object-params': 'error',
  },
}
```

**Phase 3: Gradual Migration**
```js
{
  rules: {
    'prefer-object-params/prefer-object-params': ['error', {
      ignoreFunctions: [
        // Add legacy functions here as you find them
        'legacyHelper',
        'oldUtility',
      ],
    }],
  },
}
```

**Phase 4: Full Enforcement**
```js
{
  rules: {
    'prefer-object-params/prefer-object-params': 'error',
  },
}
```

---

## Development

Want to contribute or run the project locally?

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Build the plugin
pnpm build

# Lint the code
pnpm lint
```

---

## Contributing

Found a bug? Have an idea for improvement? Contributions are welcome!

Feel free to:
- Open an issue to discuss changes
- Submit a PR with tests
- Improve documentation
- Report edge cases we missed

---

## Acknowledgments

This plugin was built to solve a real problem we encountered while building consistent APIs. It's opinionated by design, but we've tried to make it flexible enough to adapt to your needs.

If it helps your team write more maintainable code, we've done our job. If not, that's okay too—not every pattern fits every codebase.

---

## License

MIT © [Jag Reehal](https://github.com/jagreehal)
