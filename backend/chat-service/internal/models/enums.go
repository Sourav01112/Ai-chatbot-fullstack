package models

type MessageType string
type SessionStatus string

const (
    MessageTypeUser      MessageType = "user"
    MessageTypeAssistant MessageType = "assistant"
    MessageTypeSystem    MessageType = "system"
)

const (
    SessionStatusActive   SessionStatus = "active"
    SessionStatusPaused   SessionStatus = "paused"
    SessionStatusArchived SessionStatus = "archived"
)

func (m MessageType) String() string {
    return string(m)
}

func (s SessionStatus) String() string {
    return string(s)
}

func (m MessageType) IsValid() bool {
    switch m {
    case MessageTypeUser, MessageTypeAssistant, MessageTypeSystem:
        return true
    default:
        return false
    }
}

func (s SessionStatus) IsValid() bool {
    switch s {
    case SessionStatusActive, SessionStatusPaused, SessionStatusArchived:
        return true
    default:
        return false
    }
}