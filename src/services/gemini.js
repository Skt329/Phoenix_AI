import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

const genAI = new GoogleGenerativeAI(config.geminiKey);

export async function getGeminiResponse(messages) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Updated to use "gemini-flash"

  // Convert the last message to a prompt string
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || !lastMessage.content) {
    throw new Error('Invalid message format');
  }

  try {
    const result = await model.generateContent(lastMessage.content);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

export async function analyzeImageWithGemini(imageData, prompt) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
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