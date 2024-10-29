import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import { config } from './config.js';
import { getGPTResponse, analyzeImage } from './services/openai.js';
import { getGeminiResponse, analyzeImageWithGemini } from './services/gemini.js';
import { getLlamaResponse } from './services/llama.js';
import { ConversationManager } from './utils/history.js';

const bot = new TelegramBot(config.telegramToken, { polling: true });
const userModels = new Map();
const conversationManager = new ConversationManager();

// Function to sanitize Markdown text
function sanitizeMarkdown(text) {
  const escapeChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  let sanitizedText = text;
  escapeChars.forEach(char => {
    const regex = new RegExp(`\\${char}`, 'g');
    sanitizedText = sanitizedText.replace(regex, `\\${char}`);
  });
  return sanitizedText;
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    'Welcome! I am your AI assistant with multimodal capabilities.\n\n' +
    'Commands:\n' +
    '/start - Start the bot\n' +
    '/clear - Clear conversation history\n' +
    '/gemini - Switch to Gemini mode\n' +
    '/gpt - Switch to GPT mode\n' +
    '/llama - Switch to LLaMA mode\n\n' +
    'You can send me text or images to analyze!'
  );
});

// Handle /clear command
bot.onText(/\/clear/, (msg) => {
  const chatId = msg.chat.id;
  conversationManager.clear(chatId);
  bot.sendMessage(chatId, 'Conversation history cleared!');
});

// Handle model selection commands
bot.onText(/\/gemini/, (msg) => {
  const chatId = msg.chat.id;
  userModels.set(chatId, 'gemini');
  bot.sendMessage(chatId, 'Switched to Gemini mode!');
});

bot.onText(/\/gpt/, (msg) => {
  const chatId = msg.chat.id;
  userModels.set(chatId, 'gpt');
  bot.sendMessage(chatId, 'Switched to GPT mode!');
});

bot.onText(/\/llama/, (msg) => {
  const chatId = msg.chat.id;
  userModels.set(chatId, 'llama');
  bot.sendMessage(chatId, 'Switched to LLaMA mode!');
});

// Handle text messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Ignore commands and non-text messages
  if (!text || text.startsWith('/') || msg.photo) return;

  try {
    bot.sendChatAction(chatId, 'typing');

    const model = userModels.get(chatId) || 'gemini';

    // Fetch message history
    const history = conversationManager.get(chatId);

    // Add user message to history
    history.push({ role: 'user', content: text });

    let response;
    if (model === 'gemini') {
      response = await getGeminiResponse(history);
    } else if (model === 'llama') {
      response = await getLlamaResponse(text);
    } else {
      response = await getGPTResponse(history);
    }

    // Add bot response to history
    history.push({ role: 'bot', content: response });

    // Update conversation history
    conversationManager.add(chatId, { role: 'user', content: text });
    conversationManager.add(chatId, { role: 'bot', content: response });

    // Sanitize and send formatted response with model tag
    const sanitizedResponse = sanitizeMarkdown(`[${model}] ${response}`);
    await bot.sendMessage(chatId, sanitizedResponse, { parse_mode: 'Markdown' });
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
    const sanitizedAnalysis = sanitizeMarkdown(analysis);
    await bot.sendMessage(chatId, sanitizedAnalysis, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, 'Sorry, I had trouble analyzing that image. Please try again.');
  }
});

console.log('Multimodal Bot is running...');