UPDATE assignments 
SET eligible_for_scheduling = true,
    completion_status = 'not_started'
WHERE title = 'IXL Practice' AND student_name = 'Abigail';