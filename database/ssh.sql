-- Simple SSH Key Storage for 2-Admin Proof of Concept
-- File: database/simple_ssh.sql

CREATE TABLE IF NOT EXISTS admin_ssh_keys (
    wallet_address VARCHAR(42) PRIMARY KEY,
    public_key TEXT NOT NULL,
    fingerprint VARCHAR(100) NOT NULL,
    admin_name VARCHAR(100),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pre-populate with your 2 admin wallets (update 2nd address)
INSERT INTO admin_ssh_keys (wallet_address, public_key, fingerprint, admin_name) VALUES
('0x742d35Cc6635C0532925a3b8D5b9212C0f', 'PLACEHOLDER_KEY_1', 'PLACEHOLDER_FINGERPRINT_1', 'Admin 1'),
('0x742d35Cc6635C0532925a3b8D5b9212C1f', 'PLACEHOLDER_KEY_2', 'PLACEHOLDER_FINGERPRINT_2', 'Admin 2') 
ON CONFLICT (wallet_address) DO NOTHING;

-- Simple audit log
CREATE TABLE IF NOT EXISTS admin_actions (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_wallet ON admin_actions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_admin_actions_time ON admin_actions(timestamp);