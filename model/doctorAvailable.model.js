const doctorAvailableTable = `
CREATE TABLE IF NOT EXISTS DoctorAvailable (
    id INT AUTO_INCREMENT PRIMARY KEY,

    doctor_id VARCHAR(50) NOT NULL,
    company VARCHAR(100) NOT NULL,

    available_date DATE NOT NULL,

    start_time TIME NULL,
    end_time TIME NULL,

    created_by VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_by VARCHAR(50) NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    INDEX (doctor_id),
    INDEX (company),
    INDEX (available_date),

    UNIQUE KEY unique_available_slot 
    (doctor_id, company, available_date, start_time, end_time)
);
`;

module.exports = doctorAvailableTable;