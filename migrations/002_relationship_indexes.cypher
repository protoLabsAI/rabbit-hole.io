// Rabbit Hole Schema - Comprehensive Relationship Indexes
// Migration 002: Add missing relationship property indexes for performance

// === SPEECH_ACT Indexes (complete set) ===
CREATE INDEX idx_rel_speech_at IF NOT EXISTS FOR ()-[r:SPEECH_ACT]-() ON (r.at);
CREATE INDEX idx_rel_speech_sentiment IF NOT EXISTS FOR ()-[r:SPEECH_ACT]-() ON (r.sentiment);
CREATE INDEX idx_rel_speech_confidence IF NOT EXISTS FOR ()-[r:SPEECH_ACT]-() ON (r.confidence);
CREATE INDEX idx_rel_speech_category IF NOT EXISTS FOR ()-[r:SPEECH_ACT]-() ON (r.category);
CREATE INDEX idx_rel_speech_intensity IF NOT EXISTS FOR ()-[r:SPEECH_ACT]-() ON (r.intensity);
CREATE INDEX idx_rel_speech_narrative IF NOT EXISTS FOR ()-[r:SPEECH_ACT]-() ON (r.narrative);
CREATE INDEX idx_rel_speech_tone IF NOT EXISTS FOR ()-[r:SPEECH_ACT]-() ON (r.tone);

// === FUNDS Indexes ===
CREATE INDEX idx_rel_funds_amount IF NOT EXISTS FOR ()-[r:FUNDS]-() ON (r.amount);
CREATE INDEX idx_rel_funds_confidence IF NOT EXISTS FOR ()-[r:FUNDS]-() ON (r.confidence);
CREATE INDEX idx_rel_funds_at IF NOT EXISTS FOR ()-[r:FUNDS]-() ON (r.at);
CREATE INDEX idx_rel_funds_currency IF NOT EXISTS FOR ()-[r:FUNDS]-() ON (r.currency);
CREATE INDEX idx_rel_funds_purpose IF NOT EXISTS FOR ()-[r:FUNDS]-() ON (r.purpose);

// === PLATFORMS Indexes ===
CREATE INDEX idx_rel_platforms_at IF NOT EXISTS FOR ()-[r:PLATFORMS]-() ON (r.at);
CREATE INDEX idx_rel_platforms_confidence IF NOT EXISTS FOR ()-[r:PLATFORMS]-() ON (r.confidence);
CREATE INDEX idx_rel_platforms_editorial IF NOT EXISTS FOR ()-[r:PLATFORMS]-() ON (r.editorialControl);

// === EVIDENCES Indexes ===
CREATE INDEX idx_rel_evidences_confidence IF NOT EXISTS FOR ()-[r:EVIDENCES]-() ON (r.confidence);

// === NARRATIVE_ALIGNMENT Indexes ===
CREATE INDEX idx_rel_narrative_alignment_narrative IF NOT EXISTS FOR ()-[r:NARRATIVE_ALIGNMENT]-() ON (r.narrative);
CREATE INDEX idx_rel_narrative_alignment_at IF NOT EXISTS FOR ()-[r:NARRATIVE_ALIGNMENT]-() ON (r.at);
CREATE INDEX idx_rel_narrative_alignment_confidence IF NOT EXISTS FOR ()-[r:NARRATIVE_ALIGNMENT]-() ON (r.confidence);

// === ATTACKS Indexes ===
CREATE INDEX idx_rel_attacks_at IF NOT EXISTS FOR ()-[r:ATTACKS]-() ON (r.at);
CREATE INDEX idx_rel_attacks_category IF NOT EXISTS FOR ()-[r:ATTACKS]-() ON (r.category);
CREATE INDEX idx_rel_attacks_intensity IF NOT EXISTS FOR ()-[r:ATTACKS]-() ON (r.intensity);
CREATE INDEX idx_rel_attacks_confidence IF NOT EXISTS FOR ()-[r:ATTACKS]-() ON (r.confidence);

// === Global Entity Name Index (superlabel) ===
CREATE INDEX idx_entity_name IF NOT EXISTS FOR (n:Entity) ON (n.name);
CREATE INDEX idx_entity_uid IF NOT EXISTS FOR (n:Entity) ON (n.uid);

// === Content and Evidence Fast Lookups ===
CREATE INDEX idx_content_type IF NOT EXISTS FOR (n:Content) ON (n.content_type);
CREATE INDEX idx_content_platform IF NOT EXISTS FOR (n:Content) ON (n.platform_uid);
CREATE INDEX idx_content_author IF NOT EXISTS FOR (n:Content) ON (n.author_uid);

CREATE INDEX idx_evidence_kind IF NOT EXISTS FOR (n:Evidence) ON (n.kind);
CREATE INDEX idx_evidence_publisher IF NOT EXISTS FOR (n:Evidence) ON (n.publisher);
CREATE INDEX idx_evidence_reliability IF NOT EXISTS FOR (n:Evidence) ON (n.reliability);

// === File Management Indexes ===
CREATE INDEX idx_file_mime IF NOT EXISTS FOR (n:File) ON (n.mime);
CREATE INDEX idx_file_bucket IF NOT EXISTS FOR (n:File) ON (n.bucket);

// Verification query - run after applying indexes
// SHOW INDEXES YIELD name, type, entityType, labelsOrTypes, properties
// WHERE name STARTS WITH 'idx_rel_' OR name STARTS WITH 'idx_entity_'
// RETURN name, labelsOrTypes, properties ORDER BY name;
