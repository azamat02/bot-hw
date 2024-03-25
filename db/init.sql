CREATE TABLE IF NOT EXISTS users (
    chat_id BIGINT PRIMARY KEY,
    full_name TEXT,
    nickname TEXT,
    goals TEXT
);

CREATE TABLE IF NOT EXISTS homework_submissions (
    id SERIAL PRIMARY KEY,
    chat_id BIGINT,
    text TEXT,
    submission_date TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);
