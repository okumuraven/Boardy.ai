CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    wallet_address VARCHAR(42),
    need_text TEXT,
    offer_text TEXT,
    need_vector VECTOR(1536),
    offer_vector VECTOR(1536),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    user_a_id INT REFERENCES users(id),
    user_b_id INT REFERENCES users(id),
    similarity NUMERIC(4,3),
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert dummy data for demo purposes so you don't have to populate a ton of users manually
INSERT INTO users (phone_number, wallet_address, need_text, offer_text) VALUES 
('+254700000001', '0x1111111111111111111111111111111111111111', 'I need a full stack developer for my AI app', 'I offer business strategy and connections'),
('+254700000002', '0x2222222222222222222222222222222222222222', 'I need a co-founder with business connections', 'I am a full stack developer who can build AI apps');
