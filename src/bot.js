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
import { config } from './config.js';
import { getGPTResponse, analyzeImage } from './services/openai.js';
import { getGeminiResponse, analyzeImageWithGemini, analyzeFileWithGemini } from './services/gemini.js';
import { getLlamaResponse } from './services/llama.js';
import { getMistralResponse } from './services/mistral.js';

import { ConversationManager } from './utils/history.js';
import { setupCommands, bot } from './utils/botmenu.js';
import { Output, handleAIResponse } from './utils/output_message_format.js';
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
  const isConstrained = await constraints(text, bot, chatId);
  if (isConstrained) {
    return; // Stop processing if constraint matched
  }
  let response = '';
  try {
    bot.sendChatAction(chatId, 'typing');

    const model = userModels.get(chatId) || 'gemini';

    // Fetch message history
    const history = conversationManager.get(chatId);
    // Add user message to history
    history.push({ role: 'user', content: text, message_id: msg.message_id });
    conversationManager.add(chatId, history);
// Extract only role and content for AI processing
const aiHistory = history.map(({ role, content }) => ({ role, content }));


    try {
      if (model === 'gemini') {
        response = await getGeminiResponse(aiHistory);
      } else if (model === 'llama') {
        response = await getLlamaResponse(aiHistory);
      } else if (model === 'mistral') {
        response = await getMistralResponse(aiHistory);
      } else {
        response = await getGPTResponse(aiHistory);
      }


      // Add response to history and send
      const messageIds = await Output(response, bot, chatId);
   
      history.push({ role: 'bot', content: response, message_ids: messageIds });
      conversationManager.add(chatId, history);
   

      

    } catch (error) {
      console.error('JSON parsing error:', error);
      // Fall back to regular conversation if JSON parsing fails
      response = await getGeminiResponse(history);
      Output(response, bot, chatId);
    }

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

// Handle document messages
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  const doc = msg.document;
  const caption = msg.caption || "Can you summarize this document?";
  // Check if the message is in a group chat and if the caption includes the bot's username
  const isGroupChat = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  const botUsername = (await bot.getMe()).username;

  if (isGroupChat && (!caption || !caption.includes(`@${botUsername}`))) {
    // In group chats, only process photos if the caption includes the bot's username
    return;
  }
  try {
    bot.sendChatAction(chatId, 'typing');

    // Get document file
    const fileInfo = await bot.getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${config.telegramToken}/${fileInfo.file_path}`;

    // Download file
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(response.data);

    // Analyze with Gemini
    const analysis = await analyzeFileWithGemini(fileBuffer, doc.mime_type, caption);

    // Send response
    await Output(analysis, bot, chatId);
  } catch (error) {
    console.error('Document analysis error:', error);
    bot.sendMessage(chatId, 'Sorry, I had trouble analyzing that document. Please try again.');
  }
});
bot.on('inline_query', async (query) => {
  const inlineQueryId = query.id;
  const queryText = query.query;

  if (!queryText) return;

  // Check if the query ends with a doller ($) indicating the end of the query
  if (queryText.trim().endsWith('$')) {
    try {
      // Send typing action
      bot.answerInlineQuery(inlineQueryId, [], { cache_time: 1 });

      // Prepare the system instruction
      const systemInstruction = {
        role: 'system',
        content: 'Please limit your response to 4000 characters or fewer.',
      };

      // Prepare the user message
      const userMessage = {
        role: 'user',
        content: queryText,
      };

      // Get response from Gemini with system instruction
      const response = await getGeminiResponse([systemInstruction, userMessage]);
      // Handle the AI response
      const formattedResponses = handleAIResponse(response);
      const results = formattedResponses.map((formattedResponse, index) => ({
        type: 'article',
        id: String(index + 1),
        title: formattedResponse,
        input_message_content: {
          message_text: formattedResponse,
          parse_mode: 'HTML',
        },
      }));


      // Send the results to Telegram
      bot.answerInlineQuery(inlineQueryId, results);
    } catch (error) {
      console.error('Error handling inline query:', error);
    }
  } else {
    // Provide a message indicating that the user should end the query with a period
    const results = [
      {
        type: 'article',
        id: '1',
        title: 'Type your query and end with a period ($)',
        input_message_content: {
          message_text: 'Please type your query and end it with a period (.) to get a response.',
        },
      },
    ];

    // Send the results to Telegram
    bot.answerInlineQuery(inlineQueryId, results);
  }
});
console.log('Multimodal Bot is running...');

bot.deleteMessage