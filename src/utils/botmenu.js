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
      '/gemini - Switch to Gemini AI model\n' +
      '/mistral - Switch to Mistral AI model\n' +
      '/imagine -Generate images using stable defusion 3.5\n' +
      '/clear - Clear conversation history\n' +
      '/delete - Delete a specific message from chat context.\n' +
      '/owner - Get Developer info and Contact.\n' +
      'You can send me text, documents or images to analyze!\n'+
      'You can also switch between different AI models using the commands:/mistral or /gemini\n' +
      'Default model is Gemini\n'
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
    `• LinkedIn: [Saurabh Tiwari](https://www.linkedin.com/in/saurabht0)\n` +
    `• GitHub: [SaurabhTiwari](https://github.com/Skt329)\n` +
    `• Email: st108113@gmail.com\n\n` +
    `🤖 *Bot Support:*\n` +
    `• Telegram: [Support Channel](https://t.me/+hrjs8zQHC3UyNDI1)\n` +
    `💡 *Contributions are welcome!*\n` +
    `Check out the project on [GitHub](https://github.com/Skt329/Phoenix_AI)`;
    bot.sendMessage(chatId, ownerInfo, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  });
  // Model selection commands
  bot.onText(/\/gemini/, (msg) => {
    const chatId = msg.chat.id;
    userModels.set(chatId, 'gemini');
    bot.sendMessage(chatId, 'Switched to Gemini mode! ');
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

  // Delete command
  bot.onText(/\/delete/, async (msg) => {
    const chatId = msg.chat.id;
    const replyToMessage = msg.reply_to_message;

    if (replyToMessage) {
      const messageIdToDelete = replyToMessage.message_id;

      // Delete the message from the conversation history
      conversationManager.deleteMessageFromHistory(chatId, messageIdToDelete);

      // Delete the message from the chat
      await bot.deleteMessage(chatId, messageIdToDelete);
      // Delete the /delete command message itself
      await bot.deleteMessage(chatId, msg.message_id);
      console.log(`Message deleted: ${messageIdToDelete}`);
    } else {
      await bot.sendMessage(chatId, 'Please reply to the message you want to delete with /delete.');
    }
  });
}
export const bot = new TelegramBot(config.telegramToken, { polling: true });