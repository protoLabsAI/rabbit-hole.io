import { z } from "zod";

/**
 * Icon System Types
 */

export const IconSizeSchema = z.enum(["xs", "sm", "md", "lg", "xl"]);
export type IconSize = z.infer<typeof IconSizeSchema>;

export const IconCategorySchema = z.enum([
  "navigation",
  "communication",
  "actions",
  "status",
  "data",
  "domain",
  "utility",
]);
export type IconCategory = z.infer<typeof IconCategorySchema>;

export const IconLibrarySchema = z.enum([
  "lucide",
  "react-icons",
  "custom",
  "emoji",
]);
export type IconLibrary = z.infer<typeof IconLibrarySchema>;

export const IconThemeBindingsSchema = z
  .object({
    useThemeColor: z.boolean().optional(),
    allowColorOverride: z.boolean().optional(),
    allowSizeOverride: z.boolean().optional(),
  })
  .optional();

export type IconThemeBindings = z.infer<typeof IconThemeBindingsSchema>;

export const IconDefinitionSchema = z.object({
  name: z.string(),
  library: IconLibrarySchema,
  identifier: z.string(),
  aliases: z.array(z.string()).optional(),
  category: IconCategorySchema,
  description: z.string().optional(),
  themeBindings: IconThemeBindingsSchema,
});

export type IconDefinition = z.infer<typeof IconDefinitionSchema>;

export interface IconProps {
  name: string;
  size?: IconSize | number;
  color?: string;
  className?: string;
  strokeWidth?: number;
  fill?: string;
  "aria-label"?: string;
}

export interface IconProviderProps {
  definition: IconDefinition;
  size: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
}

export type IconProvider = React.ComponentType<IconProviderProps>;
