import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  Type
} from "@google/genai";
import { config } from '../config.js';


const genAI = new GoogleGenAI({apiKey: config.geminiKey});



const Config = {
  systemInstruction: "You are a multimodel Ai bot that can answer user questions based on their text images documents or audios ",
  tools: [{googleSearch: {}}]
};





export async function getGeminiResponse(messages) {
  try {
    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));


    // Send request with function declarations
    const finalResponse = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: contents,
      config: Config,
      tools: Config.tools
    });
   
     // Return the text from the final response
      return finalResponse.candidates[0].content.parts[0].text;
    } 
   catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

export async function analyzeImageWithGemini(imageData, prompt) {
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { text: prompt || "What's in this image?" },
        { inlineData: { data: imageData, mimeType: "image/jpeg" } }
      ]
    });

    return response.text;
  } catch (error) {
    console.error('Gemini Vision API Error:', error);
    throw error;
  }
}

export async function analyzeFileWithGemini(fileBuffer, mimeType, prompt) {
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: mimeType
          }
        },
        { text: prompt || "Can you summarize this document?" }
      ]
    });

    return response.text;
  } catch (error) {
    console.error('Gemini File Analysis Error:', error);
    throw error;
  }
}