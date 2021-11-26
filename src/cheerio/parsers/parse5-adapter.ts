import { Node, Document, isDocument } from '../../domhandler/index.ts';
import { parse as parseDocument, parseFragment, serialize } from 'https://cdn.skypack.dev/parse5@6.0.1?dts';
import htmlparser2Adapter from 'https://cdn.skypack.dev/parse5-htmlparser2-tree-adapter@6.0.1?dts';
import type { InternalOptions } from '../options.ts';

interface Parse5Options extends InternalOptions {
  context?: Node;
}

export function parseWithParse5(
  content: string,
  options: Parse5Options,
  isDocument?: boolean
): Document {
  const opts = {
    scriptingEnabled:
      typeof options.scriptingEnabled === 'boolean'
        ? options.scriptingEnabled
        : true,
    treeAdapter: htmlparser2Adapter,
    sourceCodeLocationInfo: options.sourceCodeLocationInfo,
  };

  const { context } = options;

  // @ts-expect-error The tree adapter unfortunately doesn't return the exact types.
  return isDocument
    ? parseDocument(content, opts)
    : // @ts-expect-error Same issue again.
      parseFragment(context, content, opts);
}

export function renderWithParse5(dom: Node | ArrayLike<Node>): string {
  /*
   * `dom-serializer` passes over the special "root" node and renders the
   * node's children in its place. To mimic this behavior with `parse5`, an
   * equivalent operation must be applied to the input array.
   */
  const nodes = 'length' in dom ? dom : [dom];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (isDocument(node)) {
      Array.prototype.splice.call(nodes, index, 1, ...node.children);
    }
  }

  // !@ts-expect-error Types don't align here either. REMOVED
  return serialize({ children: nodes }, { treeAdapter: htmlparser2Adapter });
}
