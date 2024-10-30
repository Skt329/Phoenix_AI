export function setupCommands(bot, conversationManager, userModels) {
    // Start command
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
  
    // Clear command
    bot.onText(/\/clear/, (msg) => {
      const chatId = msg.chat.id;
      conversationManager.clear(chatId);
      bot.sendMessage(chatId, 'Conversation history cleared!');
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
  }