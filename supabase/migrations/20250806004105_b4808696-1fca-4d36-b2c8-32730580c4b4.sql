-- Remove duplicate Course Fee entry for Khalil's Health class
-- This is a duplicate of the existing Copy Fee - Health entry
DELETE FROM administrative_notifications 
WHERE id = '8414e4ad-7556-4288-bc83-5769f8886de6'
  AND title = 'Course Fee - $20' 
  AND student_name = 'Khalil' 
  AND course_name = '25/26 T2 7th-12th Gr Health'
  AND amount = 20;