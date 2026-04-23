CREATE TABLE purchase_bill_items (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    purchase_bill_id      INT NOT NULL,
    product_id            INT NOT NULL,
    quantity              INT NOT NULL,
    purchase_rate         DECIMAL(10,2) NOT NULL,
    gst_rate              DECIMAL(5,2) NOT NULL,
    line_total            DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (purchase_bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);
