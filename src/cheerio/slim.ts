/** @file Alternative Entry point for Cheerio, excluding parse5. */

export type {
  Cheerio,
  CheerioAPI,
  CheerioOptions,
  HTMLParser2Options,
  Node,
  NodeWithChildren,
  Element,
  Document,
} from './index.ts';

/**
 * Types used in signatures of Cheerio methods.
 *
 * @category Cheerio
 */
export * from './types.ts';

import { getLoad } from './load.ts';
import { getParse } from './parse.ts';
import render from '../dom-serializer/index.ts';
import { parseDocument } from '../htmlparser2/index.ts';

/**
 * Create a querying function, bound to a document created from the provided markup.
 *
 * @param content - Markup to be loaded.
 * @param options - Options for the created instance.
 * @param isDocument - Always `false` here, as we are always using `htmlparser2`.
 * @returns The loaded document.
 * @see {@link https://cheerio.js.org#loading} for additional usage information.
 */
export const load = getLoad(getParse(parseDocument), render);
