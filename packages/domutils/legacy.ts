import { isTag, isText, Node, Element } from "../domhandler/index.ts";
import { ElementType } from "../domelementtype/index.ts";
import { filter, findOne } from "./querying.ts";

type TestType = (elem: Node) => boolean;

/**
 * An object with keys to check elements against. If a key is `tag_name`,
 * `tag_type` or `tag_contains`, it will check the value against that specific
 * value. Otherwise, it will check an attribute with the key's name.
 *
 * @category Legacy Query Functions
 */
export interface TestElementOpts {
    tag_name?: string | ((name: string) => boolean);
    tag_type?: string | ((name: string) => boolean);
    tag_contains?: string | ((data?: string) => boolean);
    [attributeName: string]:
        | undefined
        | string
        | ((attributeValue: string) => boolean);
}

const Checks: Record<
    string,
    (value: string | undefined | ((str: string) => boolean)) => TestType
> = {
    tag_name(name) {
        if (typeof name === "function") {
            return (elem: Node) => isTag(elem) && name(elem.name);
        } else if (name === "*") {
            return isTag;
        }
        return (elem: Node) => isTag(elem) && elem.name === name;
    },
    tag_type(type) {
        if (typeof type === "function") {
            return (elem: Node) => type(elem.type);
        }
        return (elem: Node) => elem.type === type;
    },
    tag_contains(data) {
        if (typeof data === "function") {
            return (elem: Node) => isText(elem) && data(elem.data);
        }
        return (elem: Node) => isText(elem) && elem.data === data;
    },
};

/**
 * @param attrib Attribute to check.
 * @param value Attribute value to look for.
 * @returns A function to check whether the a node has an attribute with a
 *   particular value.
 */
function getAttribCheck(
    attrib: string,
    value: undefined | string | ((value: string) => boolean)
): TestType {
    if (typeof value === "function") {
        return (elem: Node) => isTag(elem) && value(elem.attribs[attrib]);
    }
    return (elem: Node) => isTag(elem) && elem.attribs[attrib] === value;
}

/**
 * @param a First function to combine.
 * @param b Second function to combine.
 * @returns A function taking a node and returning `true` if either of the input
 *   functions returns `true` for the node.
 */
function combineFuncs(a: TestType, b: TestType): TestType {
    return (elem: Node) => a(elem) || b(elem);
}

/**
 * @param options An object describing nodes to look for.
 * @returns A function executing all checks in `options` and returning `true` if
 *   any of them match a node.
 */
function compileTest(options: TestElementOpts): TestType | null {
    const funcs = Object.keys(options).map((key) => {
        const value = options[key];
        return Object.prototype.hasOwnProperty.call(Checks, key)
            ? Checks[key](value)
            : getAttribCheck(key, value);
    });

    return funcs.length === 0 ? null : funcs.reduce(combineFuncs);
}

/**
 * @category Legacy Query Functions
 * @param options An object describing nodes to look for.
 * @param node The element to test.
 * @returns Whether the element matches the description in `options`.
 */
export function testElement(options: TestElementOpts, node: Node): boolean {
    const test = compileTest(options);
    return test ? test(node) : true;
}

/**
 * @category Legacy Query Functions
 * @param options An object describing nodes to look for.
 * @param nodes Nodes to search through.
 * @param recurse Also consider child nodes.
 * @param limit Maximum number of nodes to return.
 * @returns All nodes that match `options`.
 */
export function getElements(
    options: TestElementOpts,
    nodes: Node | Node[],
    recurse: boolean,
    limit = Infinity
): Node[] {
    const test = compileTest(options);
    return test ? filter(test, nodes, recurse, limit) : [];
}

/**
 * @category Legacy Query Functions
 * @param id The unique ID attribute value to look for.
 * @param nodes Nodes to search through.
 * @param recurse Also consider child nodes.
 * @returns The node with the supplied ID.
 */
export function getElementById(
    id: string | ((id: string) => boolean),
    nodes: Node | Node[],
    recurse = true
): Element | null {
    if (!Array.isArray(nodes)) nodes = [nodes];
    return findOne(getAttribCheck("id", id), nodes, recurse);
}

/**
 * @category Legacy Query Functions
 * @param tagName Tag name to search for.
 * @param nodes Nodes to search through.
 * @param recurse Also consider child nodes.
 * @param limit Maximum number of nodes to return.
 * @returns All nodes with the supplied `tagName`.
 */
export function getElementsByTagName(
    tagName: string | ((name: string) => boolean),
    nodes: Node | Node[],
    recurse = true,
    limit = Infinity
): Element[] {
    return filter(Checks.tag_name(tagName), nodes, recurse, limit) as Element[];
}

/**
 * @category Legacy Query Functions
 * @param type Element type to look for.
 * @param nodes Nodes to search through.
 * @param recurse Also consider child nodes.
 * @param limit Maximum number of nodes to return.
 * @returns All nodes with the supplied `type`.
 */
export function getElementsByTagType(
    type: ElementType | ((type: ElementType) => boolean),
    nodes: Node | Node[],
    recurse = true,
    limit = Infinity
): Node[] {
    return filter(Checks.tag_type(type as string), nodes, recurse, limit);
}
