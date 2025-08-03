-- Remove all supply-related administrative notifications
DELETE FROM administrative_notifications 
WHERE notification_type = 'supplies';