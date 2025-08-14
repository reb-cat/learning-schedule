-- Create Bible curriculum data if it doesn't exist
INSERT INTO bible_curriculum (week_number, day_of_week, reading_title, reading_type) VALUES
(1, 1, 'Genesis 1-2', 'daily_reading'),
(1, 2, 'Genesis 3-4', 'daily_reading'),
(1, 3, 'Genesis 5-6', 'daily_reading'),
(1, 4, 'Genesis 7-8', 'daily_reading'),
(1, 5, 'Genesis 9-10', 'daily_reading'),
(2, 1, 'Genesis 11-12', 'daily_reading'),
(2, 2, 'Genesis 13-14', 'daily_reading'),
(2, 3, 'Genesis 15-16', 'daily_reading'),
(2, 4, 'Genesis 17-18', 'daily_reading'),
(2, 5, 'Psalm 23', 'memory_verse'),
(3, 1, 'Genesis 19-20', 'daily_reading'),
(3, 2, 'Genesis 21-22', 'daily_reading'),
(3, 3, 'Genesis 23-24', 'daily_reading'),
(3, 4, 'Genesis 25-26', 'daily_reading'),
(3, 5, 'Genesis 27-28', 'daily_reading')
ON CONFLICT (week_number, day_of_week) DO NOTHING;