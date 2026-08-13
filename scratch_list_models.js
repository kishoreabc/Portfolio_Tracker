require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const url = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const apiKey = process.env.NVIDIA_API_KEY;

  try {
    const res = await fetch(`${url}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!res.ok) {
      console.log('Error fetching models:', await res.text());
      return;
    }
    
    const data = await res.json();
    const models = data.data.map(m => m.id);
    
    // Filter to likely embedding models (usually contain 'embed')
    const embedModels = models.filter(m => m.toLowerCase().includes('embed') || m.toLowerCase().includes('bge'));
    console.log('Embedding models found:');
    console.log(embedModels);
  } catch (err) {
    console.error('Failed:', err.message);
  }
}
listModels();
