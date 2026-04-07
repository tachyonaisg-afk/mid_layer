module.exports = `
CREATE TABLE IF NOT EXISTS Rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,

    room_name VARCHAR(50) NOT NULL,
    company VARCHAR(100) NOT NULL,

    status ENUM('active','inactive') DEFAULT 'active',

    created_by VARCHAR(50) NULL,
    updated_by VARCHAR(50) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_room_company (room_name, company)
);
`;