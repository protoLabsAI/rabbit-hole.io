/**
 * Film Entity Schema - Cultural Domain
 *
 * Schema for film entities in the cultural domain.
 * Covers movies, documentaries, and cinematic works.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Film Entity Schema ====================

export const FilmEntitySchema = EntitySchema.extend({
  type: z.literal("Film"),
  properties: z
    .object({
      releaseDate: z.string().optional(), // ISO date
      director: z.array(z.string()).optional(), // Director person UIDs
      producer: z.array(z.string()).optional(), // Producer person UIDs
      cast: z.array(z.string()).optional(), // Actor person UIDs
      runtime: z.number().min(1).optional(), // Runtime in minutes
      genre: z.array(z.string()).optional(),
      studio: z.string().optional(), // Production studio UID
      distributor: z.string().optional(), // Distribution company UID
      budget: z.number().min(0).optional(), // Production budget
      boxOffice: z.number().min(0).optional(), // Box office earnings
      language: z.array(z.string()).optional(),
      country: z.array(z.string()).optional(), // Countries of origin
      rating: z
        .enum(["G", "PG", "PG-13", "R", "NC-17", "NR", "Unrated"])
        .optional(),
      format: z
        .enum(["35mm", "16mm", "digital", "imax", "3d", "70mm", "super_16"])
        .optional(),
      cinematography: z.string().optional(), // Cinematographer UID
      music: z.string().optional(), // Composer UID
      editing: z.string().optional(), // Editor UID
      screenwriter: z.array(z.string()).optional(), // Writer person UIDs
      basedOn: z.string().optional(), // Source material (book, play, etc.)
      sequel: z.boolean().optional(),
      franchise: z.string().optional(), // Film franchise/series
      awards: z.array(z.string()).optional(), // Awards won
      festivals: z.array(z.string()).optional(), // Film festivals
      reviews: z
        .object({
          criticsScore: z.number().min(0).max(100).optional(),
          audienceScore: z.number().min(0).max(100).optional(),
          imdbRating: z.number().min(0).max(10).optional(),
        })
        .optional(),
      availability: z
        .object({
          theatrical: z.boolean().optional(),
          streaming: z.array(z.string()).optional(), // Streaming platforms
          dvd: z.boolean().optional(),
          bluray: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const FILM_UID_PREFIX = "film";

export const validateFilmUID = (uid: string): boolean => {
  return uid.startsWith("film:");
};

// ==================== Type Exports ====================

export type FilmEntity = z.infer<typeof FilmEntitySchema>;
