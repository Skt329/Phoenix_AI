// src/services/llama.js
import OpenAI from 'openai';
import { config } from '../config.js';

const openai = new OpenAI({
  apiKey: config.nvidiaApiKey, // Use the NVIDIA API key from your config
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export async function getLlamaResponse(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-4-340b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    let result = '';
    for await (const chunk of completion) {
      result += chunk.choices[0]?.delta?.content || '';
    }
    return result;
  } catch (error) {
    console.error('NVIDIA API Error:', error);
    throw new Error('Failed to get response from NVIDIA API');
  }
}