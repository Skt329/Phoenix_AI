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

const bot = new TelegramBot(config.telegramToken, { polling: true });
const userModels = new Map();
const conversationManager = new ConversationManager();
// Function to escape special characters in code blocks
function escapeCodeBlock(text) {
  // In code blocks, only escape backticks and backslashes
  return text.replace(/[`\\]/g, '\\$&');
}

// Function to escape special characters in link URLs
function escapeLinkUrl(text) {
  // In URLs, only escape parentheses and backslashes
  return text.replace(/[)\\]/g, '\\$&');
}

// Function to escape special characters in regular text
function escapeRegularText(text) {
  // All special characters that need escaping in regular text
  const specialChars = [
    '_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', 
    '-', '=', '|', '{', '}', '.', '!', '\\'
  ];
  
  // Create a single regex pattern for all special characters
  const pattern = new RegExp(
    '([' + specialChars.map(c => '\\' + c).join('') + '])', 
    'g'
  );
  
  // Escape each special character with a backslash
  return text.replace(pattern, '\\$1');
}

// Function to handle inline links
function formatLinks(text) {
  // Match markdown links [text](url)
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  return text.replace(linkPattern, (match, linkText, url) => {
    const escapedText = escapeRegularText(linkText);
    const escapedUrl = escapeLinkUrl(url);
    return `[${escapedText}](${escapedUrl})`;
  });
}

// Main formatting function
function formatTelegramMessage(text) {
  // Early return for empty or null text
  if (!text) return '';
  
  // Split the text into segments: code blocks and regular text
  const segments = text.split(/(```[\s\S]*?```|`[^`]*`)/g);
  
  let formatted = segments.map((segment) => {
    // Handle multiline code blocks
    if (segment.startsWith('```') && segment.endsWith('```')) {
      const language = segment.split('\n')[0].slice(3);
      const code = segment
        .slice(segment.indexOf('\n') + 1, -3)
        .trim();
      return '```' + language + '\n' + escapeCodeBlock(code) + '```';
    }
    
    // Handle inline code
    if (segment.startsWith('`') && segment.endsWith('`')) {
      const code = segment.slice(1, -1);
      return '`' + escapeCodeBlock(code) + '`';
    }
    
    // Handle regular text with links
    if (segment.trim()) {
      let processed = formatLinks(segment);
      return escapeRegularText(processed);
    }
    
    return segment;
  }).join('');
  
  // Handle edge cases for lists and line breaks
  formatted = formatted
    // Ensure proper spacing after list markers
    .replace(/^([\s]*)[•\-*+](\s*)/gm, '$1• ')
    // Preserve line breaks
    .replace(/\n/g, '\n');
    
  return formatted;
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