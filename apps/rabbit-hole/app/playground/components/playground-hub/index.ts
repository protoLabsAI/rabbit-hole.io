/**
 * Playground Hub
 *
 * Master component for accessing all playgrounds with dynamic loading.
 */

export { PlaygroundHub } from "./PlaygroundHub";
export type { PlaygroundHubProps } from "./PlaygroundHub";

export { playgroundRegistry, getPlaygroundById } from "./registry";
export type {
  PlaygroundRegistryEntry,
  PlaygroundCategory,
} from "./registry/types";
