CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('user', 'assistant', 'system')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_parent_id ON messages(parent_message_id);
CREATE INDEX idx_messages_order ON messages(session_id, order_index);
CREATE INDEX idx_messages_session_created ON messages(session_id, created_at);

CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));