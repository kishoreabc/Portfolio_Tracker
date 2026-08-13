const { ChatOpenAI } = require('@langchain/openai');
require('dotenv').config({ path: '.env.local' });

async function test() {
  try {
    const llm = new ChatOpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      model: 'nvidia/llama-3.1-nemotron-70b-instruct',
      configuration: {
        baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'
      }
    });
    
    console.log('Testing configuration: { baseURL } ...');
    const res = await llm.invoke('Hello');
    console.log('Success:', res.content);
  } catch (err) {
    console.error('Failed with configuration:', err.message);
  }

  try {
    const llm2 = new ChatOpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      model: 'nvidia/llama-3.1-nemotron-70b-instruct',
      baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1' // top level?
    });
    console.log('\nTesting top-level baseURL ...');
    const res2 = await llm2.invoke('Hello');
    console.log('Success:', res2.content);
  } catch (err) {
    console.error('Failed with top-level:', err.message);
  }
}
test();
