/**
 * Song Entity Schema - Cultural Domain
 *
 * Schema for song entities in the cultural domain.
 * Covers songs, musical compositions, and recorded music.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Song Entity Schema ====================

export const SongEntitySchema = EntitySchema.extend({
  type: z.literal("Song"),
  properties: z
    .object({
      artist: z.array(z.string()).optional(), // Artist person UIDs
      composer: z.array(z.string()).optional(), // Composer person UIDs
      lyricist: z.array(z.string()).optional(), // Lyricist person UIDs
      album: z.string().optional(), // Album name or UID
      releaseDate: z.string().optional(), // ISO date
      recordLabel: z.string().optional(), // Record label UID
      duration: z.number().min(1).optional(), // Duration in seconds
      genre: z.array(z.string()).optional(),
      language: z.string().optional(),
      key: z.string().optional(), // Musical key
      tempo: z.number().min(1).optional(), // Beats per minute
      timeSignature: z.string().optional(), // e.g., "4/4", "3/4"
      isrc: z.string().optional(), // International Standard Recording Code
      catalog: z.string().optional(), // Catalog number
      trackNumber: z.number().min(1).optional(), // Track number on album
      producer: z.array(z.string()).optional(), // Producer person UIDs
      engineer: z.array(z.string()).optional(), // Audio engineer UIDs
      studio: z.string().optional(), // Recording studio
      recordingDate: z.string().optional(), // ISO date
      instruments: z.array(z.string()).optional(), // Instruments used
      vocals: z
        .object({
          lead: z.array(z.string()).optional(), // Lead vocalist UIDs
          backing: z.array(z.string()).optional(), // Backing vocalist UIDs
        })
        .optional(),
      charts: z
        .object({
          billboard: z.number().min(1).optional(), // Billboard chart position
          uk: z.number().min(1).optional(), // UK chart position
          international: z.record(z.string(), z.number().min(1)).optional(),
        })
        .optional(),
      certifications: z.array(z.string()).optional(), // Gold, Platinum, etc.
      covers: z.array(z.string()).optional(), // Cover version UIDs
      samples: z.array(z.string()).optional(), // Sampled song UIDs
      remixes: z.array(z.string()).optional(), // Remix version UIDs
      musicVideo: z.string().optional(), // Music video UID
      live: z.boolean().optional(), // Live recording
      acoustic: z.boolean().optional(), // Acoustic version
      instrumental: z.boolean().optional(), // Instrumental version
    })
    .optional(),
});

// ==================== UID Validation ====================

export const SONG_UID_PREFIX = "song";

export const validateSongUID = (uid: string): boolean => {
  return uid.startsWith("song:");
};

// ==================== Type Exports ====================

export type SongEntity = z.infer<typeof SongEntitySchema>;
