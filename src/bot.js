/**
 * The above code is a Telegram bot written in JavaScript that serves as an AI assistant with
 * multimodal capabilities, allowing users to interact with different AI models for text and image
 * analysis.
 * @param text - The `text` parameter in the code refers to the text content of messages sent to the
 * Telegram bot. This parameter is used to analyze and process text messages, as well as to provide
 * responses based on the user input. The bot can handle various commands, such as switching between
 * different AI models (Gem
 * @returns The code provided is a Node.js script that creates a Telegram bot with multimodal
 * capabilities. It uses the `node-telegram-bot-api` library to interact with Telegram, `axios` for
 * making HTTP requests, and several custom services for handling different AI models (GPT, Gemini,
 * LLaMA) and image analysis.
 */
import axios from 'axios';
import { getGPTResponse, analyzeImage } from './services/openai.js';
import { getGeminiResponse, analyzeImageWithGemini } from './services/gemini.js';
import { getLlamaResponse } from './services/llama.js';
import { getMistralResponse } from './services/mistral.js';
import { getMedicineDetails } from './services/medicine.js';
import { ConversationManager } from './utils/history.js';
import { setupCommands, bot } from './utils/botmenu.js';
import { Output } from './utils/output_message_format.js';
import { generateImage } from './services/stablediffusion.js';
import { constraints } from './utils/Input_constraints.js';
import express from 'express';
const app = express();
const port = process.env.PORT || 3000;


// Add basic route
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

// Add this after your bot initialization code
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const userModels = new Map();
const conversationManager = new ConversationManager();


setupCommands(bot, conversationManager, userModels);

// Add this command handler after your other bot.on handlers
bot.onText(/\/imagine(?:@\w+)? (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];
  // Define Owner Words
  constraints(prompt, bot, chatId);
  try {
    bot.sendChatAction(chatId, 'upload_photo');

    // Generate image
    const imageBuffer = await generateImage(prompt);

    // Send the image back to user
    await bot.sendPhoto(chatId, imageBuffer, {
      caption: `Generated image for: ${prompt}`
    });
  } catch (error) {
    console.error('Image generation error:', error);
    bot.sendMessage(chatId, 'Sorry, I had trouble generating that image. Please try again.');
  }
});


// Define function schema
const medicineFunction = {
  name: "getMedicineDetails",
  description: "Get medicine information from database",
  parameters: {
    type: "object",
    properties: {
      medicineName: {
        type: "string",
        description: "Medicine name to search"
      }
    },
    required: ["medicineName"]
  }
};


// Handle text messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const botUsername = (await bot.getMe()).username;
  const isGroupChat = msg.chat.type === 'group' || msg.chat.type === 'supergroup';

  // Ignore if no text or is a photo
  if (!text || msg.photo) return;

  // Check for commands with username in group
  if (isGroupChat) {
    // Remove spaces between username and command
    const normalizedText = text.replace(`@${botUsername}`, '').trim();
    if (normalizedText.startsWith('/')) return;
  } else {
    // Direct message command check
    if (text.trimStart().startsWith('/')) return;
  }

  // Check if bot is mentioned in group chat
  if (isGroupChat && !text.includes(`@${botUsername}`)) return;

  // Detect prohibited words in user input
  const prohibitedWords = ['porn', 'xvideos'];
  const regex = new RegExp(`\\b(${prohibitedWords.join('|')})\\b`, 'i');
  if (regex.test(text)) {
    await bot.sendMessage(chatId, 'Input is not appropriate.');
    return; // Stop further processing
  }
  constraints(text, bot, chatId);
  let response = '';
  try {
    bot.sendChatAction(chatId, 'typing');

    const model = userModels.get(chatId) || 'gemini';

    // Fetch message history
    const history = conversationManager.get(chatId);
    // Add user message to history
    history.push({ role: 'user', content: text });

     // Function detection using Gemini
  // Update the medicine detection prompt
const functionPrompt = [{
  role: 'user', 
  content: `Analyze if this query is asking about medicine information.
    Query: "${text}"
    
    If this is about medicine information, effects, or dosage, extract the medicine name and return a JSON response like this:
    {"isMedicineQuery":true,"medicineName":"MEDICINE_NAME"}
    
    If not medicine related, return:
    {"isMedicineQuery":false,"medicineName":null}
    
    Return ONLY the JSON, no other text.`
}];

    const detection = await getGeminiResponse(functionPrompt);
    try {
      const result = JSON.parse(detection);
      
      if (result.isMedicineQuery && result.medicineName) {
        // Show searching message
        await bot.sendMessage(chatId, `Searching for information about ${result.medicineName}...`);
  
        // Get medicine details
        const medicineInfo = await getMedicineDetails(result.medicineName);
  
        // Combine medicine info with user query for context
        const prompt = [{
          role: 'user',
          content: `Medicine Information:\n${medicineInfo}\n\nUser Question: ${text}\n\nProvide a clear and concise response addressing the user's question using the medicine information provided.`
        }];
  
        // Get response using selected model
        if (model === 'gemini') {
          response = await getGeminiResponse(prompt);
        } else if (model === 'llama') {
          response = await getLlamaResponse(prompt[0].content);
        } else if (model === 'mistral') {
          response = await getMistralResponse(prompt);
        } else {
          response = await getGPTResponse(prompt);
        }
  
      } else {
        // Handle non-medicine queries with regular conversation
        if (model === 'gemini') {
          response = await getGeminiResponse(history);
        } else if (model === 'llama') {
          response = await getLlamaResponse(text);
        } else if (model === 'mistral') {
          response = await getMistralResponse(history);
        } else {
          response = await getGPTResponse(history);
        }
      }
  
      // Add response to history and send
      history.push({ role: 'bot', content: response });
      conversationManager.add(chatId, { role: 'user', content: text });
      conversationManager.add(chatId, { role: 'bot', content: response });
  
      Output(response, bot, chatId);
  
    } catch (error) {
      console.error('JSON parsing error:', error);
      // Fall back to regular conversation if JSON parsing fails
      response = await getGeminiResponse(history);
      Output(response, bot, chatId);
    }
  
  }catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, 'Sorry, I encountered an error. Please try again later.');
  }
});

// Handle photo messages
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const photo = msg.photo[msg.photo.length - 1]; // Get the highest resolution photo
  const caption = msg.caption || "What's in this image?";
  // Check if the message is in a group chat and if the caption includes the bot's username
  const isGroupChat = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  const botUsername = (await bot.getMe()).username;

  if (isGroupChat && (!caption || !caption.includes(`@${botUsername}`))) {
    // In group chats, only process photos if the caption includes the bot's username
    return;
  }

  try {
    bot.sendChatAction(chatId, 'typing');

    // Get photo URL
    const fileInfo = await bot.getFile(photo.file_id);
    const photoUrl = `https://api.telegram.org/file/bot${config.telegramToken}/${fileInfo.file_path}`;

    // Download image for Gemini (it requires base64)
    const imageResponse = await axios.get(photoUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data, 'binary').toString('base64');

    const model = userModels.get(chatId) || 'gemini';
    let analysis;

    if (model === 'gpt') {
      analysis = await analyzeImage(photoUrl, caption);
    } else {
      analysis = await analyzeImageWithGemini(imageBuffer, caption);
    }

    Output(analysis, bot, chatId);
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, 'Sorry, I had trouble analyzing that image. Please try again.');
  }
});


console.log('Multimodal Bot is running...');

