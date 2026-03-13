// Extended Relationship Type Indexes  
// Migration 005: Add indexes for new biological, astronomical, and geographic relationships

// ==================== BIOLOGICAL RELATIONSHIP INDEXES ====================

// Predation relationships for food web analysis
CREATE INDEX idx_rel_preys_on_at IF NOT EXISTS FOR ()-[r:PREYS_ON]-() ON (r.at);
CREATE INDEX idx_rel_preys_on_frequency IF NOT EXISTS FOR ()-[r:PREYS_ON]-() ON (r.frequency);
CREATE INDEX idx_rel_preys_on_success_rate IF NOT EXISTS FOR ()-[r:PREYS_ON]-() ON (r.successRate);
CREATE INDEX idx_rel_preys_on_confidence IF NOT EXISTS FOR ()-[r:PREYS_ON]-() ON (r.confidence);
CREATE INDEX idx_rel_preys_on_habitat IF NOT EXISTS FOR ()-[r:PREYS_ON]-() ON (r.habitat);

// Competition relationships for ecological modeling
CREATE INDEX idx_rel_competes_with_resource IF NOT EXISTS FOR ()-[r:COMPETES_WITH]-() ON (r.resource);
CREATE INDEX idx_rel_competes_with_intensity IF NOT EXISTS FOR ()-[r:COMPETES_WITH]-() ON (r.intensity);
CREATE INDEX idx_rel_competes_with_outcome IF NOT EXISTS FOR ()-[r:COMPETES_WITH]-() ON (r.outcome);

// Symbiotic relationships for mutualism research
CREATE INDEX idx_rel_symbiotic_with_type IF NOT EXISTS FOR ()-[r:SYMBIOTIC_WITH]-() ON (r.symbiosisType);
CREATE INDEX idx_rel_symbiotic_with_benefit IF NOT EXISTS FOR ()-[r:SYMBIOTIC_WITH]-() ON (r.benefit);
CREATE INDEX idx_rel_symbiotic_with_obligate IF NOT EXISTS FOR ()-[r:SYMBIOTIC_WITH]-() ON (r.obligate);

// Habitat relationships for biogeography
CREATE INDEX idx_rel_inhabits_at IF NOT EXISTS FOR ()-[r:INHABITS]-() ON (r.at);
CREATE INDEX idx_rel_inhabits_habitat_type IF NOT EXISTS FOR ()-[r:INHABITS]-() ON (r.habitatType);
CREATE INDEX idx_rel_inhabits_population_density IF NOT EXISTS FOR ()-[r:INHABITS]-() ON (r.populationDensity);
CREATE INDEX idx_rel_inhabits_native IF NOT EXISTS FOR ()-[r:INHABITS]-() ON (r.native);
CREATE INDEX idx_rel_inhabits_seasonal IF NOT EXISTS FOR ()-[r:INHABITS]-() ON (r.seasonal);

// Migration relationships for movement ecology
CREATE INDEX idx_rel_migrates_to_season IF NOT EXISTS FOR ()-[r:MIGRATES_TO]-() ON (r.season);
CREATE INDEX idx_rel_migrates_to_distance IF NOT EXISTS FOR ()-[r:MIGRATES_TO]-() ON (r.distance);
CREATE INDEX idx_rel_migrates_to_route IF NOT EXISTS FOR ()-[r:MIGRATES_TO]-() ON (r.route);
CREATE INDEX idx_rel_migrates_to_purpose IF NOT EXISTS FOR ()-[r:MIGRATES_TO]-() ON (r.purpose);

// Pollination relationships for agricultural research
CREATE INDEX idx_rel_pollinates_efficiency IF NOT EXISTS FOR ()-[r:POLLINATES]-() ON (r.efficiency);
CREATE INDEX idx_rel_pollinates_season IF NOT EXISTS FOR ()-[r:POLLINATES]-() ON (r.season);
CREATE INDEX idx_rel_pollinates_crop_type IF NOT EXISTS FOR ()-[r:POLLINATES]-() ON (r.cropType);
CREATE INDEX idx_rel_pollinates_economic_value IF NOT EXISTS FOR ()-[r:POLLINATES]-() ON (r.economicValue);

// Parasitism relationships for disease research
CREATE INDEX idx_rel_parasitizes_host_specificity IF NOT EXISTS FOR ()-[r:PARASITIZES]-() ON (r.hostSpecificity);
CREATE INDEX idx_rel_parasitizes_pathogenicity IF NOT EXISTS FOR ()-[r:PARASITIZES]-() ON (r.pathogenicity);
CREATE INDEX idx_rel_parasitizes_transmission IF NOT EXISTS FOR ()-[r:PARASITIZES]-() ON (r.transmission);
CREATE INDEX idx_rel_parasitizes_treatment IF NOT EXISTS FOR ()-[r:PARASITIZES]-() ON (r.treatment);

// ==================== GEOGRAPHIC RELATIONSHIP INDEXES ====================

// Border relationships for geopolitical analysis
CREATE INDEX idx_rel_borders_border_length IF NOT EXISTS FOR ()-[r:BORDERS]-() ON (r.borderLength);
CREATE INDEX idx_rel_borders_border_type IF NOT EXISTS FOR ()-[r:BORDERS]-() ON (r.borderType);
CREATE INDEX idx_rel_borders_established IF NOT EXISTS FOR ()-[r:BORDERS]-() ON (r.established);
CREATE INDEX idx_rel_borders_disputed IF NOT EXISTS FOR ()-[r:BORDERS]-() ON (r.disputed);

// Administrative hierarchy relationships
CREATE INDEX idx_rel_contains_region_administrative_level IF NOT EXISTS FOR ()-[r:CONTAINS_REGION]-() ON (r.administrativeLevel);
CREATE INDEX idx_rel_contains_region_governance IF NOT EXISTS FOR ()-[r:CONTAINS_REGION]-() ON (r.governance);

CREATE INDEX idx_rel_part_of_continent_membership_type IF NOT EXISTS FOR ()-[r:PART_OF_CONTINENT]-() ON (r.membershipType);
CREATE INDEX idx_rel_part_of_continent_joined IF NOT EXISTS FOR ()-[r:PART_OF_CONTINENT]-() ON (r.joined);

// Climate relationships for environmental research
CREATE INDEX idx_rel_has_climate_primary_climate IF NOT EXISTS FOR ()-[r:HAS_CLIMATE]-() ON (r.primaryClimate);
CREATE INDEX idx_rel_has_climate_seasonal_variation IF NOT EXISTS FOR ()-[r:HAS_CLIMATE]-() ON (r.seasonalVariation);

// ==================== ASTRONOMICAL RELATIONSHIP INDEXES ====================

// Orbital relationships for celestial mechanics
CREATE INDEX idx_rel_orbits_distance IF NOT EXISTS FOR ()-[r:ORBITS]-() ON (r.distance);
CREATE INDEX idx_rel_orbits_period IF NOT EXISTS FOR ()-[r:ORBITS]-() ON (r.period);
CREATE INDEX idx_rel_orbits_eccentricity IF NOT EXISTS FOR ()-[r:ORBITS]-() ON (r.eccentricity);
CREATE INDEX idx_rel_orbits_inclination IF NOT EXISTS FOR ()-[r:ORBITS]-() ON (r.inclination);
CREATE INDEX idx_rel_orbits_discovered IF NOT EXISTS FOR ()-[r:ORBITS]-() ON (r.discovered);

// Satellite relationships
CREATE INDEX idx_rel_has_moon_moon_type IF NOT EXISTS FOR ()-[r:HAS_MOON]-() ON (r.moonType);
CREATE INDEX idx_rel_has_moon_discovered IF NOT EXISTS FOR ()-[r:HAS_MOON]-() ON (r.discovered);
CREATE INDEX idx_rel_has_moon_orbital_period IF NOT EXISTS FOR ()-[r:HAS_MOON]-() ON (r.orbitalPeriod);

// System membership for stellar classification
CREATE INDEX idx_rel_in_system_membership_type IF NOT EXISTS FOR ()-[r:IN_SYSTEM]-() ON (r.membershipType);
CREATE INDEX idx_rel_in_system_discovered IF NOT EXISTS FOR ()-[r:IN_SYSTEM]-() ON (r.discovered);

// Gravitational relationships for binary systems
CREATE INDEX idx_rel_gravitationally_bound_strength IF NOT EXISTS FOR ()-[r:GRAVITATIONALLY_BOUND]-() ON (r.strength);
CREATE INDEX idx_rel_gravitationally_bound_distance IF NOT EXISTS FOR ()-[r:GRAVITATIONALLY_BOUND]-() ON (r.distance);

// ==================== TAXONOMIC RELATIONSHIP INDEXES ====================

// Native range relationships for biogeography
CREATE INDEX idx_rel_native_to_time_period IF NOT EXISTS FOR ()-[r:NATIVE_TO]-() ON (r.timePeriod);
CREATE INDEX idx_rel_native_to_habitat_type IF NOT EXISTS FOR ()-[r:NATIVE_TO]-() ON (r.habitatType);
CREATE INDEX idx_rel_native_to_population_size IF NOT EXISTS FOR ()-[r:NATIVE_TO]-() ON (r.populationSize);

// Introduction relationships for invasion biology
CREATE INDEX idx_rel_introduced_to_introduction_date IF NOT EXISTS FOR ()-[r:INTRODUCED_TO]-() ON (r.introductionDate);
CREATE INDEX idx_rel_introduced_to_introduction_method IF NOT EXISTS FOR ()-[r:INTRODUCED_TO]-() ON (r.introductionMethod);
CREATE INDEX idx_rel_introduced_to_establishment_status IF NOT EXISTS FOR ()-[r:INTRODUCED_TO]-() ON (r.establishmentStatus);

// Evolutionary relationships for phylogenetic analysis
CREATE INDEX idx_rel_evolved_from_time_period IF NOT EXISTS FOR ()-[r:EVOLVED_FROM]-() ON (r.timePeriod);
CREATE INDEX idx_rel_evolved_from_fossil_evidence IF NOT EXISTS FOR ()-[r:EVOLVED_FROM]-() ON (r.fossilEvidence);
CREATE INDEX idx_rel_evolved_from_genetic_evidence IF NOT EXISTS FOR ()-[r:EVOLVED_FROM]-() ON (r.geneticEvidence);

CREATE INDEX idx_rel_ancestor_of_divergence_time IF NOT EXISTS FOR ()-[r:ANCESTOR_OF]-() ON (r.divergenceTime);
CREATE INDEX idx_rel_ancestor_of_confidence IF NOT EXISTS FOR ()-[r:ANCESTOR_OF]-() ON (r.confidence);

// Classification relationships for taxonomy
CREATE INDEX idx_rel_classified_as_taxonomic_level IF NOT EXISTS FOR ()-[r:CLASSIFIED_AS]-() ON (r.taxonomicLevel);
CREATE INDEX idx_rel_classified_as_classification_method IF NOT EXISTS FOR ()-[r:CLASSIFIED_AS]-() ON (r.classificationMethod);
CREATE INDEX idx_rel_classified_as_classifier IF NOT EXISTS FOR ()-[r:CLASSIFIED_AS]-() ON (r.classifier);

// ==================== RESEARCH RELATIONSHIP INDEXES ====================

// Research focus relationships for academic tracking
CREATE INDEX idx_rel_studies_research_type IF NOT EXISTS FOR ()-[r:STUDIES]-() ON (r.researchType);
CREATE INDEX idx_rel_studies_methodology IF NOT EXISTS FOR ()-[r:STUDIES]-() ON (r.methodology);
CREATE INDEX idx_rel_studies_duration IF NOT EXISTS FOR ()-[r:STUDIES]-() ON (r.duration);
CREATE INDEX idx_rel_studies_institution IF NOT EXISTS FOR ()-[r:STUDIES]-() ON (r.institution);

// Discovery attribution for credit tracking
CREATE INDEX idx_rel_discovered_by_discovery_context IF NOT EXISTS FOR ()-[r:DISCOVERED_BY]-() ON (r.discoveryContext);
CREATE INDEX idx_rel_discovered_by_recognition_date IF NOT EXISTS FOR ()-[r:DISCOVERED_BY]-() ON (r.recognitionDate);

// Research funding for grant analysis
CREATE INDEX idx_rel_funded_research_amount IF NOT EXISTS FOR ()-[r:FUNDED_RESEARCH]-() ON (r.amount);
CREATE INDEX idx_rel_funded_research_grant_type IF NOT EXISTS FOR ()-[r:FUNDED_RESEARCH]-() ON (r.grantType);
CREATE INDEX idx_rel_funded_research_start_date IF NOT EXISTS FOR ()-[r:FUNDED_RESEARCH]-() ON (r.startDate);
CREATE INDEX idx_rel_funded_research_end_date IF NOT EXISTS FOR ()-[r:FUNDED_RESEARCH]-() ON (r.endDate);

// Publication relationships for academic impact
CREATE INDEX idx_rel_published_about_impact_factor IF NOT EXISTS FOR ()-[r:PUBLISHED_ABOUT]-() ON (r.impactFactor);
CREATE INDEX idx_rel_published_about_citation_count IF NOT EXISTS FOR ()-[r:PUBLISHED_ABOUT]-() ON (r.citationCount);
CREATE INDEX idx_rel_published_about_open_access IF NOT EXISTS FOR ()-[r:PUBLISHED_ABOUT]-() ON (r.openAccess);

// Performance validation queries for new indexes
// EXPLAIN MATCH (a:Animal)-[r:PREYS_ON]->(b:Animal) WHERE r.frequency = 'high' RETURN count(r);
// EXPLAIN MATCH (p:Planet)-[r:ORBITS]->(s:Star) WHERE r.distance < 2.0 RETURN count(r);
// EXPLAIN MATCH (s:Species)-[r:NATIVE_TO]->(c:Country) WHERE s.conservationStatus = 'endangered' RETURN count(r);
