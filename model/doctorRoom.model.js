module.exports = `
CREATE TABLE IF NOT EXISTS DoctorRoomMap (
    id INT AUTO_INCREMENT PRIMARY KEY,

    doctor_id VARCHAR(50) NOT NULL,
    doctor_name VARCHAR(150) NOT NULL,
    company VARCHAR(100) NULL,

    room_id INT NOT NULL,
    schedule_date DATE NOT NULL,

    from_time TIME NOT NULL,
    to_time TIME NOT NULL,
     
    max_patients INT NULL,

    created_by VARCHAR(50) NULL,
    updated_by VARCHAR(50) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

   
    UNIQUE KEY unique_doctor_room_date_time 
        (doctor_id, room_id, schedule_date, from_time, to_time),

    FOREIGN KEY (room_id) REFERENCES Rooms(id) ON DELETE CASCADE
);
`;