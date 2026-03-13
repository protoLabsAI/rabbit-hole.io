/**
 * useGanttContext Hook
 *
 * Access Gantt context from any child component
 */

import { useContext } from "react";

import { GanttContext } from "../context/gantt-context";

export const useGanttContext = () => {
  const context = useContext(GanttContext);

  if (!context) {
    throw new Error("useGanttContext must be used within GanttProvider");
  }

  return context;
};
