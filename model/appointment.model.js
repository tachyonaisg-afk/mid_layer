    module.exports = `
    CREATE TABLE IF NOT EXISTS QueueTable (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company VARCHAR(100) NOT NULL,
        appointment_id VARCHAR(50) UNIQUE,
        doctor_id VARCHAR(50) NOT NULL,
        patient_id VARCHAR(50) NOT NULL,
        appointment_date DATE NOT NULL,
        queue_no INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (doctor_id),
        INDEX (appointment_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
