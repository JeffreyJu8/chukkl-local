-- CREATE TABLE Channels (
--     channel_id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     tags VARCHAR(255),
--     bio TEXT,
--     maturity_rating VARCHAR(50)
-- );


-- CREATE TABLE Categories (
--     category_id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL
-- );


CREATE TABLE Videos (
    video_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    category_id INTEGER REFERENCES Categories(category_id),
    channel_id INTEGER REFERENCES Channels(channel_id),
    description TEXT,
    people VARCHAR(255)
);



CREATE TABLE Schedules (
    schedule_id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES Videos(video_id),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    channel_id INTEGER REFERENCES Channels(channel_id),
    Days VARCHAR(50) NOT NULL
);


-- DROP TABLE "Channels";
-- DROP TABLE "Categories";
-- DROP TABLE schedules;
-- DROP TABLE videos;