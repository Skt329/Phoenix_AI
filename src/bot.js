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
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import { config } from './config.js';
import { getGPTResponse, analyzeImage } from './services/openai.js';
import { getGeminiResponse, analyzeImageWithGemini } from './services/gemini.js';
import { getLlamaResponse } from './services/llama.js';
import { ConversationManager } from './utils/history.js';
import { setupCommands } from './utils/botmenu.js';
import { formatTelegramMessage } from './utils/output_message_format.js';

const bot = new TelegramBot(config.telegramToken, { polling: true });
const userModels = new Map();
const conversationManager = new ConversationManager();


// Setup command handlers
setupCommands(bot, conversationManager, userModels);
// Handle text messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const botUsername = (await bot.getMe()).username;
  const isGroupChat = msg.chat.type === 'group' || msg.chat.type === 'supergroup';

  // Ignore commands and non-text messages
  if (!text || text.startsWith('/') || msg.photo) return;

  // Check if the bot is mentioned in a group chat
  if (isGroupChat && !text.includes(`@${botUsername}`)) return;

  try {
    bot.sendChatAction(chatId, 'typing');

    const model = userModels.get(chatId) || 'gemini';

    // Fetch message history
    const history = conversationManager.get(chatId);

    // Add user message to history
    history.push({ role: 'user', content: text });

    let response = '';
    if (model === 'gemini') {
      response = await getGeminiResponse(history);
    } else if (model === 'llama') {
      response = await getLlamaResponse(history);
    } else {
      response = await getGPTResponse(history);
    }

    // Add bot response to history
    history.push({ role: 'bot', content: response });

    // Update conversation history
    conversationManager.add(chatId, { role: 'user', content: text });
    conversationManager.add(chatId, { role: 'bot', content: response });

    // Sanitize and send formatted response with model tag
    const formattedResponse = formatTelegramMessage(response);
    await bot.sendMessage(chatId, formattedResponse, {
      parse_mode: 'MarkdownV2'
    });
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, 'Sorry, I encountered an error. Please try again later.');
  }
});

// Handle photo messages
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const photo = msg.photo[msg.photo.length - 1]; // Get the highest resolution photo
  const caption = msg.caption || "What's in this image?";

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

    if (model === 'gemini') {
      analysis = await analyzeImageWithGemini(imageBuffer, caption);
    } else {
      analysis = await analyzeImage(photoUrl, caption);
    }

    // Sanitize and send formatted analysis
    const formattedanalysis = formatTelegramMessage(analysis);
    await bot.sendMessage(chatId, formattedanalysis, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, 'Sorry, I had trouble analyzing that image. Please try again.');
  }
});

console.log('Multimodal Bot is running...');