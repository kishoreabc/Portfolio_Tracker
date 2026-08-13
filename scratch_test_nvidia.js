const { ChatOpenAI } = require('@langchain/openai');
require('dotenv').config({ path: '.env.local' });

async function testNvidia() {
  const url = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    console.error('No API key found in .env.local');
    return;
  }

  // 1. Test standard Llama 3.1 70b Instruct
  console.log('Testing Chat API with meta/llama-3.1-70b-instruct...');
  try {
    const res = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      })
    });
    console.log('meta/llama-3.1-70b-instruct status:', res.status);
    if (!res.ok) console.log(await res.text());
  } catch(e) { console.error(e.message); }

  // 2. Test nemotron
  console.log('\nTesting Chat API with nvidia/llama-3.1-nemotron-70b-instruct...');
  try {
    const res = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'nvidia/llama-3.1-nemotron-70b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      })
    });
    console.log('nvidia/llama-3.1-nemotron-70b-instruct status:', res.status);
    if (!res.ok) console.log(await res.text());
  } catch(e) { console.error(e.message); }
}

testNvidia();
