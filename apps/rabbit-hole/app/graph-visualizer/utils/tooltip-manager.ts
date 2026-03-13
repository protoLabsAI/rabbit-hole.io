/**
 * Shared Tooltip Management Utility
 *
 * Centralized tooltip logic used by both NodeHover component and useCytoscape hook
 * to avoid code duplication and ensure consistent behavior.
 */

import React from "react";

/**
 * Create and show React domain card tooltip
 */
export async function createReactDomainTooltip(
  node: any
): Promise<HTMLElement> {
  const [{ DomainCardFactory }, { createRoot }] = await Promise.all([
    import("../components/domain-cards/DomainCardFactory"),
    import("react-dom/client"),
  ]);

  // Create container with proper z-index
  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "absolute",
    zIndex: "10000",
    pointerEvents: "none",
    maxWidth: "320px",
  });

  // React render with standard domain card (shows type/domain)
  // DomainCardFactory uses Tailwind classes that respect whitelabel theme
  const root = createRoot(container);
  root.render(
    React.createElement(DomainCardFactory, {
      cytoscapeNode: node,
      cardProps: {
        size: "standard", // Show type/domain info like selected entity card
        className: "shadow-lg", // Let Tailwind handle theming, just add shadow
      },
    })
  );

  // Add to DOM and store React root
  document.body.appendChild(container);
  (container as any)._reactRoot = root;

  return container;
}

/**
 * Cleanup React domain tooltip
 */
export function cleanupReactDomainTooltip(tooltip: HTMLElement): void {
  const reactRoot = (tooltip as any)._reactRoot;

  if (reactRoot) {
    reactRoot.unmount();
  }
  if (tooltip.parentNode) {
    tooltip.parentNode.removeChild(tooltip);
  }
}

/**
 * Hide all visible tooltips in the graph
 * Use when opening context menus, detail panels, or other UI that should hide tooltips
 */
export function hideAllTooltips(cy: any): void {
  if (!cy) return;

  cy.nodes().forEach((node: any) => {
    const tooltip = node.data("tooltip");
    const popperInstance = node.data("popperInstance");

    if (tooltip) {
      tooltip.style.visibility = "hidden";
      tooltip.style.opacity = "0";

      setTimeout(() => {
        try {
          cleanupReactDomainTooltip(tooltip);
          if (popperInstance && typeof popperInstance.destroy === "function") {
            popperInstance.destroy();
          }
          node.removeData("tooltip");
          node.removeData("popperInstance");
          node.removeData("reactRoot");
        } catch (error) {
          console.warn("⚠️ Error hiding tooltip:", error);
        }
      }, 50);
    }
  });
}

/**
 * Setup tooltip with popper positioning
 */
export function setupTooltipPopper(
  node: any,
  tooltipElement: HTMLElement
): any {
  const popperInstance = node.popper({
    content: () => tooltipElement,
    popper: {
      placement: "top",
      modifiers: [
        {
          name: "preventOverflow",
          options: { boundary: "viewport" },
        },
      ],
    },
  });

  // Store references for cleanup
  node.data("tooltip", tooltipElement);
  node.data("popperInstance", popperInstance);
  if ((tooltipElement as any)._reactRoot) {
    node.data("reactRoot", (tooltipElement as any)._reactRoot);
  }

  // Make visible
  tooltipElement.style.visibility = "visible";
  tooltipElement.style.opacity = "1";

  return popperInstance;
}
