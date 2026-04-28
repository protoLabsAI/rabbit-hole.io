import { NodeResizer, type NodeProps } from "@xyflow/react";
import { useState, useRef, useEffect } from "react";

export interface TextNodeData {
  text?: string;
  fontSize?: number;
  fontColor?: string;
  fontWeight?: "normal" | "bold";
  textAlign?: "left" | "center" | "right";
  backgroundColor?: string;
  backgroundOpacity?: number;
  padding?: number;
  userId?: string;
  createdAt?: number;
  isEditing?: boolean;
  onTextUpdate?: (nodeId: string, text: string) => void;
}

export function TextNode({ data, selected, dragging, id }: NodeProps) {
  const textData = data as unknown as TextNodeData;
  const [isEditing, setIsEditing] = useState(textData.isEditing ?? false);
  const [text, setText] = useState(textData.text || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onTextUpdate = (textData as any).onTextUpdate;
  const onDelete = (textData as any).onDelete;

  const fontSize = textData.fontSize ?? 16;
  const fontColor = textData.fontColor || "217 91% 40%";
  const fontWeight = textData.fontWeight ?? "normal";
  const textAlign = textData.textAlign ?? "left";
  const backgroundColor = textData.backgroundColor;
  const backgroundOpacity = textData.backgroundOpacity ?? 0;
  const padding = textData.padding ?? 8;

  // Auto-focus when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Enter edit mode when selected (only for new nodes)
  useEffect(() => {
    if (selected && !isEditing && textData.isEditing) {
      setIsEditing(true);
    }
  }, [selected, textData.isEditing]);

  // Exit edit mode and delete if deselected with empty text
  useEffect(() => {
    if (!selected && isEditing) {
      setIsEditing(false);
      if (!text.trim() && onDelete) {
        onDelete(id);
      } else if (onTextUpdate) {
        onTextUpdate(id, text);
      }
    }
  }, [selected]);

  const handleBlur = () => {
    setIsEditing(false);
    if (onTextUpdate) {
      onTextUpdate(id, text);
    }
    // Delete if empty
    if (!text.trim() && onDelete) {
      onDelete(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsEditing(false);
      if (textareaRef.current) {
        textareaRef.current.blur();
      }
    }
    // Don't allow Enter to create new lines (single-line text)
    // Remove this if you want multi-line support
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <NodeResizer
        isVisible={selected && !dragging}
        minWidth={50}
        minHeight={30}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: `${padding}px`,
          backgroundColor: backgroundColor
            ? `hsl(${backgroundColor} / ${backgroundOpacity})`
            : "transparent",
          border: selected ? `2px solid hsl(${fontColor})` : "none",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent:
            textAlign === "center"
              ? "center"
              : textAlign === "right"
                ? "flex-end"
                : "flex-start",
        }}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Type text..."
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              resize: "none",
              fontSize: `${fontSize}px`,
              color: `hsl(${fontColor})`,
              fontWeight,
              textAlign,
              fontFamily: "inherit",
            }}
          />
        ) : (
          <div
            onDoubleClick={() => setIsEditing(true)}
            style={{
              fontSize: `${fontSize}px`,
              color: `hsl(${fontColor})`,
              fontWeight,
              textAlign,
              width: "100%",
              cursor: selected ? "text" : "default",
              userSelect: "none",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {text || "Double-click to edit"}
          </div>
        )}
      </div>
    </div>
  );
}
