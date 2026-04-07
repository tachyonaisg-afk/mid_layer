module.exports = `
CREATE TABLE IF NOT EXISTS DoctorCompanyEmpanel (

    id INT AUTO_INCREMENT PRIMARY KEY,

    company VARCHAR(150) NOT NULL,

    doctor_id VARCHAR(50) NOT NULL,

    doctor_name VARCHAR(200),

    consultation_fee DECIMAL(10,2) DEFAULT 0.00,

    status ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',

    isEmpanel BOOLEAN DEFAULT TRUE,

    created_by VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_by VARCHAR(50),

    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    INDEX (doctor_id),
    INDEX (company)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;