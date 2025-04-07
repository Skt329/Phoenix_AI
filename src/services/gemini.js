import {
  //DynamicRetrievalMode,
  GoogleGenerativeAI,
} from "@google/generative-ai";
//import { GoogleAIFileManager } from "@google/generative-ai/server";
import { config } from '../config.js';
import { YouTube} from './youtube.js';
import { getMedicineDetails } from './medicine.js';

const genAI = new GoogleGenerativeAI(config.geminiKey);
const model1 = genAI.getGenerativeModel({ 
  model: "gemini-2.5-pro-exp-03-25"});
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-pro-exp-03-25",
  systemInstruction:'You are a multimodel Ai bot that can answer user questions based on their text images documents or audios  and can perform tasks based on the user input if it required. You can also call functions to perform specific tasks if required. ',
  tools: [
    {
      functionDeclarations: [
        {
          name: "YouTube",
          description: "Extract transcript from a YouTube video and answer the prompt",
          parameters: {
            type: "object",
            properties: {
              videoUrl: {
                type: "string",
                description: "Full YouTube video URL"
              },
              prompt: {
                type: "string",
                description: "User prompt about the youtube video. Defaukt prompt is : Summarize the video in detail in bullet points ."
              }
            },
            required: ["videoUrl"]
          }
        },
        {
          name: "getMedicineDetails",
          description: "Get detailed information about a medicine",
          parameters: {
            type: "object",
            properties: {
              medicineName: {
                type: "string",
                description: "Name of the medicine to look up"
              },
              prompt: {
                type: "string",
                description: "User prompt about the medicine. Default prompt is : List all the details with substitute medicine details." 
              }
            },
            required: ["medicineName"]
          }
        }
      ]
    }
  ],
  toolConfig: {
    functionCallingConfig: {
      mode: "AUTO"
    }
  }
});

const generationConfig = {
  temperature: 1.3,
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

    // Function to handle function calling
    async function handleFunctionCalling(response) {
      for (const candidate of response.candidates) {
        for (const part of candidate.content.parts) {
          if (part.functionCall) {
            const functionName = part.functionCall.name;
            const args = part.functionCall.args;

            switch (functionName) {
              case 'YouTube':
                return await YouTube(args.videoUrl, args.prompt);
              case 'getMedicineDetails':
                return await getMedicineDetails(args.medicineName, args.prompt);
              default:
                return 'Unknown function called';
            }
            
          }
        }
      }
      return null;
    }

    // Start chat with function detection configuration
    const chat = model.startChat({
      generationConfig,
      history: geminiMessages.slice(0, -1)
    });

    // Send message and check for function calls
    const result = await chat.sendMessage(lastMessage.content);
    const functionCallResult = await handleFunctionCalling(result.response);

    // If a function was called, return its result
    if (functionCallResult) {
      const results = await model1.generateContent(functionCallResult);
    return results.response.text();
    }

    // Otherwise, return the regular text response
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

export async function analyzeFileWithGemini(fileBuffer, mimeType, prompt) {
  try {
    const result = await model.generateContent([
      {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType
        }
      },
      { text: prompt || "Can you summarize this document?" }
    ]);

    return result.response.text();
  } catch (error) {
    console.error('Gemini File Analysis Error:', error);
    throw error;
  }
}

