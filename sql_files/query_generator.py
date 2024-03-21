def generate_sql_insert(video_id, title, url, start_time, end_time, category_id, channel_id, description, cast):
    # Extract video_id from the provided YouTube URL
    video_id_extracted = url.split('/')[-1].split('?v=')[-1].split('&')[0]
    
    print(video_id_extracted)
    
    # Construct the embedded URL
    embedded_url = f"https://www.youtube.com/embed/{video_id_extracted}?start={start_time}&autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=0"
    if end_time is not None:
        embedded_url += f"&end={end_time}"
    
    # Escape single quotes in SQL string values
    title = title.replace("'", "''")
    description = description.replace("'", "''")
    cast = cast.replace("'", "''")
    
    # Construct the SQL command
    sql_command = f"""INSERT INTO Videos (video_id, title, url, category_id, channel_id, description, cast)
VALUES ({video_id}, '{title}', 
'{embedded_url}', 
{category_id}, {channel_id},
'{description}',
'{cast}');"""

    return sql_command


#usage:
video_id = 1
title = "Trevor Tours | Pt. 1"
url_base = "https://www.youtube.com/watch?v=Dat_tbr_Eco"
start_time = 0  # Start time in seconds
end_time = None  # End time in seconds, None if there isn't one
category_id = 1
channel_id = 1
description = "Trevor Michael Wallace is an American comedian, writer, and actor from Camarillo, California. Wallace is a regular on the YouTube channel All Def Digital and has been featured on BuzzFeed, UNILAD, Funny or Die, Super Deluxe, Fusion TV, WorldStarHipHop, and MTV2."
cast = "Trevor Wallace"

sql_command = generate_sql_insert(video_id, title, url_base, start_time, end_time, category_id, channel_id, description, cast)
print(sql_command)
