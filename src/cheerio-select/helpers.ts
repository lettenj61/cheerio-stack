import type { Node } from "../domhandler/index.ts";
import type { Selector } from "../css-what/index.ts";
import { isFilter } from "./positionals.ts";

export function getDocumentRoot(node: Node): Node {
    while (node.parent) node = node.parent;
    return node;
}

export function groupSelectors(
    selectors: Selector[][]
): [plain: Selector[][], filtered: Selector[][]] {
    const filteredSelectors: Selector[][] = [];
    const plainSelectors: Selector[][] = [];

    for (const selector of selectors) {
        if (selector.some(isFilter)) {
            filteredSelectors.push(selector);
        } else {
            plainSelectors.push(selector);
        }
    }

    return [plainSelectors, filteredSelectors];
}
