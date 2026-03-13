"use client";

import { Icon } from "@proto/ui/atoms";

export type TodoStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Todo {
  content: string;
  status: TodoStatus;
}

export interface ProgressCardProps {
  todos: Todo[];
  confidence?: number;
  completeness?: number;
}

export function ProgressCard({
  todos,
  confidence,
  completeness,
}: ProgressCardProps) {
  if (todos.length === 0) return null;

  return (
    <div>
      <div className="space-y-3">
        {todos.map((todo, i) => (
          <div key={i} className="flex items-center gap-2">
            {todo.status === "completed" && (
              <Icon name="check-circle" className="text-green-600" size={16} />
            )}
            {todo.status === "in_progress" && (
              <Icon name="loader-2" className="animate-spin" size={16} />
            )}
            {todo.status === "pending" && (
              <Icon name="circle" className="text-muted-foreground" size={16} />
            )}
            {todo.status === "failed" && (
              <Icon name="x-circle" className="text-destructive" size={16} />
            )}
            <span
              className={`text-sm ${todo.status === "completed" ? "text-muted-foreground" : ""}`}
            >
              {todo.content}
            </span>
          </div>
        ))}
      </div>

      {(confidence !== undefined && confidence > 0) ||
      (completeness !== undefined && completeness > 0) ? (
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
          <div className="text-center p-2 rounded bg-muted">
            <div className="text-xs text-muted-foreground">Confidence</div>
            <div className="text-lg font-bold">
              {Math.round((confidence || 0) * 100)}%
            </div>
          </div>
          <div className="text-center p-2 rounded bg-muted">
            <div className="text-xs text-muted-foreground">Completeness</div>
            <div className="text-lg font-bold">
              {Math.round((completeness || 0) * 100)}%
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
