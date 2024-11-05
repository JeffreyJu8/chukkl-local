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
VALUES (1, 'MrBeast TV', 'Sketch, Stand-Up, Podcast', 
'Join Jimmy and pals for exciting stunts, challenges, esports, and good deeds.', 
'TV-PG');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (2, 'Kids React', 'TV', 
'Kids react to unique situations, ask big questions, and give free advice.', 
'TV-PG');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (3, 'Yes Science!', 'TV',
'Yes Science! features the best creators that are entertaining and educational for all ages.', 
'TV-PG');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (4, 'TrickShotz TV', 'Podcast, Stand-Up, Improve', 
'For fans of Dude Perfect, How Ridiculous, Legendary Shots, and more.', 
'TV-PG');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (5, 'FailFrenzy', 'Sketch, Stand-Up, Podcast', 
'Experience an endless array of fails and hilarious videos with your daily dose of non-stop entertainment.', 
'TV-PG');



INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (6, 'Spicy Meatball', 'Sketch, Stand-Up, Podcast', 
'Welcome to Spicy Meatball, where we serve up cooking adventures perfect for fans of Hot Ones, Mythical Kitchen, and more.', 
'TV-PG');



INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (7, 'iRewatch TV', 'Podcast, Sketch, Stand-Up', 
"For fans of Ned's Declassified School Survival Guide, Wizards of Waverly Place, and more.", 
'TV-14');



INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (8, 'Talk Show Rewind', 'Improv, Sketch', 
"For fans of Conan O'Brien, Jimmy Fallon, Jimmy Kimmel, and more.", 
'TV-14');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (9, 'Gen-Z Talks', 'Improv, Sketch', 
"Candid talk shows hosted by Gen-Z personalities, diving into today's hottest topics and trends.", 
'TV-14');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (10, 'Stand-Up', 'Food & Kitchen, Talk show, Game show', 
"Chukkl's Stand-Up channel showcases comedians from Netflix Is A Joke, Don't Tell Comedy, and more.", 
'TV-14');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (11, 'iReact', 'Food & Kitchen, Talk show, Game show', 
"Internet stars react to internet-famous videos..on the internet.", 
'TV-14');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (12, 'Dating TV', 'Food & Kitchen, Talk show, Game show', 
"A channel about dating and putting relationships to the ultimate test.", 
'TV-14');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (13, 'Smosh TV', 'Blank', 
"Join Smosh & friends for sketches, improv, roasts, musics, and more.", 
'TV-14');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (14, 'Stella!', 'Blank', 
"Stella! brings you the best in theater entertainment, showcasing musicals, plays, improv, and engaging interviews and reviews.", 
'TV-14');



INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (15, 'iPrank TV', 'Blank', 
"Featuring the funniest moments captured through hidden camera gags, stunts, and pranks all day.", 
'TV-14');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (16, 'VlogSquad', 'Blank', 
"For fans of David Dobrik, Jason Nash, Zane & Heath, and more.", 
'TV-14');



INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (17, 'Social Experiments', 'Blank', 
"Strangers share their perspectives on diverse topics and respond to thought-provoking questions.", 
'TV-14');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (18, 'Festival Live', 'Blank', 
"Showcasing the best sets from Coachella, Outside Lands, and more.", 
'TV-14');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (19, 'KT Universe', 'Blank', 
"For fans of the Kill Tony show, Tony Hinchcliffe, Shane Gillis, Kam Patterson, and more.", 
'TV-MA');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (20, 'Unfiltered Buddies', 'Blank', 
"For fans of Bobby Lee, Adam Devine, Theo Von, Bert Kreischer, and more.", 
'TV-MA');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (21, 'Trevor Forever', 'Blank', 
"For fans of Trevor Wallace, Michael Blaustein, Cherdleys, and more.", 
'TV-MA');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (22, "That's Sketch", 'Blank', 
"Chukkl's comedy sketch channel featuring that's a bad idea, Friday Beers, Trevor Wallace, and more.", 
'TV-MA');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (23, "Almost Friday", 'Blank', 
"Just a few guys and girls making sketch comedy and stuff. It's a fun time.", 
'TV-MA');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (24, "Dude Chill", 'Blank', 
"A channel about dudes being dudes and guys being guys. It's pretty chill.", 
'TV-MA');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (25, "Let's Go Golfing", 'Blank', 
"A channel dedicated to golfing, where the game is just as enjoyable as the cold ones cracked open.", 
'TV-MA');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (26, "Bluey", 'Blank', 
"Bluey is lovable and energetic Blue Heeler puppy who lives with her Mum, Dad and little sister Bingo", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (27, "Disney Princess", 'Blank', 
"Enjoy great entertainment including clips, trailers, and YouTube exclusives from your favorite Disney Princesses.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (28, "WB Kids", 'Blank', 
"Watch all of your favorite clips and trailers from iconic brands like Looney Tunes and Scooby-Doo.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (29, "Ryan's World", 'Blank', 
"Ryan loves doing lots of fun things like pretend play, science experiments, music videos, skits, challenges, DIY arts and crafts and more.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (30, "Cocomelon", 'Blank', 
"Engaging families with entertaining and educational content that makes universally-relatable preschool moments fun.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (31, "Sesame Street", 'Blank', 
"A colorful community of monsters, birds, grouches, and humans.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (32, "Smile and Learn", 'Blank', 
"Welcome to Smile and Learn, the best educational platform for kids aged 3-12 years old.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (33, "Nat Geo Kids", 'Blank', 
"Nat Geo Kids makes it fun to explore the world with weird, wild, and wacky videos featuring awesome animals.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (34, "PBS KIDS", 'Blank', 
"PBS KIDS helps children ages 2-8 learn lessons that last a lifetime.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (35, "Learn Bright", 'Blank', 
"Learn Bright is focused on providing educational videos for kids that are fun and engaging.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (36, "Art for Kids Hub", 'Blank', 
"Discover all sorts of awesome art lessons, from drawing to painting, and even some super cool origami.", 
'TV-G');

DELETE FROM Channels WHERE channel_id = 36;


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (37, "Minutephysics", 'Blank', 
"Simply put: cool physics and other sweet science.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (38, "Veritasium", 'Blank', 
"An element of truth - videos about science, education, and anything else I find interesting.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (39, "Little Fox", 'Blank', 
"Welcome to the Little Fox channel of fun animated stories for kids.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (40, "Baby Einstein", 'Blank', 
"Spark your baby’s curiosity through discovering language, exploring the arts, and embarking on adventures alongside wild animals.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (41, "Be Smart", 'Blank', 
"Deep answers to simple questions about science and the rest of the universe.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (42, "Cosmic Kids Yoga", 'Blank', 
"Yoga, mindfulness, and relaxation for kids.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (43, "Animals Animals", 'Blank', 
"Explore the animal kingdom through the fascinating wildlife of the Houston Zoo and stories from Dodo Kids.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (44, "StorylineOnline", 'Blank', 
"Storyline Online streams imaginatively produced videos featuring celebrated actors including reading children’s book.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (45, "Socratic Kids", 'Blank', 
"Smart and fun educational videos for kids.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (46, "Hoffman Music", 'Blank', 
"Students will learn to play piano with a super fun, step-by-step method from pianist and educator Joseph Hoffman.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (47, "Mother Goose Club", 'Blank', 
"Preschool themes through classic nursery rhymes, original songs and colorful videos. Come dance, clap and sing along.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (48, "Kids Songs", 'Blank', 
"Nursery rhymes, original songs, and animated videos are perfect for children between the ages of 1 and 8.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (49, "Danny Go!", 'Blank', 
"“Danny Go!” is a live-action educational children’s show filled with music, movement and silliness.", 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (50, "How Riduculous", 'Blank', 
"How Ridiculous is known for their trick shots and experiments involving dropping objects onto other objects from a great height.", 
'TV-G');






SELECT * FROM Channels;

DELETE FROM Channels;

DELETE FROM Channels WHERE channel_id = 15;

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