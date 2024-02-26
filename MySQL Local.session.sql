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
VALUES (2, 'Standup');

INSERT INTO Categories (category_id, name)
VALUES (3, 'Sketch');


INSERT INTO Categories (category_id, name)
VALUES (4, 'Talk Show');

SELECT * FROM Categories;


DELETE FROM Categories WHERE category_id = 1;


---------------------------------------------------------------------------------------------------------------

-- ALTER TABLE Channels
-- ADD COLUMN bio TEXT,
-- ADD COLUMN maturity_rating VARCHAR(255);



INSERT INTO Channels (channel_id, name, category_id, bio, maturity_rating)
VALUES (1, 'Kill Tony', 1, 
'The weekly live show recorded live, with your hosts Tony Hinchcliffe and Brian Redban.', 
'TV-MA');

INSERT INTO Channels (channel_id, name, category_id, bio, maturity_rating)
VALUES (2, "Something's burning ", 1,
'Comedian Bert Kreischer hosts a cooking show with guests from the comedy world.', 
'TV-14');

INSERT INTO Channels (channel_id, name, category_id, bio, maturity_rating)
VALUES (3, "Dry Bar Comedy ", 2, 
'Stand up comedy for everyone in the family.', 
'TV-PG');

INSERT INTO Channels (channel_id, name, category_id, bio, maturity_rating)
VALUES (4, "Don't Tell Comedy ", 2,
'DTC creates one of a kind comedy experiences featuring the best of the next generation of comics.', 
'TV-14');

INSERT INTO Channels (channel_id, name, category_id, bio, maturity_rating)
VALUES (5, "Stand-Up On The Spot", 2,
'Comedians create Stand-Up On The Spot off audience suggestions. No material.', 
'NR (Not Rated)');

INSERT INTO Channels (channel_id, name, category_id, bio, maturity_rating)
VALUES (6, "Almost Friday ", 1,
'Coming-of-age, relatable humor. And those funny Friday Beers guys.', 
'TV-14');

INSERT INTO Channels (channel_id, name, category_id, bio, maturity_rating)
VALUES (7, "Stiff Socks ", 1,
'Stand up comedians Trevor Wallace and Michael Blaustein go do weird stuff, and then talk about how weird stuff was.', 
'TV-MA');

SELECT * FROM Channels;

DELETE FROM channels WHERE channel_id = 5;

---------------------------------------------------------------------------------------------------------------

INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
VALUES (1, 1, '9:34:00', '9:50:00', 1);

INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
VALUES (2, 2, '16:22:00', '16:50:00', 2);

INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
VALUES (3, 3, '15:08:00', '15:30:00', 3);

INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
VALUES (4, 4, '15:08:00', '15:30:00', 4);

INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
VALUES (5, 5, '15:08:00', '15:30:00', 5);

INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id)
VALUES (6, 6, '15:08:00', '15:30:00', 6);

SELECT * FROM Schedules;


DELETE FROM Schedules WHERE schedule_id = 1;


---------------------------------------------------------------------------------------------------------------

-- ALTER TABLE Videos
-- ADD COLUMN short_title VARCHAR(255),
-- ADD COLUMN description TEXT;


INSERT INTO Videos (video_id, title, short_title, url, category_id, channel_id, description)
VALUES (6, "High Value Men - Almost Friday Podcast EP #46 W/ Cody Ko", 
'AFM - Ep 46',
"https://www.youtube.com/embed/rqhhOcT48wU?si=jf4HAwO5bx646_B3&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 1, 6,
"Cody Ko is having a baby soon, so it's only fair that we have him on the pod to give him some fatherly advice. We discuss the making of his new single, 'BOP-IT', what it takes to be a high value man, and who in his marriage is going to play Good Cop and Bad Cop.");

INSERT INTO Videos (video_id, title, short_title, url, category_id, channel_id, description)
VALUES (5, "Stand-Up On The Spot Skankfest Brendan Schaub Zac Amico Yamaneika, Tallent, Feinstein, Watkins Ep 34", 
'SOTS - Ep 34',
"https://www.youtube.com/embed/2bjRbmVs4Kg?si=3iaW8s_9hFt403tK&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 2, 5,
"Cody Ko is having a baby soon, so it's only fair that we have him on the pod to give him some fatherly advice. We discuss the making of his new single, 'BOP-IT', what it takes to be a high value man, and who in his marriage is going to play Good Cop and Bad Cop.");

INSERT INTO Videos (video_id, title, short_title, url, category_id, channel_id, description)
VALUES (4, "Texas Vs. California | Ralph Barbosa", 
'Ralph Barbosa',
"https://www.youtube.com/embed/QBzBaOl8k8A?si=bv7wBURxLo2PlSS0&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 2, 4,
'Ralph Barbosa talks about the differences between California and Texas, why he hates social media and the upsides to being friends with drug dealers.');

INSERT INTO Videos (video_id, title, short_title, url, category_id, channel_id, description)
VALUES (3, "Boomer Triggers Gen-Z Snowflakes. Brad Upton", 
'Brad Upton',
"https://www.youtube.com/embed/j1Zg2S2-heY?si=URVC5paqZfKvql6B&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 2, 3,
'Nothing triggers a Gen-Z snowflakes like a boomer with a lot to say, and trust us, Brad Upton has a lot to say!.');

INSERT INTO Videos (video_id, title, short_title, url, category_id, channel_id, description)
VALUES (2, "Something’s Burning S2 E19: I’m Making Irish-Inspired Eats for Mike Gibbons and Greg Fitzsimmons", 
'S2 E19',
"https://www.youtube.com/embed/wyRh-CksbWI?si=O8zoDTn-fuV2zqMK&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 1, 2,
'Podcast partners and long-time friends Mike Gibbons and Greg Fitzsimmons stop by so I can make them some Irish-inspired Sandwiches with a side of potatoes.  We’re trying a Reuben AND a Rachel – and talking old-school comedians, The Cabin, and how clean you really are after a shower.');

INSERT INTO Videos (video_id, title, short_title, url, category_id, channel_id, description)
VALUES (1, "KT #625 - POST MALONE + JOE ROGAN + KURT METZGER",
'KT #625',
 "https://www.youtube.com/embed/NmPPjcJi5E0?si=ZuNsQ1fYLLwdRSOb&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0", 1, 1,
 'Post Malone, Joe Rogan, Kurt Metzger, Kam Patterson, Paul Deemer, D Madness, Michael A. Gonzales, Hans Kim, William Montgomery, Jon Deas, Matthew Muehling, Jules Durel, Joe White, Kristie Nova, Yoni, Tony Hinchcliffe, Brian Redban – 08/07/2023');


SELECT * FROM Videos;


DELETE FROM Videos WHERE video_id = 5;
