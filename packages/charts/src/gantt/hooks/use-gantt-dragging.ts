/**
 * useGanttDragging Hook
 *
 * Global state for drag operations
 */

import { atom, useAtom } from "jotai";

const draggingAtom = atom(false);

export const useGanttDragging = () => useAtom(draggingAtom);
