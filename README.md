# Phoenix AI Telegram Bot

<img alt="Telegram Bot" src="https://img.shields.io/badge/Telegram-@phoenix__7ai-blue">

Welcome to the **Multimodal AI Telegram Bot** project! This bot integrates multiple AI models to provide rich interactions via text and images on Telegram.

## Table of Contents

- Features
- Prerequisites
- Installation
- Configuration
- Usage
- Commands
- Project Structure
- Contributing
- License

## Features

- **Multi-Model Support**: Switch between AI models like Google Gemini, GPT-3.5, LLaMA 2, and Mistral AI.
- **Multimodal Interaction**: Send text or images, and the bot will analyze and respond accordingly.
- **Contextual Conversations**: Maintains conversation history for contextual interactions.
- **Edited Message Handling**: Responds to edited messages and updates previous bot messages.
- **Group Chat Friendly**: Works seamlessly in both private and group chats.

## Prerequisites

- **Node.js**: Version 14 or higher
- **Telegram Bot Token**: Obtain from [@BotFather](https://t.me/BotFather)
- **API Keys**: Depending on the models you plan to use:
  - OpenAI API Key
  - Google Gemini API Key
  - NVIDIA API Key
  - Mistral AI API Key
  - Hugging Face Token

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-username/multimodal-ai-telegram-bot.git
   cd multimodal-ai-telegram-bot
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

## Configuration

1. **Create a 

.env

 File**

   Create a 

.env

 file in the root directory and add your API keys:

   ```env
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   OPENAI_API_KEY=your-openai-api-key
   GEMINI_API_KEY=your-gemini-api-key
   NVIDIA_API_KEY=your-nvidia-api-key
   MISTRAL_API_KEY=your-mistral-api-key
   HUGGINGFACE_TOKEN=your-huggingface-token
   ```

2. **Configure 

config.js

**

   The configuration is handled by the 

config.js

 file, which reads from the 

.env

 file.

## Usage

### Running the Bot

- **Development Mode**

  ```bash
  npm run dev
  ```

- **Production Mode**

  ```bash
  npm start
  ```
### Accessing the Bot
You can interact with the bot on Telegram:

**Bot Link:** [Phoenix Ai](t.me/phoenix_7ai)

### Interacting with the Bot

- **Private Chat**: Start a conversation with your bot on Telegram.
- **Group Chat**: Add the bot to a group. Use commands and mention the bot in messages to interact.

## Commands

- **General Commands**

  - `/start` - Start the bot and display the welcome message.
  - `/help` - Display help information.
  - `/clear` - Clear the conversation history.

- **Model Selection Commands**

  - `/gemini` - Switch to Google Gemini model.
  - `/gpt` - Switch to GPT-3.5 model.
  - `/llama` - Switch to LLaMA 2 model.
  - `/mistral` - Switch to Mistral AI model.

- **Image Generation**

  - `/imagine Your prompt here` - Generate an image based on the prompt.

## Project Structure

```
multimodal-ai-telegram-bot/
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── src/
│   ├── bot.js
│   ├── config.js
│   ├── services/
│   │   ├── gemini.js
│   │   ├── llama.js
│   │   ├── mistral.js
│   │   ├── openai.js
│   │   └── stablediffusion.js
│   └── utils/
│       ├── botmenu.js
│       ├── history.js
│       ├── input_constraints.js
│       └── output_message_format.js
```

- **`src/bot.js`**: Main bot logic and message handlers.
- **`src/config.js`**: Configuration file handling environment variables.
- [`src/services`](src/services/): Contains API integration for different AI models.
- [`src/utils`](src/utils/): Utility functions for command setup, conversation history, message formatting, and input constraints.


## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the Repository**
2. **Create a Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Commit Your Changes**

   ```bash
   git commit -m "Add your message"
   ```

4. **Push to the Branch**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**

## License

This project is licensed under the MIT License.

---

Feel free to open an issue or pull request for any improvements or suggestions.
