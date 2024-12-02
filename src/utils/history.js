export class ConversationManager {
    constructor() {
      this.conversations = new Map();
    }
  
    get(chatId) {
      return this.conversations.get(chatId) || [];
    }
  
    add(chatId, message) {
      let history = this.get(chatId);
      history.push(message);
      
      if (history.length > 50) {
        history = history.slice(history.length - 50);
      }
      
      this.conversations.set(chatId, history);
    }
  
    clear(chatId) {
      this.conversations.delete(chatId);
    }
  }