// Time Navigation Optimization Indexes
// Enhanced indexes for time slice queries and entity-specific filtering

// Time-based indexes for major relationship types
CREATE INDEX idx_speech_at IF NOT EXISTS 
FOR ()-[r:SPEECH_ACT]-() ON (r.at);

CREATE INDEX idx_funds_at IF NOT EXISTS 
FOR ()-[r:FUNDS]-() ON (r.at);

CREATE INDEX idx_attacks_at IF NOT EXISTS 
FOR ()-[r:ATTACKS]-() ON (r.at);

// Entity activity counting optimization  
CREATE INDEX idx_entity_uid IF NOT EXISTS 
FOR (n:Entity) ON (n.uid);

// Speech acts with time for sentiment analysis
CREATE INDEX idx_speech_at_sentiment IF NOT EXISTS 
FOR ()-[r:SPEECH_ACT]-() ON (r.at, r.sentiment);

// Funding relationships with time for financial analysis
CREATE INDEX idx_funds_at_amount IF NOT EXISTS 
FOR ()-[r:FUNDS]-() ON (r.at, r.amount);

// Time-based community analysis
CREATE INDEX idx_entity_community IF NOT EXISTS 
FOR (n:Entity) ON (n.communityId);

// Relationship UID for cursor pagination on major types
CREATE INDEX idx_speech_uid IF NOT EXISTS 
FOR ()-[r:SPEECH_ACT]-() ON (r.uid);

CREATE INDEX idx_funds_uid IF NOT EXISTS 
FOR ()-[r:FUNDS]-() ON (r.uid);
