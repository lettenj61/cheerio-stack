# cheerio-stack

Re-package [Cheerio](https://github.com/cheeriojs/cheerio) as ES modules to have it work in [Deno](https://deno.land)

## Installation

> TODO

## Build

The build is entirely done by manual work. See `ORIGINAL_COMMITS` for the exact packages/versions the build relies on.

### Packages

Source code of these packages are cloned from GitHub:

- [cheerio][github_cheerio]
- [cheerio-select][github_cheerio_select]
- [css-select][github_css_select]
- [css-what][github_css_what]
- [dom-serializer][github_dom_renderer]
- [domelementtype]()
- [domhandler]()
- [domutils]()
- [entities](https://github.com/fb55/entities)
- [htmlparser2]()
- [nth-check]()

And these are from [Skypack](https://skypack.dev).

- [parse5 and sub packages](https://github.com/inikulin/parse5)

## License

Basically this project is just a bundle of someone else's great work, i.e. Cheerio [authors and contributors](https://github.com/cheeriojs/cheerio/graphs/contributors).

Thank you for great creations!

See `3RD_PARTY_LICENSE` for links to licenses of original code.

Any other contents under the repository which not described in `3RD_PARTY_LICENSE` text, including this introduction and codes, are licensed under [CC0](https://creativecommons.org/choose/zero/).




<!-- Links -->

[github_cheerio]: https://github.com/cheeriojs/cheerio
[github_cheerio_select]: https://github.com/cheeriojs/cheerio-select
[github_css_select]: https://github.com/fb55/css-select
[github_css_what]: https://github.com/fb55/css-what
[github_dom_renderer]: https://github.com/cheeriojs/dom-renderer
[github_parse5]: https://github.com/inikulin/parse5