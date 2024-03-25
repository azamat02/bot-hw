// database.js

import pg from 'pg';
const { Pool } = pg;
import { config } from "dotenv";

config(); // Ensure environment variables are loaded

const dbPool = new Pool({ connectionString: process.env.DB_URL });

dbPool.connect()
    .then(() => console.log("Connected successfully to the database"))
    .catch((err) => console.error("Connection error", err));

// Function to register a user with their chatId and nickname
export const registerUser = async (chatId, nickname, fullName, goals) => {
    await dbPool.query('INSERT INTO users (chat_id, full_name, nickname, goals) VALUES ($1, $2, $3, $4) ON CONFLICT (chat_id) DO NOTHING;', [chatId, fullName, nickname, goals]);
};

// Function to update a user's full name
export const updateFullName = async (chatId, fullName) => {
    await dbPool.query('UPDATE users SET full_name = $1 WHERE chat_id = $2;', [fullName, chatId]);
};

// Function to save homework submission
export const saveHomeworkSubmission = async (chatId, homeworkText) => {
    await dbPool.query('INSERT INTO homework_submissions (chat_id, text, submission_date) VALUES ($1, $2, NOW());', [chatId, homeworkText]);
};

// Function to get users who haven't submitted homework
export const getUsersWhoDidNotSubmitHomework = async () => {
    const { rows } = await dbPool.query('SELECT chat_id FROM users WHERE chat_id NOT IN (SELECT chat_id FROM homework_submissions WHERE submission_date = CURRENT_DATE);');
    return rows;
};

export const getHomeworkSubmissions = async () => {
    const { rows } = await dbPool.query('SELECT u.full_name, u.nickname, u.goals, hw.text, hw.submission_date FROM homework_submissions as hw inner join users as u on hw.chat_id=u.chat_id;');
    return rows; // rows is an array of objects with submission_date and text properties
};
