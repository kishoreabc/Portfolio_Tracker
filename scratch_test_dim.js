require('dotenv').config({ path: '.env.local' });

async function testModelDimensions(model) {
  const url = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const apiKey = process.env.NVIDIA_API_KEY;

  try {
    const res = await fetch(`${url}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: 'Test string',
        model: model,
        input_type: 'passage'
      })
    });
    
    if (!res.ok) {
      console.log(`Failed for ${model}:`, await res.text());
      return;
    }
    
    const data = await res.json();
    console.log(`${model} dimension size:`, data.data[0].embedding.length);
  } catch (err) {
    console.error('Failed:', err.message);
  }
}
testModelDimensions('baai/bge-m3');
testModelDimensions('nvidia/nv-embed-v1');
