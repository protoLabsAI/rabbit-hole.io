/**
 * Course Entity Schema - Academic Domain
 *
 * Schema for course entities in the academic domain.
 * Covers academic courses, classes, and educational units.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Course Entity Schema ====================

export const CourseEntitySchema = EntitySchema.extend({
  type: z.literal("Course"),
  properties: z
    .object({
      courseCode: z.string().optional(), // Course code/number
      creditHours: z.number().min(0).optional(),
      level: z
        .enum([
          "undergraduate",
          "graduate",
          "postgraduate",
          "doctoral",
          "continuing_education",
          "professional_development",
        ])
        .optional(),
      department: z.string().optional(), // Academic department
      school: z.string().optional(), // School/college within university
      university: z.string().optional(), // University UID
      instructor: z.array(z.string()).optional(), // Instructor person UIDs
      semester: z
        .enum(["fall", "spring", "summer", "winter", "year_long"])
        .optional(),
      year: z.number().min(1900).optional(),
      schedule: z
        .object({
          days: z.array(z.string()).optional(), // Days of week
          time: z.string().optional(), // Class time
          location: z.string().optional(), // Classroom/location
        })
        .optional(),
      prerequisites: z.array(z.string()).optional(), // Prerequisite course UIDs
      corequisites: z.array(z.string()).optional(), // Corequisite course UIDs
      syllabus: z
        .object({
          learningObjectives: z.array(z.string()).optional(),
          topics: z.array(z.string()).optional(),
          assignments: z.array(z.string()).optional(),
          examinations: z.array(z.string()).optional(),
          grading: z.string().optional(), // Grading policy
        })
        .optional(),
      textbooks: z.array(z.string()).optional(), // Required textbooks
      enrollment: z
        .object({
          capacity: z.number().min(0).optional(),
          current: z.number().min(0).optional(),
          waitlist: z.number().min(0).optional(),
        })
        .optional(),
      delivery: z
        .enum(["in_person", "online", "hybrid", "synchronous", "asynchronous"])
        .optional(),
      field: z.string().optional(), // Academic field/subject
      subfields: z.array(z.string()).optional(),
      language: z.string().optional(),
      intensive: z.boolean().optional(), // Intensive course
      laboratory: z.boolean().optional(), // Has lab component
      seminar: z.boolean().optional(), // Seminar format
      practicum: z.boolean().optional(), // Practical experience
      thesis: z.boolean().optional(), // Thesis course
      pass_fail: z.boolean().optional(), // Pass/fail grading
    })
    .optional(),
});

// ==================== UID Validation ====================

export const COURSE_UID_PREFIX = "course";

export const validateCourseUID = (uid: string): boolean => {
  return uid.startsWith("course:");
};

// ==================== Type Exports ====================

export type CourseEntity = z.infer<typeof CourseEntitySchema>;
