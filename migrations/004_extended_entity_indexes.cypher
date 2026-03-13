// Extended Entity Type Indexes
// Migration 004: Add indexes for new entity types (Animal, Planet, Species, etc.)

// ==================== BIOLOGICAL ENTITY INDEXES ====================

// Animal entity indexes for biological research
CREATE INDEX idx_animal_scientific_name IF NOT EXISTS FOR (a:Animal) ON (a.scientificName);
CREATE INDEX idx_animal_conservation_status IF NOT EXISTS FOR (a:Animal) ON (a.conservationStatus);
CREATE INDEX idx_animal_habitat IF NOT EXISTS FOR (a:Animal) ON (a.habitat);
CREATE INDEX idx_animal_diet IF NOT EXISTS FOR (a:Animal) ON (a.diet);
CREATE INDEX idx_animal_class IF NOT EXISTS FOR (a:Animal) ON (a.class);
CREATE INDEX idx_animal_order IF NOT EXISTS FOR (a:Animal) ON (a.order);
CREATE INDEX idx_animal_family IF NOT EXISTS FOR (a:Animal) ON (a.family);
CREATE INDEX idx_animal_intelligence IF NOT EXISTS FOR (a:Animal) ON (a.intelligence);
CREATE INDEX idx_animal_social IF NOT EXISTS FOR (a:Animal) ON (a.social);
CREATE INDEX idx_animal_discovered IF NOT EXISTS FOR (a:Animal) ON (a.discovered);

// Insect entity indexes for entomological research
CREATE INDEX idx_insect_scientific_name IF NOT EXISTS FOR (i:Insect) ON (i.scientificName);
CREATE INDEX idx_insect_order IF NOT EXISTS FOR (i:Insect) ON (i.order);
CREATE INDEX idx_insect_metamorphosis IF NOT EXISTS FOR (i:Insect) ON (i.metamorphosis);
CREATE INDEX idx_insect_social IF NOT EXISTS FOR (i:Insect) ON (i.social);
CREATE INDEX idx_insect_eusocial IF NOT EXISTS FOR (i:Insect) ON (i.eusocial);
CREATE INDEX idx_insect_pollinator IF NOT EXISTS FOR (i:Insect) ON (i.pollinator);
CREATE INDEX idx_insect_pest IF NOT EXISTS FOR (i:Insect) ON (i.pest);
CREATE INDEX idx_insect_beneficial IF NOT EXISTS FOR (i:Insect) ON (i.beneficial);

// Species entity indexes for taxonomic research
CREATE INDEX idx_species_scientific_name IF NOT EXISTS FOR (s:Species) ON (s.scientificName);
CREATE INDEX idx_species_conservation_status IF NOT EXISTS FOR (s:Species) ON (s.conservationStatus);
CREATE INDEX idx_species_population_trend IF NOT EXISTS FOR (s:Species) ON (s.populationTrend);
CREATE INDEX idx_species_research_priority IF NOT EXISTS FOR (s:Species) ON (s.researchPriority);
CREATE INDEX idx_species_kingdom IF NOT EXISTS FOR (s:Species) ON (s.kingdom);
CREATE INDEX idx_species_phylum IF NOT EXISTS FOR (s:Species) ON (s.phylum);
CREATE INDEX idx_species_class IF NOT EXISTS FOR (s:Species) ON (s.class);

// Microorganism entity indexes for microbiology research
CREATE INDEX idx_microorganism_domain IF NOT EXISTS FOR (m:Microorganism) ON (m.domain);
CREATE INDEX idx_microorganism_cell_type IF NOT EXISTS FOR (m:Microorganism) ON (m.cellType);
CREATE INDEX idx_microorganism_pathogenic IF NOT EXISTS FOR (m:Microorganism) ON (m.pathogenic);
CREATE INDEX idx_microorganism_habitat IF NOT EXISTS FOR (m:Microorganism) ON (m.habitat);

// ==================== ASTRONOMICAL ENTITY INDEXES ====================

// Planet entity indexes for astronomical research
CREATE INDEX idx_planet_planet_type IF NOT EXISTS FOR (p:Planet) ON (p.planetType);
CREATE INDEX idx_planet_discovered IF NOT EXISTS FOR (p:Planet) ON (p.discovered);
CREATE INDEX idx_planet_discovery_method IF NOT EXISTS FOR (p:Planet) ON (p.discoveryMethod);
CREATE INDEX idx_planet_habitable_zone IF NOT EXISTS FOR (p:Planet) ON (p.habitableZone);
CREATE INDEX idx_planet_potentially_habitable IF NOT EXISTS FOR (p:Planet) ON (p.potentiallyHabitable);
CREATE INDEX idx_planet_has_water IF NOT EXISTS FOR (p:Planet) ON (p.hasWater);
CREATE INDEX idx_planet_star_system IF NOT EXISTS FOR (p:Planet) ON (p.starSystem);
CREATE INDEX idx_planet_host_star IF NOT EXISTS FOR (p:Planet) ON (p.hostStar);

// Star entity indexes for stellar research  
CREATE INDEX idx_star_stellar_type IF NOT EXISTS FOR (s:Star) ON (s.stellarType);
CREATE INDEX idx_star_constellation IF NOT EXISTS FOR (s:Star) ON (s.constellation);
CREATE INDEX idx_star_discovered IF NOT EXISTS FOR (s:Star) ON (s.discovered);
CREATE INDEX idx_star_has_planets IF NOT EXISTS FOR (s:Star) ON (s.hasPlanets);

// Galaxy entity indexes for galactic research
CREATE INDEX idx_galaxy_galaxy_type IF NOT EXISTS FOR (g:Galaxy) ON (g.galaxyType);
CREATE INDEX idx_galaxy_constellation IF NOT EXISTS FOR (g:Galaxy) ON (g.constellation);
CREATE INDEX idx_galaxy_discovered IF NOT EXISTS FOR (g:Galaxy) ON (g.discovered);

// ==================== GEOGRAPHIC ENTITY INDEXES ====================

// Enhanced Country indexes (beyond existing)
CREATE INDEX idx_country_continent IF NOT EXISTS FOR (c:Country) ON (c.continent);
CREATE INDEX idx_country_region IF NOT EXISTS FOR (c:Country) ON (c.region);
CREATE INDEX idx_country_government_type IF NOT EXISTS FOR (c:Country) ON (c.government);
CREATE INDEX idx_country_independence IF NOT EXISTS FOR (c:Country) ON (c.independence);

// Region entity indexes for geographic research
CREATE INDEX idx_region_region_type IF NOT EXISTS FOR (r:Region) ON (r.regionType);
CREATE INDEX idx_region_climate IF NOT EXISTS FOR (r:Region) ON (r.climate);
CREATE INDEX idx_region_country IF NOT EXISTS FOR (r:Region) ON (r.country);

// City entity indexes for urban research
CREATE INDEX idx_city_country IF NOT EXISTS FOR (c:City) ON (c.country);
CREATE INDEX idx_city_region IF NOT EXISTS FOR (c:City) ON (c.region);
CREATE INDEX idx_city_city_type IF NOT EXISTS FOR (c:City) ON (c.cityType);
CREATE INDEX idx_city_founded IF NOT EXISTS FOR (c:City) ON (c.founded);

// Ecosystem entity indexes for ecological research
CREATE INDEX idx_ecosystem_ecosystem_type IF NOT EXISTS FOR (e:Ecosystem) ON (e.ecosystemType);
CREATE INDEX idx_ecosystem_climate IF NOT EXISTS FOR (e:Ecosystem) ON (e.climate);
CREATE INDEX idx_ecosystem_threat_level IF NOT EXISTS FOR (e:Ecosystem) ON (e.threatLevel);

// ==================== NEW RELATIONSHIP TYPE INDEXES ====================

// Biological relationship indexes for ecological analysis
CREATE INDEX idx_rel_preys_on_at IF NOT EXISTS FOR ()-[r:PREYS_ON]-() ON (r.at);
CREATE INDEX idx_rel_preys_on_frequency IF NOT EXISTS FOR ()-[r:PREYS_ON]-() ON (r.frequency);
CREATE INDEX idx_rel_preys_on_confidence IF NOT EXISTS FOR ()-[r:PREYS_ON]-() ON (r.confidence);

CREATE INDEX idx_rel_inhabits_at IF NOT EXISTS FOR ()-[r:INHABITS]-() ON (r.at);
CREATE INDEX idx_rel_inhabits_habitat_type IF NOT EXISTS FOR ()-[r:INHABITS]-() ON (r.habitatType);
CREATE INDEX idx_rel_inhabits_population_density IF NOT EXISTS FOR ()-[r:INHABITS]-() ON (r.populationDensity);

CREATE INDEX idx_rel_migrates_to_season IF NOT EXISTS FOR ()-[r:MIGRATES_TO]-() ON (r.season);
CREATE INDEX idx_rel_migrates_to_distance IF NOT EXISTS FOR ()-[r:MIGRATES_TO]-() ON (r.distance);

CREATE INDEX idx_rel_pollinates_efficiency IF NOT EXISTS FOR ()-[r:POLLINATES]-() ON (r.efficiency);
CREATE INDEX idx_rel_pollinates_season IF NOT EXISTS FOR ()-[r:POLLINATES]-() ON (r.season);

CREATE INDEX idx_rel_parasitizes_host_specificity IF NOT EXISTS FOR ()-[r:PARASITIZES]-() ON (r.hostSpecificity);
CREATE INDEX idx_rel_parasitizes_pathogenicity IF NOT EXISTS FOR ()-[r:PARASITIZES]-() ON (r.pathogenicity);

// Geographic relationship indexes
CREATE INDEX idx_rel_borders_border_length IF NOT EXISTS FOR ()-[r:BORDERS]-() ON (r.borderLength);
CREATE INDEX idx_rel_borders_border_type IF NOT EXISTS FOR ()-[r:BORDERS]-() ON (r.borderType);

CREATE INDEX idx_rel_contains_region_administrative_level IF NOT EXISTS FOR ()-[r:CONTAINS_REGION]-() ON (r.administrativeLevel);

// Astronomical relationship indexes for space research
CREATE INDEX idx_rel_orbits_distance IF NOT EXISTS FOR ()-[r:ORBITS]-() ON (r.distance);
CREATE INDEX idx_rel_orbits_period IF NOT EXISTS FOR ()-[r:ORBITS]-() ON (r.period);
CREATE INDEX idx_rel_orbits_eccentricity IF NOT EXISTS FOR ()-[r:ORBITS]-() ON (r.eccentricity);

CREATE INDEX idx_rel_has_moon_moon_type IF NOT EXISTS FOR ()-[r:HAS_MOON]-() ON (r.moonType);
CREATE INDEX idx_rel_has_moon_discovered IF NOT EXISTS FOR ()-[r:HAS_MOON]-() ON (r.discovered);

// Taxonomic relationship indexes for classification
CREATE INDEX idx_rel_classified_as_confidence IF NOT EXISTS FOR ()-[r:CLASSIFIED_AS]-() ON (r.confidence);
CREATE INDEX idx_rel_classified_as_classification_date IF NOT EXISTS FOR ()-[r:CLASSIFIED_AS]-() ON (r.classificationDate);

CREATE INDEX idx_rel_evolved_from_time_period IF NOT EXISTS FOR ()-[r:EVOLVED_FROM]-() ON (r.timePeriod);
CREATE INDEX idx_rel_evolved_from_confidence IF NOT EXISTS FOR ()-[r:EVOLVED_FROM]-() ON (r.confidence);

// Research relationship indexes for academic tracking
CREATE INDEX idx_rel_studies_research_focus IF NOT EXISTS FOR ()-[r:STUDIES]-() ON (r.researchFocus);
CREATE INDEX idx_rel_studies_start_date IF NOT EXISTS FOR ()-[r:STUDIES]-() ON (r.startDate);
CREATE INDEX idx_rel_studies_funding_source IF NOT EXISTS FOR ()-[r:STUDIES]-() ON (r.fundingSource);

CREATE INDEX idx_rel_discovered_by_discovery_date IF NOT EXISTS FOR ()-[r:DISCOVERED_BY]-() ON (r.discoveryDate);
CREATE INDEX idx_rel_discovered_by_discovery_method IF NOT EXISTS FOR ()-[r:DISCOVERED_BY]-() ON (r.discoveryMethod);

CREATE INDEX idx_rel_published_about_publication_date IF NOT EXISTS FOR ()-[r:PUBLISHED_ABOUT]-() ON (r.publicationDate);
CREATE INDEX idx_rel_published_about_journal IF NOT EXISTS FOR ()-[r:PUBLISHED_ABOUT]-() ON (r.journal);

// ==================== COMPOSITE INDEXES FOR COMPLEX QUERIES ====================

// Multi-property indexes for common query patterns
CREATE INDEX idx_animal_classification IF NOT EXISTS FOR (a:Animal) ON (a.class, a.order, a.family);
CREATE INDEX idx_species_taxonomy IF NOT EXISTS FOR (s:Species) ON (s.kingdom, s.phylum, s.class);
CREATE INDEX idx_planet_characteristics IF NOT EXISTS FOR (p:Planet) ON (p.planetType, p.habitableZone);

// Time-based compound indexes for timeline queries
CREATE INDEX idx_biological_temporal IF NOT EXISTS FOR (n:Animal) ON (n.discovered, n.extinct);
CREATE INDEX idx_astronomical_temporal IF NOT EXISTS FOR (p:Planet) ON (p.discovered, p.discoverer);

// Conservation research compound indexes
CREATE INDEX idx_conservation_research IF NOT EXISTS FOR (s:Species) ON (s.conservationStatus, s.populationTrend, s.researchPriority);

// ==================== CONSTRAINTS FOR DATA INTEGRITY ====================

// Unique constraints for scientific accuracy
CREATE CONSTRAINT constraint_animal_scientific_name IF NOT EXISTS FOR (a:Animal) REQUIRE a.scientificName IS UNIQUE;
CREATE CONSTRAINT constraint_species_scientific_name IF NOT EXISTS FOR (s:Species) REQUIRE s.scientificName IS UNIQUE;
CREATE CONSTRAINT constraint_planet_name IF NOT EXISTS FOR (p:Planet) REQUIRE (p.name, p.starSystem) IS UNIQUE;

// Required field constraints for critical entity data
CREATE CONSTRAINT constraint_animal_require_uid IF NOT EXISTS FOR (a:Animal) REQUIRE a.uid IS NOT NULL;
CREATE CONSTRAINT constraint_species_require_uid IF NOT EXISTS FOR (s:Species) REQUIRE s.uid IS NOT NULL;
CREATE CONSTRAINT constraint_planet_require_uid IF NOT EXISTS FOR (p:Planet) REQUIRE p.uid IS NOT NULL;

// ==================== FULLTEXT INDEXES FOR SEARCH OPTIMIZATION ====================

// Scientific name search optimization
CREATE FULLTEXT INDEX idx_scientific_names IF NOT EXISTS
FOR (a:Animal|s:Species|i:Insect|m:Microorganism) ON EACH [a.scientificName, a.commonNames];

// Geographic name search optimization  
CREATE FULLTEXT INDEX idx_geographic_names IF NOT EXISTS
FOR (c:Country|r:Region|city:City|e:Ecosystem) ON EACH [c.name, c.aliases, c.officialName];

// Astronomical object search optimization
CREATE FULLTEXT INDEX idx_astronomical_names IF NOT EXISTS
FOR (p:Planet|s:Star|g:Galaxy) ON EACH [p.name, p.aliases, p.designation];

// ==================== PROPERTY EXISTENCE INDEXES ====================

// Indexes for filtering by property existence (performance optimization)
CREATE INDEX idx_has_conservation_status IF NOT EXISTS FOR (n) ON (EXISTS(n.conservationStatus));
CREATE INDEX idx_has_scientific_name IF NOT EXISTS FOR (n) ON (EXISTS(n.scientificName));
CREATE INDEX idx_has_discovery_date IF NOT EXISTS FOR (n) ON (EXISTS(n.discovered));
CREATE INDEX idx_has_habitat_data IF NOT EXISTS FOR (n) ON (EXISTS(n.habitat));

// Verification queries - run after applying indexes to confirm creation
// SHOW INDEXES YIELD name, type, entityType, labelsOrTypes, properties
// WHERE name STARTS WITH 'idx_animal_' OR name STARTS WITH 'idx_species_' OR name STARTS WITH 'idx_planet_'
// RETURN name, labelsOrTypes, properties ORDER BY name;

// Performance validation queries
// EXPLAIN MATCH (a:Animal) WHERE a.conservationStatus = 'endangered' RETURN count(a);
// EXPLAIN MATCH (p:Planet) WHERE p.potentiallyHabitable = true RETURN count(p);
// EXPLAIN MATCH (s:Species) WHERE s.researchPriority = 'critical' RETURN count(s);
