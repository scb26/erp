CREATE TABLE purchase_bills (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    bill_number         VARCHAR(50) UNIQUE NOT NULL,
    bill_date           DATE NOT NULL,
    vendor_id           INT NOT NULL,
    subtotal            DECIMAL(12,2) NOT NULL,
    total_gst           DECIMAL(12,2) NOT NULL,
    grand_total         DECIMAL(12,2) NOT NULL,
    amount_paid         DECIMAL(12,2) DEFAULT 0.00,
    payment_method      ENUM('cash', 'upi', 'bank', 'mixed') NOT NULL,
    status              ENUM('paid', 'partial', 'unpaid') DEFAULT 'unpaid',
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);
