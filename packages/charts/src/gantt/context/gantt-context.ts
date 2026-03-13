/**
 * Gantt Context
 *
 * React context for sharing Gantt configuration and state
 */

import { createContext } from "react";

import type { GanttContextProps } from "../types";

export const GanttContext = createContext<GanttContextProps | null>(null);
