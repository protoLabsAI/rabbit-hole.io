import { computePosition, flip, shift, limitShift } from "@floating-ui/dom";

/**
 * Floating-ui popper factory for cytoscape-popper
 */
export function createFloatingUIPopperFactory() {
  return function popperFactory(
    ref: any,
    content: HTMLElement,
    opts: any = {}
  ) {
    // Configure floating-ui middleware - matching default Popper@2 behavior
    const popperOptions = {
      middleware: [flip(), shift({ limiter: limitShift() })],
      placement: "top" as const,
      ...opts,
    };

    function update() {
      computePosition(ref, content, popperOptions).then(({ x, y }) => {
        Object.assign(content.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
      });
    }

    update();
    return { update };
  };
}

/**
 * Create tooltip content element
 */
export function createTooltipContent(
  entityName: string,
  entityUID: string
): HTMLElement {
  const div = document.createElement("div");
  div.className = "atlas-tooltip";

  // Set styles directly on the element for better performance
  Object.assign(div.style, {
    position: "absolute",
    zIndex: "9999",
    backgroundColor: "#1f2937",
    color: "#f9fafb",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    border: "1px solid #374151",
    maxWidth: "250px",
    pointerEvents: "none",
    opacity: "0",
    transition: "opacity 0.15s ease-in-out",
  });

  const nameElement = document.createElement("div");
  nameElement.style.fontWeight = "600";
  nameElement.style.marginBottom = "2px";
  nameElement.textContent = entityName;

  const uidElement = document.createElement("div");
  uidElement.style.fontSize = "10px";
  uidElement.style.color = "#9ca3af";
  uidElement.textContent = entityUID;

  div.appendChild(nameElement);
  div.appendChild(uidElement);

  // Add to document body
  document.body.appendChild(div);

  return div;
}

/**
 * Show tooltip with fade in animation
 */
export function showTooltip(tooltip: HTMLElement) {
  tooltip.style.opacity = "1";
}

/**
 * Hide tooltip with fade out animation
 */
export function hideTooltip(tooltip: HTMLElement) {
  tooltip.style.opacity = "0";
}

/**
 * Remove tooltip from DOM
 */
export function destroyTooltip(tooltip: HTMLElement) {
  if (tooltip && tooltip.parentNode) {
    tooltip.parentNode.removeChild(tooltip);
  }
}

/**
 * Extract entity information from cytoscape node
 */
export function extractEntityInfo(node: any): { name: string; uid: string } {
  const originalNode = node.data("originalNode");
  const label = node.data("label");

  // Try to get name and uid from originalNode, fallback to label and id
  const name =
    originalNode?.display?.title || originalNode?.label || label || "Unknown";
  const uid =
    originalNode?.id || originalNode?.uid || node.data("id") || "unknown";

  return { name, uid };
}
