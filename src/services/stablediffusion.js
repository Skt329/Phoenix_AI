import { config } from '../config.js';

export async function generateImage(prompt) {
    if (!config.huggingfaceToken) {
        throw new Error('Hugging Face API token not configured');
    }
    const retryCount = 3;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
            // Simplified request body matching API docs
            const response = await fetch(
                "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3.5-large",
                {
                    headers: {
                        'Authorization': `Bearer ${config.huggingfaceToken}`,
                        'Content-Type': 'application/json'
                    },
                    method: 'POST',
                    body: JSON.stringify({
                        inputs: prompt
                    })
                }
            );
            
            const contentType = response.headers.get('content-type');
            console.log('Response content type:', contentType);

            if (!contentType?.includes('image/')) {
                const textResponse = await response.text();
                console.error('Unexpected response:', textResponse);
                throw new Error(`API returned non-image response: ${textResponse}`);
            }

            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            return buffer;

        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);

            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}