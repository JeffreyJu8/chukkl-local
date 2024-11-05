INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (1, 'Ivan the Inspector', 'Sketch, Stand-Up, Podcast', 
'Join Ivan the Inspector as he sparks curiosity in kids, teaching them real-life skills, numbers, colors, vocabulary, and positive virtues through fun activities, dancing, and singing.', 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (2, 'Miss Linky', 'Sketch, Stand-Up, Podcast', 
'Miss Linky is a husband and wife duo specializing in educational content that blends music, movement, and popular themes for educators, parents, and guardians.', 
'TV-PG');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (3, 'Art With Ashley', 'Sketch, Stand-Up, Podcast', 
'Ms. Ashley shares fun drawing lessons to help kids create art, build confidence, and improve focus. Check out www.BrainBreakFun.com as well!', 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (4, 'Go Garbage', 'Sketch, Stand-Up, Podcast', 
'Welcome to Go Garbage, where you will find exciting garbage truck adventures, fails, and toy showcases for fans of all ages.', 
'TV-G');


INSERT INTO Channels (channel_id, name, tags, bio, maturity_rating)
VALUES (5, 'Cowboy Jack', 'Sketch, Stand-Up, Podcast', 
'Cowboy Jack is an educational and fun channel for kids that takes them on adventures to explore this amazing world we call home.', 
'TV-G');


UPDATE Channels
SET bio = 'Miss Linky is a husband and wife duo specializing in educational content that blends music, movement, and popular themes for educators, parents, and guardians.'
WHERE channel_id = 2;

SELECT * FROM channels;


SELECT * FROM channels;
-- DELETE FROM channels;
