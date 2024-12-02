import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';
export function setupCommands(bot, conversationManager, userModels) {
  // Start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      'Welcome! I am your AI assistant with multimodal capabilities.\n\n' +
      'Commands:\n' +
      '/start - Start the bot\n' +
      '/imagine -Generate images using stable defusion 3.5\n' +
      '/clear - Clear conversation history\n' +
      '/owner - Get Developer info and Contact.\n' +
      'You can send me text, documents or images to analyze!'
    );
  });

  // Clear command
  bot.onText(/\/clear/, (msg) => {
    const chatId = msg.chat.id;
    conversationManager.clear(chatId);
    bot.sendMessage(chatId, 'Conversation history cleared!');
  });
  bot.onText(/\/owner/, (msg) => {
    const chatId = msg.chat.id;
    const ownerInfo = `👨‍💻 *Bot Owner Information*\n\n` +
    `*Name:* Saurabh Tiwari\n\n` +
    `🔗 *Connect with me:*\n` +
    `• LinkedIn: [Saurabh Tiwari](https://www.linkedin.com/in/your-linkedin)\n` +
    `• GitHub: [SaurabhTiwari](https://github.com/Skt329)\n` +
    `• Email: st108113@gmail.com\n\n` +
    `🤖 *Bot Support:*\n` +
    `• Telegram: @PhoenixOO7\n` +
    `💡 *Contributions are welcome!*\n` +
    `Check out the project on [GitHub](https://github.com/Skt329/Phoenix_AI)`;

  });
  // Model selection commands
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

  bot.onText(/\/mistral/, (msg) => {
    const chatId = msg.chat.id;
    userModels.set(chatId, 'mistral');
    bot.sendMessage(chatId, 'Switched to Mistral mode!');
  });
}
export const bot = new TelegramBot(config.telegramToken, { polling: true });