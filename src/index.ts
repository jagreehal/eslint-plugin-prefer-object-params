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
      },
      additionalProperties: false,
    }],
    messages: {
      useObjectParams: 'Functions must use object parameters only. Use {{name}}({ param1, param2 }) instead of {{name}}(param1, param2)',
    }
  },
  defaultOptions: [{}],

  create(context: TSESLint.RuleContext<MessageIds, Options>, [options = {}]) {
    const ignoreFunctions = new Set(options.ignoreFunctions || []);
    const ignoreMethods = new Set(options.ignoreMethods || []);
    const ignoreConstructors = options.ignoreConstructors ?? true;
    const ignoreSingleParam = options.ignoreSingleParam ?? false;
    const ignoreNoParams = options.ignoreNoParams ?? true;

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

      // Check if any param is NOT an object pattern, array pattern, or rest element
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

        // For AssignmentPattern (default params), check the left side
        if (param.type === AST_NODE_TYPES.AssignmentPattern) {
          const left = param.left;
          // Allow if left side is ObjectPattern or ArrayPattern
          if (left.type === AST_NODE_TYPES.ObjectPattern ||
              left.type === AST_NODE_TYPES.ArrayPattern) {
            continue;
          }
          // If left side is Identifier, it's a regular param with default - should be flagged
        }

        // Identifier or AssignmentPattern with Identifier - violates the rule
        context.report({
          node: param,
          messageId: 'useObjectParams',
          data: { name: node.id?.name || 'function' },
        });
        break; // Only report once per function
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
  meta: {
    name: 'eslint-plugin-prefer-object-params',
    version: '1.0.0'
  }
} as const;

export default plugin;
