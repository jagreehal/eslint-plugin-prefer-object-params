import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import plugin from './index';

// Configure RuleTester to use Vitest
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  }
});

describe('prefer-object-params', () => {
  it('validates with the rule tester', () => {
    ruleTester.run('prefer-object-params', plugin.rules['prefer-object-params'], {
      valid: [
        // Valid object parameter functions
        { code: 'function foo() {}' }, // No params
        { code: 'function foo({ a }) {}' }, // Single object param
        { code: 'function foo({ a, b, c }) {}' }, // Multiple object destructured params
        { code: 'const foo = ({ a, b }) => {}' }, // Arrow function with object params
        { code: 'const foo = () => {}' }, // Arrow function with no params

        // Ignored constructors
        {
          code: 'class MyClass { constructor(a, b, c) {} }',
          options: [{ ignoreConstructors: true }],
        },

        // Ignored single param
        {
          code: 'function foo(a) {}',
          options: [{ ignoreSingleParam: true }],
        },

        // Ignored function names
        {
          code: 'function legacyFunc(a, b) {}',
          options: [{ ignoreFunctions: ['legacyFunc'] }],
        },

        // Ignored method names
        {
          code: 'class MyClass { myMethod(a, b) {} }',
          options: [{ ignoreMethods: ['myMethod'] }],
        },

        // Ignored arrow function assigned to variable
        {
          code: 'const ignored = (a, b) => {}',
          options: [{ ignoreFunctions: ['ignored'] }],
        },

        // Ignored anonymous function expression assigned to variable
        {
          code: 'const ignored = function(a, b) {}',
          options: [{ ignoreFunctions: ['ignored'] }],
        },

        // Ignored function in object property
        {
          code: 'const obj = { ignored: (a, b) => {} }',
          options: [{ ignoreFunctions: ['ignored'] }],
        },

        // Ignored reassigned function expression
        {
          code: 'let ignored; ignored = (a, b) => {}',
          options: [{ ignoreFunctions: ['ignored'] }],
        },

        // Ignored object literal method
        {
          code: 'const obj = { ignoredMethod(a, b) {} }',
          options: [{ ignoreMethods: ['ignoredMethod'] }],
        },

        // Ignored method with computed property key
        {
          code: "const obj = { ['ignoredMethod'](a, b) {} }",
          options: [{ ignoreMethods: ['ignoredMethod'] }],
        },

        // Ignored method with string literal key
        {
          code: 'const obj = { "ignoredMethod"(a, b) {} }',
          options: [{ ignoreMethods: ['ignoredMethod'] }],
        },

        // Ignored class method with computed property key
        {
          code: "class MyClass { ['ignoredMethod'](a, b) {} }",
          options: [{ ignoreMethods: ['ignoredMethod'] }],
        },

        // Ignored private class method
        {
          code: 'class MyClass { #ignoredMethod(a, b) {} }',
          options: [{ ignoreMethods: ['#ignoredMethod'] }],
        },

        // Ignored function in object with computed property key
        {
          code: "const obj = { ['ignored']: (a, b) => {} }",
          options: [{ ignoreFunctions: ['ignored'] }],
        },

        // Ignored function in object with string literal key
        {
          code: 'const obj = { "ignored": (a, b) => {} }',
          options: [{ ignoreFunctions: ['ignored'] }],
        },

        // Ignored method with numeric literal key
        {
          code: 'class Arr { 0(a, b) {} }',
          options: [{ ignoreMethods: ['0'] }],
        },

        // Ignored object method with numeric literal key
        {
          code: 'const obj = { 0(a, b) {} }',
          options: [{ ignoreMethods: ['0'] }],
        },

        // Ignored function with numeric literal key
        {
          code: 'const obj = { 0: (a, b) => {} }',
          options: [{ ignoreFunctions: ['0'] }],
        },

        // Method with no params
        { code: 'class MyClass { myMethod() {} }' },

        // Rest parameters (should be allowed)
        { code: 'function foo(...args) {}' },
        { code: 'const foo = (...args) => {}' },

        // Array destructuring (should be allowed - it's still a single param)
        { code: 'function foo([a, b]) {}' },
        { code: 'const foo = ([a, b]) => {}' },

        // Async functions with object params
        { code: 'async function foo({ a, b }) {}' },
        { code: 'const foo = async ({ a, b }) => {}' },

        // Generator functions with object params
        { code: 'function* foo({ a, b }) {}' },

        // Mixed object and rest (object first)
        { code: 'function foo({ a }, ...rest) {}' },

        // Object param with default value
        { code: 'function foo({ a, b } = {}) {}' },

        // TypeScript explicit 'this' parameter with object param
        { code: 'function foo(this: SomeType, { options }: Options) {}' },

        // TypeScript 'this' parameter only
        { code: 'function foo(this: SomeType) {}' },

        // TypeScript 'this' parameter with rest params
        { code: 'function foo(this: SomeType, ...args: any[]) {}' },

        // Ignored by ignoreFiles glob patterns
        {
          code: 'function foo(a, b) {}',
          filename: 'src/legacy/old-code.js',
          options: [{ ignoreFiles: ['**/legacy/**'] }],
        },
        {
          code: 'function bar(x, y, z) {}',
          filename: 'test-utils.js',
          options: [{ ignoreFiles: ['test-*.js'] }],
        },
        {
          code: 'function baz(p, q) {}',
          filename: 'src/foo/bar.js',
          options: [{ ignoreFiles: ['**/foo/*.js'] }],
        },
        {
          code: 'function qux(a, b, c, d) {}',
          filename: 'a/foo/b/c/bar.js',
          options: [{ ignoreFiles: ['**/foo/**/bar.js'] }],
        },
      ],
      invalid: [
        // Multiple regular parameters
        {
          code: 'function foo(a, b) {}',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Multiple regular parameters in arrow function
        {
          code: 'const foo = (a, b) => {}',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Method with regular parameters
        {
          code: 'class MyClass { myMethod(a, b) {} }',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Function with single param when ignoreSingleParam is explicitly false
        {
          code: 'function foo(a) {}',
          options: [{ ignoreSingleParam: false }],
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Default parameters (still multiple regular params)
        {
          code: 'function foo(a = 1, b = 2) {}',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Async functions with regular parameters
        {
          code: 'async function foo(a, b) {}',
          errors: [{ messageId: 'useObjectParams' }],
        },
        {
          code: 'const foo = async (a, b) => {}',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Generator functions with regular parameters
        {
          code: 'function* foo(a, b) {}',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Mixed object and regular params
        {
          code: 'function foo({ a }, b) {}',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Constructor when ignoreConstructors is false
        {
          code: 'class MyClass { constructor(a, b) {} }',
          options: [{ ignoreConstructors: false }],
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Arrow function assigned to variable (not ignored)
        {
          code: 'const notIgnored = (a, b) => {}',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Anonymous function expression assigned to variable (not ignored)
        {
          code: 'const notIgnored = function(a, b) {}',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Reassigned function (not ignored)
        {
          code: 'let notIgnored; notIgnored = (a, b) => {}',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Object literal method (not ignored)
        {
          code: 'const obj = { method(a, b) {} }',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Function in object property (not ignored)
        {
          code: 'const obj = { fn: (a, b) => {} }',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // TypeScript 'this' parameter with regular params (should still fail)
        {
          code: 'function foo(this: SomeType, a: string, b: number) {}',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // TypeScript 'this' parameter with mixed params (should still fail)
        {
          code: 'function foo(this: SomeType, { options }: Options, flag: boolean) {}',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Computed property key method (not ignored)
        {
          code: "const obj = { ['method'](a, b) {} }",
          errors: [{ messageId: 'useObjectParams' }],
        },

        // String literal key method (not ignored)
        {
          code: 'const obj = { "method"(a, b) {} }',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Numeric literal key method (not ignored)
        {
          code: 'class Arr { 0(a, b) {} }',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Numeric literal key in object method (not ignored)
        {
          code: 'const obj = { 42(a, b) {} }',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Numeric literal key function (not ignored)
        {
          code: 'const obj = { 123: (a, b) => {} }',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Private class method (not ignored)
        {
          code: 'class MyClass { #method(a, b) {} }',
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Private class method with wrong ignore name (without #)
        {
          code: 'class MyClass { #ignored(a, b) {} }',
          options: [{ ignoreMethods: ['ignored'] }], // Should use '#ignored' instead
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Computed property key function (not ignored)
        {
          code: "const obj = { ['fn']: (a, b) => {} }",
          errors: [{ messageId: 'useObjectParams' }],
        },

        // Functions with no params when ignoreNoParams is false
        {
          code: 'function foo() {}',
          options: [{ ignoreNoParams: false }],
          errors: [{ messageId: 'useObjectParams' }],
        },
        {
          code: 'const foo = () => {}',
          options: [{ ignoreNoParams: false }],
          errors: [{ messageId: 'useObjectParams' }],
        },
        {
          code: 'class MyClass { method() {} }',
          options: [{ ignoreNoParams: false }],
          errors: [{ messageId: 'useObjectParams' }],
        },
      ],
    });
  });
});
