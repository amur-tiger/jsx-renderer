import type { NodePath, PluginObj, PluginPass } from "@babel/core";
import {
  type ArrayExpression,
  arrowFunctionExpression,
  callExpression,
  type CallExpression,
  type Expression,
  identifier,
  type Identifier,
  importDeclaration,
  importSpecifier,
  isArrayExpression,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectProperty,
  isStringLiteral,
  type Node,
  type ObjectExpression,
  stringLiteral,
} from "@babel/types";
// @ts-ignore
import transformJsx from "@babel/plugin-transform-react-jsx";

export default function transform(): PluginObj {
  function isJsxCall(
    node: Node | null | undefined,
    pass: PluginPass,
  ): node is CallExpression {
    const jsx = pass.get("@babel/plugin-react-jsx/id/jsx")();
    const jsxs = pass.get("@babel/plugin-react-jsx/id/jsxs")();

    if (!isIdentifier(jsx) || !isIdentifier(jsxs)) {
      throw new TypeError("Could not determine jsx imported name.");
    }

    return (
      isCallExpression(node) &&
      (isIdentifier(node.callee, jsx) || isIdentifier(node.callee, jsxs))
    );
  }

  function hasSignal(path: NodePath, pass: PluginPass): boolean {
    if (
      isMemberExpression(path.node) &&
      isIdentifier(path.node.property, { name: "value" })
    ) {
      return true;
    }

    const options = {
      pass,
      hasCall: false,
    };

    path.traverse(
      {
        FunctionExpression(p) {
          p.skip();
        },

        ArrowFunctionExpression(p) {
          p.skip();
        },

        CallExpression(p, options) {
          // don't go into further JSX calls, those will be handled separately

          if (
            isJsxCall(p.node, options.pass) &&
            !isStringLiteral(p.node.arguments[0])
          ) {
            p.skip();
          }
        },

        MemberExpression(p, options) {
          if (p.get("property").isIdentifier({ name: "value" })) {
            options.hasCall = true;
            p.stop();
          }
        },
      },
      options,
    );

    return options.hasCall;
  }

  function isWrapped(path: NodePath, pass: PluginPass) {
    if (
      path.parentPath == null ||
      !path.parentPath.isArrowFunctionExpression()
    ) {
      return false;
    }

    const render = pass.get("ffe-transform/imports/render");
    const compute = pass.get("ffe-transform/imports/compute");
    const call = path.parentPath.parentPath.node;

    return (
      isCallExpression(call) &&
      (isIdentifier(call.callee, render) || isIdentifier(call.callee, compute))
    );
  }

  function wrapCall(
    path: NodePath<Expression>,
    func: Identifier,
    pass: PluginPass,
  ) {
    if (isWrapped(path, pass)) {
      return;
    }

    path.replaceWith(
      callExpression(func, [arrowFunctionExpression([], path.node)]),
    );
    path.skip();
  }

  return {
    name: "jsxTransform",

    inherits(babel: any) {
      return transformJsx.default(babel, {
        runtime: "automatic",
        importSource: "jsx-renderer",
        throwIfNamespace: false,
        useBuiltIns: true,
      });
    },

    visitor: {
      Program(path, pass) {
        const render = identifier(path.scope.generateUid("render"));
        pass.set("ffe-transform/imports/render", render);

        const compute = identifier(path.scope.generateUid("compute"));
        pass.set("ffe-transform/imports/compute", compute);

        path.node.body.unshift(
          importDeclaration(
            [
              importSpecifier(render, identifier("render")),
              importSpecifier(compute, identifier("compute")),
            ],
            stringLiteral("jsx-renderer/runtime"),
          ),
        );
      },

      CallExpression: {
        exit(path, pass) {
          if (!isJsxCall(path.node, pass)) {
            // this call is not jsx
            return;
          }

          const isComponent = !isStringLiteral(path.node.arguments[0]);
          const props = path.get("arguments")[1] as NodePath<ObjectExpression>;

          for (const prop of props.get("properties")) {
            if (
              !isObjectProperty(prop.node) ||
              (isCallExpression(prop.node.value) &&
                isJsxCall(prop.node.value.callee, pass))
            ) {
              continue;
            }

            const value = prop.get("value");
            if (Array.isArray(value)) {
              continue;
            }

            if (isIdentifier(prop.node.key, { name: "children" })) {
              // wrap each reactive child
              if (isArrayExpression(value.node)) {
                for (const item of (value as NodePath<ArrayExpression>).get(
                  "elements",
                )) {
                  if (hasSignal(item as NodePath<Expression>, pass)) {
                    wrapCall(
                      item as NodePath<Expression>,
                      pass.get("ffe-transform/imports/render"),
                      pass,
                    );
                  }
                }
              } else {
                if (hasSignal(value, pass)) {
                  wrapCall(
                    value as NodePath<Expression>,
                    pass.get("ffe-transform/imports/render"),
                    pass,
                  );
                }
              }
            } else if (!isComponent && hasSignal(prop, pass)) {
              // for intrinsic elements, wrap attributes (components have to be re-rendered whole)
              wrapCall(
                value as NodePath<Expression>,
                pass.get("ffe-transform/imports/compute"),
                pass,
              );
            }
          }

          if (isComponent) {
            // always wrap components
            wrapCall(path, pass.get("ffe-transform/imports/render"), pass);
          }
        },
      },
    },
  };
}
