CREATE TABLE vendors (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    phone               VARCHAR(15) NOT NULL,
    address             TEXT,
    gstin               VARCHAR(15),
    state               VARCHAR(50) NOT NULL,
    pan                 VARCHAR(10),
    email               VARCHAR(100),
    opening_balance     DECIMAL(12,2) DEFAULT 0.00,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
