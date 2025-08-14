-- Clean up Co-op assignments that were incorrectly created in the database
DELETE FROM assignments 
WHERE title IN ('Travel to Co-op', 'Prep/Load', 'Travel Home') 
AND source = 'canvas';