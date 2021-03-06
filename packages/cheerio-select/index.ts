import { parse, Selector, PseudoSelector, isTraversal } from "../css-what/index.ts";
import {
    _compileToken as compileToken,
    Options as CSSSelectOptions,
    prepareContext,
} from "../css-select/index.ts";
import * as DomUtils from "../domutils/index.ts";
import type { Element, Node, Document } from "../domhandler/index.ts";
import { getDocumentRoot, groupSelectors } from "./helpers.ts";
import { Filter, isFilter, CheerioSelector, getLimit } from "./positionals.ts";

// Re-export pseudo extension points
export { filters, pseudos, aliases } from "../css-select/index.ts";

/** Used to indicate a scope should be filtered. Might be ignored when filtering. */
const SCOPE_PSEUDO: PseudoSelector = {
    type: "pseudo",
    name: "scope",
    data: null,
};
/** Used for actually filtering for scope. */
const CUSTOM_SCOPE_PSEUDO: PseudoSelector = { ...SCOPE_PSEUDO };
const UNIVERSAL_SELECTOR: Selector = { type: "universal", namespace: null };

export interface Options extends CSSSelectOptions<Node, Element> {
    /** Optional reference to the root of the document. If not set, this will be computed when needed. */
    root?: Document;
}

export function is(
    element: Element,
    selector: string | ((el: Element) => boolean),
    options: Options = {}
): boolean {
    return some([element], selector, options);
}

export function some(
    elements: Element[],
    selector: string | ((el: Element) => boolean),
    options: Options = {}
): boolean {
    if (typeof selector === "function") return elements.some(selector);

    const [plain, filtered] = groupSelectors(parse(selector, options));

    return (
        (plain.length > 0 && elements.some(compileToken(plain, options))) ||
        filtered.some(
            (sel) => filterBySelector(sel, elements, options).length > 0
        )
    );
}

function filterByPosition(
    filter: Filter,
    elems: Element[],
    data: Selector[][] | string | null,
    options: Options
): Element[] {
    const num = typeof data === "string" ? parseInt(data, 10) : NaN;

    switch (filter) {
        case "first":
        case "lt":
            // Already done in `getLimit`
            return elems;
        case "last":
            return elems.length > 0 ? [elems[elems.length - 1]] : elems;
        case "nth":
        case "eq":
            return isFinite(num) && Math.abs(num) < elems.length
                ? [num < 0 ? elems[elems.length + num] : elems[num]]
                : [];
        case "gt":
            return isFinite(num) ? elems.slice(num + 1) : [];
        case "even":
            return elems.filter((_, i) => i % 2 === 0);
        case "odd":
            return elems.filter((_, i) => i % 2 === 1);
        case "not": {
            const filtered = new Set(
                filterParsed(data as Selector[][], elems, options)
            );

            return elems.filter((e) => !filtered.has(e));
        }
    }
}

export function filter(
    selector: string,
    elements: Node[],
    options: Options = {}
): Element[] {
    return filterParsed(parse(selector, options), elements, options);
}

/**
 * Filter a set of elements by a selector.
 *
 * Will return elements in the original order.
 *
 * @param selector Selector to filter by.
 * @param elements Elements to filter.
 * @param options Options for selector.
 */
function filterParsed(
    selector: Selector[][],
    elements: Node[],
    options: Options
): Element[] {
    if (elements.length === 0) return [];

    const [plainSelectors, filteredSelectors] = groupSelectors(selector);
    let found: undefined | Set<Element>;

    if (plainSelectors.length) {
        const filtered = filterElements(elements, plainSelectors, options);

        // If there are no filters, just return
        if (filteredSelectors.length === 0) {
            return filtered;
        }

        // Otherwise, we have to do some filtering
        if (filtered.length) {
            found = new Set(filtered);
        }
    }

    for (
        let i = 0;
        i < filteredSelectors.length && found?.size !== elements.length;
        i++
    ) {
        const filteredSelector = filteredSelectors[i];
        const missing = found
            ? elements.filter((e) => DomUtils.isTag(e) && !found!.has(e))
            : elements;

        if (missing.length === 0) break;
        const filtered = filterBySelector(filteredSelector, elements, options);

        if (filtered.length) {
            if (!found) {
                /*
                 * If we haven't found anything before the last selector,
                 * just return what we found now.
                 */
                if (i === filteredSelectors.length - 1) {
                    return filtered;
                }

                found = new Set(filtered);
            } else {
                filtered.forEach((el) => found!.add(el));
            }
        }
    }

    return typeof found !== "undefined"
        ? ((found.size === elements.length
              ? elements
              : // Filter elements to preserve order
                elements.filter((el) =>
                    (found as Set<Node>).has(el)
                )) as Element[])
        : [];
}

function filterBySelector(
    selector: Selector[],
    elements: Node[],
    options: Options
) {
    if (selector.some(isTraversal)) {
        /*
         * Get root node, run selector with the scope
         * set to all of our nodes.
         */
        const root = options.root ?? getDocumentRoot(elements[0]);
        const sel = [...selector, CUSTOM_SCOPE_PSEUDO];
        return findFilterElements(root, sel, options, true, elements);
    }
    // Performance optimization: If we don't have to traverse, just filter set.
    return findFilterElements(elements, selector, options, false);
}

export function select(
    selector: string | ((el: Element) => boolean),
    root: Node | Node[],
    options: Options = {}
): Element[] {
    if (typeof selector === "function") {
        return find(root, selector);
    }

    const [plain, filtered] = groupSelectors(parse(selector, options));

    const results: Element[][] = filtered.map((sel) =>
        findFilterElements(root, sel, options, true)
    );

    // Plain selectors can be queried in a single go
    if (plain.length) {
        results.push(findElements(root, plain, options, Infinity));
    }

    // If there was only a single selector, just return the result
    if (results.length === 1) {
        return results[0];
    }

    // Sort results, filtering for duplicates
    return DomUtils.uniqueSort(results.reduce((a, b) => [...a, ...b]));
}

// Traversals that are treated differently in css-select.
const specialTraversal = new Set<Selector["type"]>(["descendant", "adjacent"]);

function includesScopePseudo(t: Selector): boolean {
    return (
        t !== SCOPE_PSEUDO &&
        t.type === "pseudo" &&
        (t.name === "scope" ||
            (Array.isArray(t.data) &&
                t.data.some((data) => data.some(includesScopePseudo))))
    );
}

function addContextIfScope(
    selector: Selector[],
    options: Options,
    scopeContext?: Node[]
) {
    return scopeContext && selector.some(includesScopePseudo)
        ? { ...options, context: scopeContext }
        : options;
}

/**
 *
 * @param root Element(s) to search from.
 * @param selector Selector to look for.
 * @param options Options for querying.
 * @param queryForSelector Query multiple levels deep for the initial selector, even if it doesn't contain a traversal.
 * @param scopeContext Optional context for a :scope.
 */
function findFilterElements(
    root: Node | Node[],
    selector: Selector[],
    options: Options,
    queryForSelector: boolean,
    scopeContext?: Node[]
): Element[] {
    const filterIndex = selector.findIndex(isFilter);
    const sub = selector.slice(0, filterIndex);
    const filter = selector[filterIndex] as CheerioSelector;

    /*
     * Set the number of elements to retrieve.
     * Eg. for :first, we only have to get a single element.
     */
    const limit = getLimit(filter.name, filter.data);

    if (limit === 0) return [];

    const subOpts = addContextIfScope(sub, options, scopeContext);

    /*
     * Skip `findElements` call if our selector starts with a positional
     * pseudo.
     */
    const elemsNoLimit =
        sub.length === 0 && !Array.isArray(root)
            ? DomUtils.getChildren(root).filter(DomUtils.isTag)
            : sub.length === 0 || (sub.length === 1 && sub[0] === SCOPE_PSEUDO)
            ? (Array.isArray(root) ? root : [root]).filter(DomUtils.isTag)
            : queryForSelector || sub.some(isTraversal)
            ? findElements(root, [sub], subOpts, limit)
            : filterElements(root, [sub], subOpts);

    const elems = elemsNoLimit.slice(0, limit);

    const result = filterByPosition(filter.name, elems, filter.data, options);

    if (result.length === 0 || selector.length === filterIndex + 1) {
        return result;
    }

    const remainingSelector = selector.slice(filterIndex + 1);
    const remainingHasTraversal = remainingSelector.some(isTraversal);

    const remainingOpts = addContextIfScope(
        remainingSelector,
        options,
        scopeContext
    );

    if (remainingHasTraversal) {
        /*
         * Some types of traversals have special logic when they start a selector
         * in css-select. If this is the case, add a universal selector in front of
         * the selector to avoid this behavior.
         */
        if (specialTraversal.has(remainingSelector[0].type)) {
            remainingSelector.unshift(UNIVERSAL_SELECTOR);
        }

        /*
         * Add a scope token in front of the remaining selector,
         * to make sure traversals don't match elements that aren't a
         * part of the considered tree.
         */
        remainingSelector.unshift(SCOPE_PSEUDO);
    }

    /*
     * If we have another filter, recursively call `findFilterElements`,
     * with the `recursive` flag disabled. We only have to look for more
     * elements when we see a traversal.
     *
     * Otherwise,
     */
    return remainingSelector.some(isFilter)
        ? findFilterElements(
              result,
              remainingSelector,
              options,
              false,
              scopeContext
          )
        : remainingHasTraversal
        ? // Query existing elements to resolve traversal.
          findElements(result, [remainingSelector], remainingOpts, Infinity)
        : // If we don't have any more traversals, simply filter elements.
          filterElements(result, [remainingSelector], remainingOpts);
}

interface CompiledQuery {
    (el: Element): boolean;
    shouldTestNextSiblings?: boolean;
}

function findElements(
    root: Node | Node[],
    sel: Selector[][],
    options: Options,
    limit: number
): Element[] {
    if (limit === 0) return [];

    const query: CompiledQuery = compileToken<Node, Element>(
        sel,
        options,
        root
    );

    return find(root, query, limit);
}

function find(
    root: Node | Node[],
    query: CompiledQuery,
    limit = Infinity
): Element[] {
    const elems = prepareContext<Node, Element>(
        root,
        DomUtils,
        query.shouldTestNextSiblings
    );

    return DomUtils.find(
        (node: Node) => DomUtils.isTag(node) && query(node),
        elems,
        true,
        limit
    ) as Element[];
}

function filterElements(
    elements: Node | Node[],
    sel: Selector[][],
    options: Options
): Element[] {
    const els = (Array.isArray(elements) ? elements : [elements]).filter(
        DomUtils.isTag
    );

    if (els.length === 0) return els;

    const query = compileToken<Node, Element>(sel, options);
    return els.filter(query);
}
