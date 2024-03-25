import { config } from 'dotenv';
import { Telegraf, Markup, Scenes, session } from 'telegraf';
import cron from 'node-cron';
import fs, {chmod} from 'fs';
import { registerUser, saveHomeworkSubmission, getUsersWhoDidNotSubmitHomework, getHomeworkSubmissions } from './database.js';
import { createReadStream, writeFileSync } from 'fs';
import excelJs from 'exceljs';
import {channelPost} from "telegraf/filters"; // Make sure to install exceljs package

const { Workbook } = excelJs

// Define the admin username(s)
// const ADMINS = ['dsgnmaster31']; // Replace with actual admin username
// const ADMINS = ['Daniya_yess', 'dsgnmaster31']; // Replace with actual admin username
const ADMINS = ['dsgnmaster31']; // Replace with actual admin username

// Sticker URLs
const STICKER_URLS = {
    greeting: 'https://data.chpic.su/stickers/t/tonevskayaaa/tonevskayaaa_002.webp',
    homeworkReceived: 'https://data.chpic.su/stickers/t/tonevskayaaa/tonevskayaaa_003.webp',
    adminGreeting: 'https://data.chpic.su/stickers/t/tonevskayaaa/tonevskayaaa_013.webp',
    dontSendHW: 'https://data.chpic.su/stickers/t/tonevskayaaa/tonevskayaaa_012.webp',
};

config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Define your scenes
const greeterScene = new Scenes.BaseScene('greeter');
greeterScene.enter(async (ctx) => {
    const chatId = ctx.chat.id;
    const nickname = ctx.from.username;
    // const videoStream = fs.createReadStream('/app/hello.mp4');
    // await ctx.replyWithVideo({ source: videoStream });
    await ctx.reply('Привет, дорогая! Этот бот поможет тебе развить дисциплину по отношению к своим целям.\n' +
        '\n' +
        'Чтобы продолжить работу с этим ботом, тебе нужно поставить цели и поделить их на конкретные действия, как это показано в 5-м уроке первого блока курса Легкость. Пропиши цели по этой методике и возвращайся в этот бот. \n' +
        '\n' +
        'Что нужно делать дальше? В этот чат тебе необходимо каждый день писать отчет о том, что СЕГОДНЯ ты сделала на пути к своим целям. \n' +
        '\n' +
        'Первым делом, жми на кнопку «список целей» и отправь свой список целей в этот бот. \n' +
        '\n' +
        'Если ты забудешь отправить проделанные за день действия на пути к цели, этот бот будет тебе напоминать. \n' +
        '\n' +
        'Начнем? 🔥');
    await ctx.reply('Пожалуйста, введите ваше полное имя.');
    ctx.session.state = 'awaiting_full_name';
});

greeterScene.on('text', async (ctx) => {
    if (ctx.session.state === 'awaiting_full_name') {
        ctx.session.fullName = ctx.message.text;
        await ctx.replyWithSticker(STICKER_URLS.greeting);
        await ctx.reply('Теперь введи свой список целей 😍');
        ctx.session.state = 'awaiting_goals'; // Update state to await goals
    } else if (ctx.session.state === 'awaiting_goals') {
        const goals = ctx.message.text;
        await registerUser(ctx.chat.id, ctx.from.username, ctx.session.fullName, goals);
        // Here you might want to store the goals similarly to how you handle the full name.
        await ctx.reply('Замечательно! Теперь, напиши, какие действия сегодня ты сделала, чтобы приблизится к их исполнению?', Markup.inlineKeyboard([
            Markup.button.callback('Отправить действия', 'send_homework')
        ]));
        await ctx.reply('Если в какой-то день ты забудешь отправить отчет, то этот бот-помощник тебе напомнит ☺️');
        return ctx.scene.leave(); // User has provided all necessary information, leave the scene
    }
});

const homeworkScene = new Scenes.BaseScene('homework');
homeworkScene.enter((ctx) => ctx.reply('Пожалуйста, отправьте ваше домашнее задание.'));
homeworkScene.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const homeworkText = ctx.message.text;
    await saveHomeworkSubmission(chatId, homeworkText);
    // Send homework received sticker
    await ctx.replyWithSticker(STICKER_URLS.homeworkReceived);
    await ctx.reply('Ваше домашнее задание получено в текстовом формате. Спасибо!');
    return ctx.scene.leave();
});

// Create stage
const stage = new Scenes.Stage([greeterScene, homeworkScene]);
bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => {
    if (ADMINS.includes(ctx.from.username)) {
        // If the user is an admin, send the admin greeting sticker
        await ctx.replyWithSticker(STICKER_URLS.adminGreeting);
        // Add a button for admin to get homework submissions
        await ctx.reply(`Добрый день ${ctx.from.username}! У вас есть права админа`)
        await ctx.reply('Нажмите ниже, чтобы получить отправленные домашние задания.', Markup.inlineKeyboard([
            Markup.button.callback('Получить файл домашних заданий', 'get_homeworks')
        ]));
    } else {
        await ctx.scene.enter('greeter')
    }
});

bot.action('send_homework', (ctx) => {
    ctx.answerCbQuery();
    ctx.scene.enter('homework');
});

bot.action('get_homeworks', async (ctx) => {
    if (!ADMINS.includes(ctx.from.username)) {
        await ctx.reply('У вас нет прав на выполнение этого действия.');
        return;
    }

    // Query the database to get homework submissions
    const homeworkSubmissions = await getHomeworkSubmissions(); // Implement this function in your database logic

    // Create an Excel workbook
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('ДЗ всех участников');

    // Add a header row
    worksheet.addRow(['ФИО', 'Ник телеграмм', 'Текст ДЗ', 'Дата отправки', 'Цели участника']);

    // Add data rows
    homeworkSubmissions.forEach(submission => {
        worksheet.addRow([submission.full_name, submission.nickname, submission.text, submission.submission_date, submission.goals]);
    });

    // Write to a temporary file
    const filePath = `/app/ДЗ_всех_участников.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    // Send the Excel file to the admin
    await ctx.replyWithDocument({ source: filePath });
});

console.log(new Date())

cron.schedule('00 21 * * *', async () => {
    try {
        const rows = await getUsersWhoDidNotSubmitHomework();
        for (const row of rows) {
            await bot.telegram.sendSticker(row.chat_id, STICKER_URLS.dontSendHW);
            await bot.telegram.sendMessage(row.chat_id, 'Вы не отправили домашнее задание сегодня. Вы можете отправить его сейчас.', Markup.inlineKeyboard([
                Markup.button.callback('Отправить домашнее задание', 'send_homework')
            ]));
        }
    } catch (error) {
        console.error('Error executing cron job', error);
    }
});

bot.launch()