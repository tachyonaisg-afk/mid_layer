module.exports = `
CREATE TABLE IF NOT EXISTS prescription_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50),
  company_name VARCHAR(255),    --  Added to store dynamic name
  encounter_id VARCHAR(50),     -- For prescription
  item_id VARCHAR(50),          -- For report 
  patient_name VARCHAR(100),
  file_name VARCHAR(255),
  token VARCHAR(255),
  message_sid VARCHAR(255), 
  send_type ENUM('automatic', 'manual') DEFAULT 'manual', 
  delivery_status VARCHAR(50) DEFAULT 'pending', 
  file_type ENUM('prescription','report') DEFAULT 'prescription', 
  password_hash TEXT,
  expires_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;