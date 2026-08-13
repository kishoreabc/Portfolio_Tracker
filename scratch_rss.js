const RssParser = require('rss-parser');
const parser = new RssParser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator'],
    ],
  },
});

async function main() {
  const feed = await parser.parseURL('https://moneypechu.com/feed/');
  console.log(JSON.stringify(feed.items[0], null, 2));
}

main().catch(console.error);
