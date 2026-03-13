/**
 * Node Type Mapper
 *
 * Maps entity types to React Flow node types for custom rendering
 */

export function getNodeTypeFromEntity(entityType: string): string {
  // Design system entities
  if (entityType === "Color_Token" || entityType === "Style_Token") {
    return "designToken";
  }
  if (
    entityType === "Button_Component" ||
    entityType === "Card_Component" ||
    entityType === "Image_Component"
  ) {
    return "designComponent";
  }

  // Freehand drawings
  if (entityType === "Freehand_Drawing") {
    return "freehand";
  }

  // Default to entity card
  return "entity";
}
