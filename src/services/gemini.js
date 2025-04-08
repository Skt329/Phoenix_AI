import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  Type
} from "@google/genai";
import { config } from '../config.js';
import { YouTube } from './youtube.js';
import { getMedicineDetails } from './medicine.js';

const genAI = new GoogleGenAI({apiKey: config.geminiKey});

// Function declarations for tools
const youtubeDeclaration = {
  name: "YouTube",
  description: "Extract transcript from a YouTube video and answer the prompt",
  parameters: {
    type: Type.OBJECT,
    properties: {
      videoUrl: {
        type: Type.STRING,
        description: "Full YouTube video URL"
      },
      prompt: {
        type: Type.STRING,
        description: "User prompt about the youtube video. Default prompt is : Summarize the video in detail in bullet points."
      }
    },
    required: ["videoUrl"]
  }
};

const medicineDeclaration = {
  name: "getMedicineDetails",
  description: "Get detailed information about a medicine",
  parameters: {
    type: Type.OBJECT,
    properties: {
      medicineName: {
        type: Type.STRING,
        description: "Name of the medicine to look up"
      },
      prompt: {
        type: Type.STRING,
        description: "User prompt about the medicine. Default prompt is : List all the details with substitute medicine details."
      }
    },
    required: ["medicineName"]
  }
};

const Config = {
  systemInstruction: "You are a multimodel Ai bot. You have to first check the user prompt if it is a function call or not. If it is not a function call then you have to return the Answer of the prompt. If it is a function call then you have to call the function and return the result.",
  tools: [{
      functionDeclarations: [youtubeDeclaration, medicineDeclaration]
  }],
  
};

const tools = [{ functionDeclarations: [youtubeDeclaration, medicineDeclaration] }];

export async function getGeminiResponse(messages) {
  try {
    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));


    // Send request with function declarations
    let response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: contents,
      config: Config,
      tools: tools
    });
   
    

   
    
    // Check for function calls
    if (response.candidates && response.candidates[0].content.parts[0].functionCall) {
      const functionCall = response.candidates[0].content.parts[0].functionCall;
      const functionName = functionCall.name;
      const args = functionCall.args;

      let functionResult;
      switch (functionName) {
        case 'YouTube':
          functionResult = await YouTube(args.videoUrl, args.prompt);
          break;
        case 'getMedicineDetails':
          functionResult = await getMedicineDetails(args.medicineName, args.prompt);
          break;
        default:
          functionResult = 'Unknown function called';
      }

      // Create a new chat turn with the function call and its response
      contents.push({
        role: 'model',
        parts: [{ functionCall: functionCall }],
      });
      contents.push({
        role: 'function',
        parts: [{
          tool_name: functionName,
          json_result: functionResult,
        }],
      });

      // Send the final response with function results
      const finalResponse = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: contents,
        config: Config,
        tools: tools
      });

      // Return the text from the final response
      return finalResponse.candidates[0].content.parts[0].text;
    } else {
      // If no function call, return the text response
      return response.candidates[0].content.parts[0].text;
    }
  } catch (error) {
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