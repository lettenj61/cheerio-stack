import cheerio from './mod.ts';

const $ = cheerio.load(`<element>
<item pos="1" greeting>Hello, world!</item>
<item pos="2">Bye!</item>
</element>`);

const data = $('element > item[greeting]').text();
console.log(data);
