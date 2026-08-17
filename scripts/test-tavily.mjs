import fs from 'fs';

async function main() {
  const env = fs.readFileSync('.env.local', 'utf-8');
  const match = env.match(/TAVILY_API_KEY="([^"]+)"/);
  const apiKey = match ? match[1] : '';

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: 'Indian stock market Nifty 50 Sensex RBI monetary policy Banking Finance',
      search_depth: 'advanced',
      topic: 'news',
      days: 30,
      include_answer: 'advanced',
      max_results: 10,
    }),
  });

  const data = await res.json();
  console.log('HTTP STATUS:', res.status);
  console.log('TAVILY SYNTHESIS ANSWER LENGTH:', data.answer ? data.answer.length : 0);
  console.log('ARTICLES FETCHED:', data.results ? data.results.length : 0);
  if (data.results && data.results.length > 0) {
    console.log('FIRST ARTICLE:', data.results[0].title);
    console.log('CONTENT LENGTH:', data.results[0].content ? data.results[0].content.length : 0);
  }
}

main().catch(console.error);
