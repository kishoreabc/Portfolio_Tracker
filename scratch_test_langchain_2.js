const { ChatOpenAI } = require('@langchain/openai');
require('dotenv').config({ path: '.env.local' });

async function test() {
  try {
    const llm = new ChatOpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      modelName: 'meta/llama-3.1-70b-instruct',
      configuration: {
        baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'
      }
    });
    
    console.log('Testing ChatOpenAI with meta/llama-3.1-70b-instruct...');
    const res = await llm.invoke('Say hello only');
    console.log('Success:', res.content);
  } catch (err) {
    console.error('Failed with configuration:', err.message);
  }
}
test();
