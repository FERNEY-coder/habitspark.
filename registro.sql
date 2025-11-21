SELECT fecha, completado FROM habit_logs
WHERE habit_id = ? AND user_id = ?
ORDER BY fecha DESC LIMIT 365;
