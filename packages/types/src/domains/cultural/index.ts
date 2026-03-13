/**
 * Cultural Domain - Index
 *
 * Exports all cultural entity schemas and provides domain-specific
 * UID validation and entity type mappings.
 */

// ==================== Schema Imports ====================

export * from "./book.schema";
export * from "./film.schema";
export * from "./song.schema";
export * from "./art.schema";
export * from "./language.schema";
export * from "./religion.schema";
export * from "./tradition.schema";
export * from "./character.schema";
export * from "./sport.schema";
export * from "./team.schema";
export * from "./athlete.schema";
export * from "./stadium.schema";
export * from "./game.schema";
export * from "./tv-show.schema";
export * from "./theater.schema";
export * from "./food.schema";
export * from "./recipe.schema";
export * from "./cuisine.schema";

import type { DomainMetadata } from "../../domain-metadata";

import { ArtEntitySchema, validateArtUID, ART_UID_PREFIX } from "./art.schema";
import {
  AthleteEntitySchema,
  validateAthleteUID,
  ATHLETE_UID_PREFIX,
} from "./athlete.schema";
import {
  BookEntitySchema,
  validateBookUID,
  BOOK_UID_PREFIX,
} from "./book.schema";
import {
  CharacterEntitySchema,
  validateCharacterUID,
  CHARACTER_UID_PREFIX,
} from "./character.schema";
import {
  CuisineEntitySchema,
  validateCuisineUID,
  CUISINE_UID_PREFIX,
} from "./cuisine.schema";
import {
  FilmEntitySchema,
  validateFilmUID,
  FILM_UID_PREFIX,
} from "./film.schema";
import {
  FoodEntitySchema,
  validateFoodUID,
  FOOD_UID_PREFIX,
} from "./food.schema";
import {
  GameEntitySchema,
  validateGameUID,
  GAME_UID_PREFIX,
} from "./game.schema";
import {
  LanguageEntitySchema,
  validateLanguageUID,
  LANGUAGE_UID_PREFIX,
} from "./language.schema";
import {
  RecipeEntitySchema,
  validateRecipeUID,
  RECIPE_UID_PREFIX,
} from "./recipe.schema";
import {
  ReligionEntitySchema,
  validateReligionUID,
  RELIGION_UID_PREFIX,
} from "./religion.schema";
import {
  SongEntitySchema,
  validateSongUID,
  SONG_UID_PREFIX,
} from "./song.schema";
import {
  SportEntitySchema,
  validateSportUID,
  SPORT_UID_PREFIX,
} from "./sport.schema";
import {
  StadiumEntitySchema,
  validateStadiumUID,
  STADIUM_UID_PREFIX,
} from "./stadium.schema";
import {
  TeamEntitySchema,
  validateTeamUID,
  TEAM_UID_PREFIX,
} from "./team.schema";
import {
  TheaterEntitySchema,
  validateTheaterUID,
  THEATER_UID_PREFIX,
} from "./theater.schema";
import {
  TraditionEntitySchema,
  validateTraditionUID,
  TRADITION_UID_PREFIX,
} from "./tradition.schema";
import {
  TVShowEntitySchema,
  validateTVShowUID,
  TV_SHOW_UID_PREFIX,
} from "./tv-show.schema";

// ==================== Domain Registry ====================

/**
 * All cultural entity schemas mapped by type name
 */
export const CULTURAL_ENTITY_SCHEMAS = {
  Book: BookEntitySchema,
  Film: FilmEntitySchema,
  Song: SongEntitySchema,
  Art: ArtEntitySchema,
  Language: LanguageEntitySchema,
  Religion: ReligionEntitySchema,
  Tradition: TraditionEntitySchema,
  Character: CharacterEntitySchema,
  Sport: SportEntitySchema,
  Team: TeamEntitySchema,
  Athlete: AthleteEntitySchema,
  Stadium: StadiumEntitySchema,
  Game: GameEntitySchema,
  TV_Show: TVShowEntitySchema,
  Theater: TheaterEntitySchema,
  Food: FoodEntitySchema,
  Recipe: RecipeEntitySchema,
  Cuisine: CuisineEntitySchema,
} as const;

/**
 * All cultural entity types
 */
export const CULTURAL_ENTITY_TYPES = Object.keys(
  CULTURAL_ENTITY_SCHEMAS
) as Array<keyof typeof CULTURAL_ENTITY_SCHEMAS>;

/**
 * UID prefix mappings for cultural entities
 */
export const CULTURAL_UID_PREFIXES = {
  [BOOK_UID_PREFIX]: "Book",
  [FILM_UID_PREFIX]: "Film",
  [SONG_UID_PREFIX]: "Song",
  [ART_UID_PREFIX]: "Art",
  [LANGUAGE_UID_PREFIX]: "Language",
  [RELIGION_UID_PREFIX]: "Religion",
  [TRADITION_UID_PREFIX]: "Tradition",
  [CHARACTER_UID_PREFIX]: "Character",
  [SPORT_UID_PREFIX]: "Sport",
  [TEAM_UID_PREFIX]: "Team",
  [ATHLETE_UID_PREFIX]: "Athlete",
  [STADIUM_UID_PREFIX]: "Stadium",
  [GAME_UID_PREFIX]: "Game",
  [TV_SHOW_UID_PREFIX]: "TV_Show",
  [THEATER_UID_PREFIX]: "Theater",
  [FOOD_UID_PREFIX]: "Food",
  [RECIPE_UID_PREFIX]: "Recipe",
  [CUISINE_UID_PREFIX]: "Cuisine",
} as const;

/**
 * UID validators for cultural entities
 */
export const CULTURAL_UID_VALIDATORS = {
  [BOOK_UID_PREFIX]: validateBookUID,
  [FILM_UID_PREFIX]: validateFilmUID,
  [SONG_UID_PREFIX]: validateSongUID,
  [ART_UID_PREFIX]: validateArtUID,
  [LANGUAGE_UID_PREFIX]: validateLanguageUID,
  [RELIGION_UID_PREFIX]: validateReligionUID,
  [TRADITION_UID_PREFIX]: validateTraditionUID,
  [CHARACTER_UID_PREFIX]: validateCharacterUID,
  [SPORT_UID_PREFIX]: validateSportUID,
  [TEAM_UID_PREFIX]: validateTeamUID,
  [ATHLETE_UID_PREFIX]: validateAthleteUID,
  [STADIUM_UID_PREFIX]: validateStadiumUID,
  [GAME_UID_PREFIX]: validateGameUID,
  [TV_SHOW_UID_PREFIX]: validateTVShowUID,
  [THEATER_UID_PREFIX]: validateTheaterUID,
  [FOOD_UID_PREFIX]: validateFoodUID,
  [RECIPE_UID_PREFIX]: validateRecipeUID,
  [CUISINE_UID_PREFIX]: validateCuisineUID,
} as const;

// ==================== Domain Helper Functions ====================

/**
 * Validate if a UID belongs to the cultural domain
 */
export function isCulturalUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  return prefix in CULTURAL_UID_VALIDATORS;
}

/**
 * Get entity type from cultural UID
 */
export function getCulturalEntityType(uid: string): string | null {
  const prefix = uid.split(":")[0];
  return (
    CULTURAL_UID_PREFIXES[prefix as keyof typeof CULTURAL_UID_PREFIXES] || null
  );
}

/**
 * Validate cultural UID format
 */
export function validateCulturalUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  const validator =
    CULTURAL_UID_VALIDATORS[prefix as keyof typeof CULTURAL_UID_VALIDATORS];
  return validator ? validator(uid) : false;
}

// ==================== Domain Configuration (New) ====================

export * from "./domain.config";
export { culturalDomainConfig } from "./domain.config";

// ==================== Domain Metadata (Deprecated) ====================

/**
 * @deprecated Use culturalDomainConfig from domain-system instead.
 * Will be removed in v2.0.0
 */
export const CULTURAL_DOMAIN_INFO: DomainMetadata = {
  name: "cultural",
  description:
    "Cultural heritage - books, films, songs, art, languages, religions, traditions",
  entityCount: Object.keys(CULTURAL_ENTITY_SCHEMAS).length,
  relationships: [
    "CREATES",
    "INFLUENCES",
    "ADAPTS",
    "TRANSLATES",
    "PERFORMS",
    "EXHIBITS",
    "PRESERVES",
    "PRACTICES",
    "TEACHES",
    "BELONGS_TO",
    "ORIGINATES_FROM",
    "INSPIRES",
    "DOCUMENTS",
    "CELEBRATES",
    "AUTHORED", // Literary authorship
    "PUBLISHED", // Publishing relationship
    "ILLUSTRATED", // Illustration work
    "INSPIRED", // Creative inspiration
    "APPEARS_IN", // Characters in stories/media
    "SETTING_OF",
    "PLAYS_FOR", // Sports team membership
    "COMPETES_IN", // Competition participation
    "CONTAINS_INGREDIENT", // Food/recipe composition
  ],
  ui: {
    color: "#EC4899", // Pink - arts/culture
    icon: "🎨", // Art/creativity
    entityIcons: {
      Book: "📚",
      Film: "🎬",
      Song: "🎵",
      Art: "🎨",
      Language: "🗣️",
      Religion: "⛪",
      Tradition: "🏮",
      Food: "🍽️",
      Recipe: "👨‍🍳",
      Food_Product: "🥫",
      Cuisine: "🍱",
      Diet: "🥗",
      Ingredient: "🧂",
      Game: "🎮",
      Sport: "⚽",
      Team: "🏆",
      TV_Show: "📺",
    },
  },
} as const;
