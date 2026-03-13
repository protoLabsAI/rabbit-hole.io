/**
 * useGanttScrollX Hook
 *
 * Global state for horizontal scroll position
 */

import { atom, useAtom } from "jotai";

const scrollXAtom = atom(0);

export const useGanttScrollX = () => useAtom(scrollXAtom);
