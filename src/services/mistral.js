import { Mistral } from '@mistralai/mistralai';
import { config } from '../config.js';
import { YouTube} from './youtube.js';
import { getMedicineDetails } from './medicine.js';

const mistral = new Mistral({
  apiKey: config.mistralKey
});

const tools = [
  {
    type: "function",
    function: {
      name: "Youtube",
      description: "Extract transcript from a YouTube video and answer the prompt",
      parameters: {
        type: "object",
        properties: {
          value: {
            type: "string",
            description: "Full YouTube video URL.",
          },
          prompt: {
            type: "string",
            description: "User prompt about the youtube video. Defaukt prompt is : Summarize the video in detail in bullet points ."
          }
        },
        required: ["value", "prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMedicineDetails",
      description: "Get detailed information about a medicine",
      parameters: {
        type: "object",
        properties: {
          value: {
            type: "string",
            description: "Name of the medicine to look up.",
          },
          prompt: {
            type: "string",
            description: "User prompt about the medicine. Default prompt is : List all the details with substitute medicine details."
          }
        },
        required: ["value", "prompt"],
      },
    },
  }
];

const namesToFunctions = {
  'Youtube': (value,prompt) => YouTube(value, prompt),
  'getMedicineDetails': (value,prompt) => getMedicineDetails(value, prompt),
};
export async function getMistralResponse(messages) {
  try {
    // Convert messages to Mistral format
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'bot' ? 'assistant' : (msg.role === 'user' ? 'user' : 'system'),
      content: msg.content
    }));

    let response = await mistral.chat.complete({
      model: 'mistral-large-latest',
      messages: formattedMessages,
      tools: tools,
      toolChoice: "auto",
      temperature: 0.7,
      maxTokens: 1000
    });
    console.log("Mistral API Response: ", response.choices[0].message.content);
    messages.push(response.choices[0].message);


     // Check if toolCalls exist before accessing it
     if (response.choices[0].message.toolCalls && response.choices[0].message.toolCalls.length > 0) {
      const toolCall = response.choices[0].message.toolCalls[0];
      const functionName = toolCall.function.name;
      const functionParams = JSON.parse(toolCall.function.arguments);
      console.log("\nfunction_name: ", functionName, "\nfunction_params: ", functionParams);
      console.log("functionParams:1 ", functionParams.value);
      console.log("functionParams:2 ", functionParams.prompt);
      // Assuming namesToFunctions is defined somewhere and accessible
      const functionResult = await namesToFunctions[functionName](functionParams.value, functionParams.prompt);
      console.log(functionResult);

      messages.push({
        role: "tool",
        name: functionName,
        content: functionResult.toString(),
        toolCallId: toolCall.id
      });

      response = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: messages
      });
      console.log(response.choices[0].message.content);
      return response.choices[0].message.content;
    } else {
      // If no toolCalls, return the content directly
      console.log(response.choices[0].message.content);
      return response.choices[0].message.content;
    }
  } catch (error) {
    console.error('Mistral API Error:', error);
    throw new Error('Failed to get response from Mistral API');
  }
}