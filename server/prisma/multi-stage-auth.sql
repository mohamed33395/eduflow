-- Multi-stage authentication tables for eduflow
-- These tables support the Constrix-style multi-step login flow

-- Login step tokens for tracking authentication stages
CREATE TABLE IF NOT EXISTS login_step_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_step_tokens_user_id ON login_step_tokens(user_id);

-- OTP codes for login and password reset
CREATE TABLE IF NOT EXISTS login_otps (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  step_token_id TEXT NOT NULL REFERENCES login_step_tokens(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'mail' or 'sms'
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_otps_step_token_id ON login_otps(step_token_id);
CREATE INDEX IF NOT EXISTS idx_login_otps_user_id ON login_otps(user_id);
