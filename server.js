const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();

const token = 'YOUR_TELEGRAM_BOT_TOKEN';
const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome to Number Connect Game! Click the button below to start playing:', {
        reply_markup: {
            inline_keyboard: [[
                {
                    text: 'Play Game',
                    web_app: {url: 'https://your-game-url.com'}
                }
            ]]
        }
    });
});

app.use(express.static('public')); // Serve your game files

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});