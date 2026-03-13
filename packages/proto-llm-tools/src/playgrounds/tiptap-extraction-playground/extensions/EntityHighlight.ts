import { Mark, mergeAttributes } from "@tiptap/core";

export interface EntityHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    entityHighlight: {
      setEntityHighlight: (attributes: {
        entityUid: string;
        entityType: string;
        entityName: string;
        domain: string;
        confidence: number;
        color: string;
        attributes: Record<string, any>;
      }) => ReturnType;
      unsetEntityHighlight: () => ReturnType;
    };
  }
}

export const EntityHighlight = Mark.create<EntityHighlightOptions>({
  name: "entityHighlight",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      entityUid: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-uid"),
        renderHTML: (attributes) => {
          if (!attributes.entityUid) {
            return {};
          }
          return {
            "data-entity-uid": attributes.entityUid,
          };
        },
      },
      entityType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-type"),
        renderHTML: (attributes) => {
          if (!attributes.entityType) {
            return {};
          }
          return {
            "data-entity-type": attributes.entityType,
          };
        },
      },
      entityName: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-name"),
        renderHTML: (attributes) => {
          if (!attributes.entityName) {
            return {};
          }
          return {
            "data-entity-name": attributes.entityName,
          };
        },
      },
      domain: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-domain"),
        renderHTML: (attributes) => {
          if (!attributes.domain) {
            return {};
          }
          return {
            "data-domain": attributes.domain,
          };
        },
      },
      confidence: {
        default: 1.0,
        parseHTML: (element) =>
          parseFloat(element.getAttribute("data-confidence") || "1.0"),
        renderHTML: (attributes) => {
          return {
            "data-confidence": attributes.confidence,
          };
        },
      },
      color: {
        default: "#3b82f6",
        parseHTML: (element) => element.getAttribute("data-color"),
        renderHTML: (attributes) => {
          return {
            "data-color": attributes.color,
          };
        },
      },
      attributes: {
        default: {},
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute("data-attributes") || "{}");
          } catch {
            return {};
          }
        },
        renderHTML: (attributes) => {
          return {
            "data-attributes": JSON.stringify(attributes.attributes || {}),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-entity-uid]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const confidence = HTMLAttributes.confidence || 1.0;
    const opacity = confidence > 0.9 ? 1.0 : confidence > 0.75 ? 0.8 : 0.6;
    const color = HTMLAttributes.color || "#3b82f6";

    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class:
          "entity-highlight cursor-pointer rounded px-1 py-0.5 transition-all hover:shadow-md",
        style: `background-color: ${color}${Math.round(opacity * 255 * 0.3)
          .toString(16)
          .padStart(2, "0")}; border-bottom: 2px solid ${color}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setEntityHighlight:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      unsetEntityHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
