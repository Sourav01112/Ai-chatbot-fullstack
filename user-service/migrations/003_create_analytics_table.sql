CREATE TABLE IF NOT EXISTS user_analytics (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON user_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON user_analytics(session_id);