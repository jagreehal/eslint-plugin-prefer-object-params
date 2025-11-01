/**
 * ESLint Plugin: eslint-plugin-prefer-object-params
 * ==================================================
 * Enforces that functions and methods must use object parameters only.
 * Instead of function foo(a, b, c), enforce function foo({ a, b, c }).
 *
 * @author Jag Reehal [@jagreehal] <jag@jagreehal.com>
 * @license MIT
 */

import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import picomatch from 'picomatch';

/** Configuration options for the prefer-object-params rule */
export interface RuleOptions {
  /** List of function names to ignore */
  ignoreFunctions?: string[];
  /** List of method names to ignore */
  ignoreMethods?: string[];
  /** Whether to ignore constructors */
  ignoreConstructors?: boolean;
  /** Whether to ignore functions with a single parameter */
  ignoreSingleParam?: boolean;
  /** Whether to ignore functions with no parameters */
  ignoreNoParams?: boolean;
  /** Whether to ignore test files (files matching test.* or spec.* patterns) */
  ignoreTestFiles?: boolean;
  /** Glob patterns for files to ignore */
  ignoreFiles?: string[];
}

type MessageIds = 'useObjectParams';
type Options = [RuleOptions?];

const createRule = ESLintUtils.RuleCreator(
  () => 'https://github.com/jagreehal/eslint-plugin-prefer-object-params#readme'
);

export const rule = createRule<Options, MessageIds>({
  name: 'prefer-object-params',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce functions to use object parameters only',
    },
    schema: [{
      type: 'object',
      properties: {
        ignoreFunctions: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of function names to ignore',
        },
        ignoreMethods: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of method names to ignore',
        },
        ignoreConstructors: {
          type: 'boolean',
          description: 'Whether to ignore constructors',
        },
        ignoreSingleParam: {
          type: 'boolean',
          description: 'Whether to ignore functions with a single parameter',
        },
        ignoreNoParams: {
          type: 'boolean',
          description: 'Whether to ignore functions with no parameters',
        },
        ignoreTestFiles: {
          type: 'boolean',
          description: 'Whether to ignore test files (files matching **/*.test.*, **/*.spec.*)',
        },
        ignoreFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Glob patterns for files to ignore',
        },
      },
      additionalProperties: false,
    }],
    messages: {
      useObjectParams: 'Function \'{{name}}\' has multiple positional parameters [{{params}}]. Use object destructuring: {{name}}({{paramsObj}}) instead of {{name}}({{params}})',
    }
  },
  defaultOptions: [{}],

  create(context: TSESLint.RuleContext<MessageIds, Options>, [options = {}]) {
    const ignoreFunctions = new Set(options.ignoreFunctions || []);
    const ignoreMethods = new Set(options.ignoreMethods || []);
    const ignoreConstructors = options.ignoreConstructors ?? true;
    const ignoreSingleParam = options.ignoreSingleParam ?? true; // Changed default to true
    const ignoreNoParams = options.ignoreNoParams ?? true;
    const ignoreTestFiles = options.ignoreTestFiles ?? true; // Default to true
    const ignoreFiles = options.ignoreFiles || [];

    /**
     * Checks if the current file should be ignored based on file patterns
     */
    function shouldIgnoreFile(): boolean {
      if (!ignoreTestFiles && ignoreFiles.length === 0) {
        return false;
      }

      const filename = context.getFilename();

      // Check ignoreTestFiles default patterns
      if (ignoreTestFiles) {
        const testPattern = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/i;
        if (testPattern.test(filename)) {
          return true;
        }
      }

      // Check custom ignoreFiles patterns using picomatch
      if (ignoreFiles.length > 0) {
        const isMatch = picomatch(ignoreFiles);
        if (isMatch(filename)) {
          return true;
        }
      }

      return false;
    }

    /**
     * Extracts the property name from a property key node
     * Handles Identifier, Literal (string/number/boolean/etc), and PrivateIdentifier
     */
    function getPropertyKeyName(key: TSESTree.Expression | TSESTree.PrivateIdentifier): string | null {
      if (key.type === AST_NODE_TYPES.Identifier) {
        return key.name;
      }
      if (key.type === AST_NODE_TYPES.Literal && key.value != null) {
        // Convert all literal values (string, number, boolean, etc) to strings for comparison
        return String(key.value);
      }
      if (key.type === AST_NODE_TYPES.PrivateIdentifier) {
        return `#${key.name}`; // Include the # prefix to match how it's written in code
      }
      return null;
    }

    /**
     * Checks if a function should be ignored
     */
    function shouldIgnoreFunction(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression): boolean {
      // Check if parent is a method (class method, class property, or object literal method)
      if (node.parent && (
        node.parent.type === AST_NODE_TYPES.MethodDefinition ||
        node.parent.type === AST_NODE_TYPES.PropertyDefinition ||
        node.parent.type === AST_NODE_TYPES.Property
      )) {
        const parent = node.parent as TSESTree.MethodDefinition | TSESTree.PropertyDefinition | TSESTree.Property;
        if (parent.key) {
          const keyName = getPropertyKeyName(parent.key);
          if (keyName && ignoreMethods.has(keyName)) {
            return true;
          }
        }
        // Ignore constructors if configured
        if (ignoreConstructors && 'kind' in parent && parent.kind === 'constructor') {
          return true;
        }
      }

      // Check function name from node.id (for named function declarations/expressions)
      if (node.id && node.id.type === AST_NODE_TYPES.Identifier && ignoreFunctions.has(node.id.name)) {
        return true;
      }

      // Check for arrow functions and anonymous functions assigned to variables
      // Example: const ignored = (a, b) => {}
      if (!node.id && node.parent && node.parent.type === AST_NODE_TYPES.VariableDeclarator) {
        const parent = node.parent as TSESTree.VariableDeclarator;
        if (parent.id && parent.id.type === AST_NODE_TYPES.Identifier && ignoreFunctions.has(parent.id.name)) {
          return true;
        }
      }

      // Check for functions assigned to object properties
      // Example: const obj = { ignored: (a, b) => {} } or { ['ignored']: (a, b) => {} }
      if (!node.id && node.parent && node.parent.type === AST_NODE_TYPES.Property) {
        const parent = node.parent as TSESTree.Property;
        if (parent.key) {
          const keyName = getPropertyKeyName(parent.key);
          if (keyName && ignoreFunctions.has(keyName)) {
            return true;
          }
        }
      }

      // Check for functions assigned via re-assignment
      // Example: let ignored; ignored = (a, b) => {}
      if (!node.id && node.parent && node.parent.type === AST_NODE_TYPES.AssignmentExpression) {
        const parent = node.parent as TSESTree.AssignmentExpression;
        if (parent.left.type === AST_NODE_TYPES.Identifier && ignoreFunctions.has(parent.left.name)) {
          return true;
        }
      }

      return false;
    }

    function checkParams(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression) {
      // Skip file entirely if it matches ignore patterns
      if (shouldIgnoreFile()) return;
      
      if (shouldIgnoreFunction(node)) return;

      const params = node.params;

      // Handle no params case
      if (params.length === 0) {
        if (!ignoreNoParams) {
          // When ignoreNoParams is false, report functions with no params
          context.report({
            node,
            messageId: 'useObjectParams',
            data: { name: node.id?.name || 'function' },
          });
        }
        return; // Either way, we're done checking
      }

      // Ignore if single param
      if (ignoreSingleParam && params.length === 1) return;

      // Collect parameter names for error message (only violations, not allowed patterns)
      const paramNames: string[] = [];
      let firstViolationParam: TSESTree.Node | null = null;
      
      // First pass: collect all parameter names that are violations
      for (const param of params) {
        // Allow: ObjectPattern ({ a, b }), ArrayPattern ([a, b]), RestElement (...args)
        if (param.type === AST_NODE_TYPES.ObjectPattern ||
            param.type === AST_NODE_TYPES.ArrayPattern ||
            param.type === AST_NODE_TYPES.RestElement) {
          continue;
        }

        // TypeScript explicit 'this' parameter - skip it
        // Example: function foo(this: SomeType, { options }: Options) {}
        if (param.type === AST_NODE_TYPES.Identifier && param.name === 'this') {
          continue;
        }

        // Collect parameter name for error message
        if (param.type === AST_NODE_TYPES.Identifier) {
          paramNames.push(param.name);
          if (!firstViolationParam) {
            firstViolationParam = param;
          }
        } else if (param.type === AST_NODE_TYPES.AssignmentPattern) {
          const left = param.left;
          // Allow if left side is ObjectPattern or ArrayPattern
          if (left.type === AST_NODE_TYPES.ObjectPattern ||
              left.type === AST_NODE_TYPES.ArrayPattern) {
            continue;
          }
          // If left side is Identifier, it's a regular param with default - collect name
          if (left.type === AST_NODE_TYPES.Identifier) {
            paramNames.push(left.name);
            if (!firstViolationParam) {
              firstViolationParam = param;
            }
          }
        }
      }

      // Report if we found violations
      if (firstViolationParam && paramNames.length > 0) {
        const functionName = node.id?.name || 
                            (node.parent && node.parent.type === AST_NODE_TYPES.VariableDeclarator && node.parent.id.type === AST_NODE_TYPES.Identifier ? node.parent.id.name : null) ||
                            'function';
        
        // Format parameter names for error message
        const paramsList = paramNames.join(', ');
        const paramsObject = `{ ${paramNames.join(', ')} }`;
        
        context.report({
          node: firstViolationParam,
          messageId: 'useObjectParams',
          data: { 
            name: functionName,
            params: paramsList,
            paramsObj: paramsObject,
          },
        });
      }
    }

    return {
      FunctionDeclaration: checkParams,
      FunctionExpression: checkParams,
      ArrowFunctionExpression: checkParams,
    };
  },
});

/** Plugin configuration */
const plugin = {
  rules: {
    'prefer-object-params': rule
  },
  configs: {
    recommended: {
      plugins: ['prefer-object-params'],
      rules: {
        'prefer-object-params/prefer-object-params': 'error',
      },
    },
  },
  meta: {
    name: 'eslint-plugin-prefer-object-params',
    version: '1.0.0'
  }
} as const;

export default plugin;
