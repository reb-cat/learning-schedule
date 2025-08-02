-- Clean up assignments before August 1, 2025 (old academic year data)
DELETE FROM assignments 
WHERE due_date < '2025-08-01T00:00:00Z';