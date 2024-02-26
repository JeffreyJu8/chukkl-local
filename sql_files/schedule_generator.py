# Python script to generate the SQL insert statements for the schedule

def generate_schedule_inserts(start_id, start_hour, end_hour):
    sql_statements = []
    schedule_id = start_id
    video_id = 433

    for hour in range(start_hour, end_hour + 1):
        for minute in range(0, 60, 15):
            start_time = f"{hour:02}:{minute:02}:00"
            end_minute = minute + 15
            end_hour_adjusted = hour

            if end_minute >= 60:
                end_minute -= 60
                end_hour_adjusted += 1

            if end_hour_adjusted > end_hour or (end_hour_adjusted == end_hour and end_minute > 45):
                break

            end_time = f"{end_hour_adjusted:02}:{end_minute:02}:00"
            sql_statements.append(f"INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id, Days) "
                                  f"VALUES ({schedule_id}, {video_id}, '{start_time}', '{end_time}', 10, 'Monday');")
            schedule_id += 1
            video_id += 1

    return sql_statements

# Generate inserts from 00:00 to 23:59
insert_statements = generate_schedule_inserts(1152, 0, 23)

# Adjust the final statement to end at 23:59
insert_statements.append(f"INSERT INTO Schedules (schedule_id, video_id, start_time, end_time, channel_id, Days) "
                         f"VALUES (1247, 480, '23:45:00', '23:59:00', 3, 'Monday');")

# Joining all statements for output
full_script = "\n".join(insert_statements)
print(full_script)
