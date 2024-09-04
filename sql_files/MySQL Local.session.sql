SELECT @@global.time_zone;
SELECT @@session.time_zone;

-- SET time_zone = '+00:00';
-- SET GLOBAL time_zone = '+00:00';

SELECT * FROM Schedules WHERE channel_id = 1 ORDER BY start_time;


CREATE TABLE Categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE Channels (
    channel_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INT REFERENCES Categories(category_id)
    -- link to imgage of channel
);

CREATE TABLE Videos (
    video_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(8000) NOT NULL,
    category_id INT REFERENCES Categories(category_id),
    channel_id INT REFERENCES Channels(channel_id)
);

CREATE TABLE Schedules (
    schedule_id SERIAL PRIMARY KEY,
    video_id INT REFERENCES Videos(video_id),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    channel_id INT REFERENCES Channels(channel_id),
    CONSTRAINT check_time CHECK (start_time < end_time)  
);


---------------------------------------------------------------------------------------------------------------


INSERT INTO Categories (category_id, name)
VALUES (1, 'Podcast');

INSERT INTO Categories (category_id, name)
VALUES (2, 'Stand-Up');

INSERT INTO Categories (category_id, name)
VALUES (3, 'Sketch');


INSERT INTO Categories (category_id, name)
VALUES (4, 'Talk Show');

SELECT * FROM Categories;


DELETE FROM Categories WHERE category_id = 2;


---------------------------------------------------------------------------------------------------------------

-- ALTER TABLE Channels
-- DROP COLUMN Days;

INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (1, 'Trevor Forever', 'Sketch, Stand-Up, Podcast', 
'Watch Trevor Wallace star in his original sketches, #1 podcast alongside Michael Blaustein, and more.', 
'TV-MA');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (2, 'This Past Weekend', 'Podcast, Improv', 
'Theo discusses what happened this past weekend. And sometimes what happened on other days.', 
'TV-MA');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (3, 'This is Important', 'Podcast', 
'Co-creators and stars of Workaholics dive deep into serious discussions about the most important topics facing our society today.', 
'TV-MA');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (4, 'Bad Friends', 'Podcast, Stand-Up, Improve', 
'Bad Friends showcases the dynamic and sometimes contentious relationship between Lee and Santino.', 
'TV-MA');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (5, 'Kill Tony', 'Sketch, Stand-Up, Podcast', 
'A live podcast taped all over the world. Featuring Tony Hinchcliffe with huge celebrity guests.', 
'TV-MA');



INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (6, 'Almost  Friday', 'Sketch, Stand-Up, Podcast', 
'Almost Friday Media presents coming-of-age, relatable humor. Oh yeah, and those Friday Beers guys.', 
'TV-MA');



INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (7, 'Cody Ko Reacts', 'Podcast, Sketch, Stand-Up', 
'Cody reacts to a multitude of absurdities, ranging from cringe moments to spotting a fake rapper in the mix.', 
'TV-14');



INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (8, 'Stand-Up', 'Improv, Sketch', 
'A Chukkl original channel featuring standup from all over the world.', 
'TV-14');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (9, 'Try Not To Laugh', 'Improv, Sketch', 
'The cast of Smosh attempts to make one another laugh in a game of improv. Participation is encouraged.', 
'TV-14');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (10, 'Hot Ones', 'Food & Kitchen, Talk show, Game show', 
'Sean Evans asks his celebrities guests questions while they attempt to complete rounds of chicken wings coated in spicy hot sauce.', 
'TV-PG');


SELECT * FROM Channels;

DELETE FROM channels WHERE channel_id = 10;

DELETE FROM channels WHERE channel_id BETWEEN 1 AND 12;

---------------------------------------------------------------------------------------------------------------

-- ALTER TABLE Schedules
-- ADD COLUMN Days TEXT;


INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
VALUES (1, 1, '01:15:00', '01:16:00', 1);

INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
VALUES (2, 2, '01:16:00', '01:17:00', 1);

INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
VALUES (3, 3, '01:23:00', '01:24:00', 1);

INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
VALUES (4, 4, '01:24:00', '01:25:00', 1);

INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
VALUES (5, 5, '01:25:00', '01:26:00', 1);

-- INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
-- VALUES (1, 1, '17:55:00', '17:56:00', 1);

-- INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
-- VALUES (7, 3, '17:56:00', '17:57:00', 1);

-- INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
-- VALUES (8, 3, '20:42:00', '20:43:00', 1);

-- INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
-- VALUES (9, 4, '20:43:00', '20:44:00', 1);

-- INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
-- VALUES (2, 2, '16:22:00', '16:50:00', 2);

-- INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
-- VALUES (3, 3, '15:08:00', '15:30:00', 3);

-- INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
-- VALUES (4, 4, '15:08:00', '15:30:00', 4);

-- INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
-- VALUES (5, 5, '15:08:00', '15:30:00', 5);

-- INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
-- VALUES (6, 6, '15:08:00', '15:30:00', 6);

SELECT * FROM Schedules;


DELETE FROM Schedules WHERE schedule_id = 1;
DELETE FROM Schedules WHERE schedule_id = 2;
DELETE FROM Schedules WHERE schedule_id = 3;
DELETE FROM Schedules WHERE schedule_id = 4;
DELETE FROM Schedules WHERE schedule_id = 5;



---------------------------------------------------------------------------------------------------------------

--ALTER TABLE Videos
-- ADD COLUMN short_title VARCHAR(255),
-- ADD COLUMN description TEXT
-- ADD COLUMN cast TEXT;

INSERT INTO Videos (video_id, title, url, category_id, channel_id, description)
VALUES (1, "Stiff Socks | Ep. 223", 
"https://www.youtube.com/embed/Hh6jfKQBFhI?si=QOdNwzIqiUvTksvG&start=807&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 
1, 1,
"The boys are joined by Hannah Berner and Paige DeSorbo of Giggly Squad to illuminate some important truths:  like why girls give pretend rimjobs, why every dude is hard on a flight, and how it’s impossible to watch porn with your girlfriend. They also help listeners with approaching their fetishes and debate whether it’s ok to JO to your friends’ pictures.");


INSERT INTO Videos (video_id, title, url, category_id, channel_id, description)
VALUES (2, "Stiff Socks | Ep. 223", 
"https://www.youtube.com/embed/Hh6jfKQBFhI?si=4WahJQV3b5m65Xru&start=2425&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 
1, 1,
"The boys are joined by Hannah Berner and Paige DeSorbo of Giggly Squad to illuminate some important truths:  like why girls give pretend rimjobs, why every dude is hard on a flight, and how it’s impossible to watch porn with your girlfriend. They also help listeners with approaching their fetishes and debate whether it’s ok to JO to your friends’ pictures.");


INSERT INTO Videos (video_id, title, url, category_id, channel_id, description)
VALUES (3, "Stiff Socks | Ep. 213", 
"https://www.youtube.com/embed/59sTiIa93vA?si=4ykRlcZl180hg8ZF&start=2101&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 
1, 1,
"The boys are joined by comedian Hannah Berner to riff about how everything’s an ick, the perils of shower anal, and why every guy should be eating more fish. They also help a listener with the rules of porn in relationships and review each other’s Wikifeet pages.");


INSERT INTO Videos (video_id, title, url, category_id, channel_id, description)
VALUES (4, "Stiff Socks | Ep. 187", 
"https://www.youtube.com/embed/4HxEPHTaTuM?si=it-csWvBzgwgwoYV&start=3326&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 
1, 1,
"The boys are joined by comedian Whitney Cummings to talk about the childhood trauma that makes you funnier, modern masculinity, and why incest smells so bad. They also help a listener break some bad news to his brother and learn why Whitney is saving drugs for the nursing home. ");


INSERT INTO Videos (video_id, title, url, category_id, channel_id, description)
VALUES (5, "Stiff Socks | Ep. 186", 
"https://www.youtube.com/embed/QEe2OpawQv4?si=E_jVzjJeUJaO9PBS&start=0&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 
1, 1,
"Episode 186");



-- INSERT INTO Videos (video_id, title, short_title, url, category_id, channel_id, description)
-- VALUES (5, "Stand-Up On The Spot Skankfest Brendan Schaub Zac Amico Yamaneika, Tallent, Feinstein, Watkins Ep 34", 
-- 'SOTS - Ep 34',
-- "https://www.youtube.com/embed/2bjRbmVs4Kg?si=3iaW8s_9hFt403tK&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 2, 5,
-- "Cody Ko is having a baby soon, so it's only fair that we have him on the pod to give him some fatherly advice. We discuss the making of his new single, 'BOP-IT', what it takes to be a high value man, and who in his marriage is going to play Good Cop and Bad Cop.");

-- INSERT INTO Videos (video_id, title, short_title, url, category_id, channel_id, description)
-- VALUES (4, "Texas Vs. California | Ralph Barbosa", 
-- 'Ralph Barbosa',
-- "https://www.youtube.com/embed/QBzBaOl8k8A?si=bv7wBURxLo2PlSS0&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 2, 4,
-- 'Ralph Barbosa talks about the differences between California and Texas, why he hates social media and the upsides to being friends with drug dealers.');

-- INSERT INTO Videos (video_id, title, short_title, url, category_id, channel_id, description)
-- VALUES (3, "Boomer Triggers Gen-Z Snowflakes. Brad Upton", 
-- 'Brad Upton',
-- "https://www.youtube.com/embed/j1Zg2S2-heY?si=URVC5paqZfKvql6B&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 2, 3,
-- 'Nothing triggers a Gen-Z snowflakes like a boomer with a lot to say, and trust us, Brad Upton has a lot to say!.');

-- INSERT INTO Videos (video_id, title, short_title, url, category_id, channel_id, description)
-- VALUES (2, "Something’s Burning S2 E19: I’m Making Irish-Inspired Eats for Mike Gibbons and Greg Fitzsimmons", 
-- 'S2 E19',
-- "https://www.youtube.com/embed/wyRh-CksbWI?si=O8zoDTn-fuV2zqMK&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 1, 2,
-- 'Podcast partners and long-time friends Mike Gibbons and Greg Fitzsimmons stop by so I can make them some Irish-inspired Sandwiches with a side of potatoes.  We’re trying a Reuben AND a Rachel – and talking old-school comedians, The Cabin, and how clean you really are after a shower.');

-- INSERT INTO Videos (video_id, title, short_title, url, category_id, channel_id, description)
-- VALUES (1, "KT #625 - POST MALONE + JOE ROGAN + KURT METZGER",
-- 'KT #625',
--  "https://www.youtube.com/embed/NmPPjcJi5E0?si=ZuNsQ1fYLLwdRSOb&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 1, 1,
--  'Post Malone, Joe Rogan, Kurt Metzger, Kam Patterson, Paul Deemer, D Madness, Michael A. Gonzales, Hans Kim, William Montgomery, Jon Deas, Matthew Muehling, Jules Durel, Joe White, Kristie Nova, Yoni, Tony Hinchcliffe, Brian Redban – 08/07/2023');


SELECT * FROM Videos;


DELETE FROM Videos WHERE video_id = 1;


SELECT * FROM Categories FOR JSON AUTO;


TRUNCATE TABLE Categories;
TRUNCATE TABLE Videos;
TRUNCATE TABLE Schedules;

SELECT * FROM Categories;

Select * FROM Schedules;
