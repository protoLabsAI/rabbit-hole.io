/**
 * CSS Module Type Declarations
 *
 * Allows TypeScript to recognize CSS file imports.
 */

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

declare module "tldraw/tldraw.css";
declare module "./research-chat.css";
