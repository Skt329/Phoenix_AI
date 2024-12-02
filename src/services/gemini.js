import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

const genAI = new GoogleGenerativeAI(config.geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const generationConfig = {
  temperature: 0.9,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

export async function getGeminiResponse(messages) {
  try {
    // Convert messages to Gemini format
    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Get the last message for special handling
    const lastMessage = messages[messages.length - 1];

    // Check if this is a function detection prompt
    if (lastMessage.content.includes('{"isMedicineQuery"')) {
      // For function detection, use a different configuration with lower temperature
      const functionResult = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: lastMessage.content }] }],
        generationConfig: {
          ...generationConfig,
          temperature: 0.1, // Lower temperature for more precise JSON output
        }
      });
      return functionResult.response.text();
    }

    // For regular conversations, create a new chat with history
    const chat = model.startChat({
      generationConfig,
      history: geminiMessages.slice(0, -1) // Use all messages except the last one as history
    });

    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
    
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

export async function analyzeImageWithGemini(imageData, prompt) {
  try {
    const result = await model.generateContent([
      prompt || "What's in this image?",
      { inlineData: { data: imageData, mimeType: "image/jpeg" } },
    ]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini Vision API Error:', error);
    throw error;
  }
}