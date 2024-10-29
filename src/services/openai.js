import OpenAI from 'openai';
import { config } from '../config.js';

const openai = new OpenAI({
  apiKey: config.openaiKey,
});

export async function getGPTResponse(messages) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      ...messages
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return completion.choices[0].message.content;
}

export async function analyzeImage(imageUrl, prompt) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt || "What's in this image?" },
          { type: "image_url", image_url: imageUrl }
        ],
      },
    ],
    max_tokens: 500,
  });

  return response.choices[0].message.content;
}