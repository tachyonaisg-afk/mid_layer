module.exports = `
CREATE TABLE IF NOT EXISTS Payments (
  id INT AUTO_INCREMENT PRIMARY KEY,

    patient_id VARCHAR(50) NOT NULL,
    company VARCHAR(100),
    posting_date DATE,

    party_type VARCHAR(50),
    party VARCHAR(100),

    invoice_no VARCHAR(50) UNIQUE,

    due_amount INT DEFAULT 0,
    paid_amount INT DEFAULT 0,

    payment_link TEXT,
    razorpay_qr_id VARCHAR(100),
    razorpay_link_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),

    reference_no VARCHAR(100),
    reference_date DATETIME,

    mode_of_payment VARCHAR(50),
    payment_type VARCHAR(50),

    status ENUM('pending','paid','failed') DEFAULT 'pending',

    razorpay_event_id VARCHAR(150) NULL,
    paid_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
