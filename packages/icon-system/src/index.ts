/**
 * @proto/icon-system
 *
 * Simple icon wrapper for lucide-react
 */

export { Icon } from "./Icon";
export type { IconProps } from "./Icon";

// Registry and types
export { iconRegistry } from "./registry";
export type { IconDefinition, IconCategory } from "./types";
export type { RegisteredIconName } from "./generated-types";

// Discovery utilities
export {
  listAllIcons,
  listByCategory,
  searchIcons,
  getCategorySummary,
  getIcon,
  hasIcon,
  getAllIconNames,
} from "./discovery";
