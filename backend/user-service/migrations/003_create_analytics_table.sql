
CREATE TABLE IF NOT EXISTS user_analytics (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX idx_user_analytics_activity_type ON user_analytics(activity_type);
CREATE INDEX idx_user_analytics_created_at ON user_analytics(created_at);
CREATE INDEX idx_user_analytics_session_id ON user_analytics(session_id);

CREATE INDEX idx_user_analytics_user_activity ON user_analytics(user_id, activity_type);
CREATE INDEX idx_user_analytics_user_date ON user_analytics(user_id, created_at);