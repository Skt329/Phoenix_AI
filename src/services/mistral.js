import { Mistral } from '@mistralai/mistralai';
import { config } from '../config.js';

const mistral = new Mistral({
  apiKey: config.mistralKey
});

export async function getMistralResponse(messages) {
  try {
    // Convert messages to Mistral format
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'bot' ? 'assistant' : msg.role,
      content: msg.content
    }));

    const completion = await mistral.chat.complete({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...formattedMessages
      ],
      temperature: 0.7,
      maxTokens: 1000
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Mistral API Error:', error);
    throw new Error('Failed to get response from Mistral API');
  }
}