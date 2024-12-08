export class ConversationManager {
    constructor() {
      this.conversations = new Map();
    }
  
    get(chatId) {
      return this.conversations.get(chatId) || [];
    }
  
    add(chatId, history) {
      
      
      this.conversations.set(chatId, history);
    }
  
    clear(chatId) {
      this.conversations.delete(chatId);
    }
    deleteMessageFromHistory(chatId, messageId) {
      const history = this.get(chatId);

      if (!history) {
          console.error(`No conversation history found for chatId: ${chatId}`);
          return;
      }

      // Find the index of the message to delete
      const messageIndex = history.findIndex(
          (content) => content.message_id === messageId || (content.message_ids && content.message_ids.includes(messageId))
      );

      if (messageIndex !== -1) {
          // Remove the message from the history
          history.splice(messageIndex, 1);
          this.conversations.set(chatId, history);

      } else {
          console.error(`Message with id ${messageId} not found in history for chatId: ${chatId}`);
      }
  }
  }