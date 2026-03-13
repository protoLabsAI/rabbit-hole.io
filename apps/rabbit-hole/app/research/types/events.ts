/**
 * Research Canvas Event System
 *
 * Type-safe custom events for canvas interactions with namespacing
 * to prevent cross-canvas pollution in multi-tab workspaces.
 */

export const RESEARCH_EVENTS = {
  ZOOM_IN: "research:canvas:zoom-in",
  ZOOM_OUT: "research:canvas:zoom-out",
  FIT_VIEW: "research:canvas:fit-view",
} as const;

export type ResearchEventType =
  (typeof RESEARCH_EVENTS)[keyof typeof RESEARCH_EVENTS];

export interface ResearchEventDetail {
  canvasId?: string;
  tabId?: string;
}

export type ResearchZoomInEvent = CustomEvent<ResearchEventDetail>;
export type ResearchZoomOutEvent = CustomEvent<ResearchEventDetail>;
export type ResearchFitViewEvent = CustomEvent<ResearchEventDetail>;

/**
 * Type guard to check if event is a ResearchEvent
 */
export function isResearchEvent(
  event: Event
): event is CustomEvent<ResearchEventDetail> {
  return event instanceof CustomEvent && event.type.startsWith("research:");
}

/**
 * Dispatch a research canvas event with type safety
 */
export function dispatchResearchEvent(
  type: ResearchEventType,
  detail?: ResearchEventDetail
): void {
  window.dispatchEvent(new CustomEvent(type, { detail: detail || {} }));
}
