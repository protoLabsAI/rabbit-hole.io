import { describe, test, expect } from "vitest";

import { uiReducer, initialUIState } from "../uiReducer";

describe.skip("Dialog History", () => {
  test("pushes dialog history item", () => {
    const action = {
      type: "PUSH_DIALOG_HISTORY" as const,
      payload: {
        item: {
          dialogType: "familyAnalysis",
          title: "Family Analysis: John Doe",
          entityUid: "person:john-doe",
          entityName: "John Doe",
        },
      },
    };

    const newState = uiReducer(initialUIState, action);

    expect(newState.dialogHistory.items).toHaveLength(1);
    expect(newState.dialogHistory.currentIndex).toBe(0);
    expect(newState.dialogHistory.items[0].dialogType).toBe("familyAnalysis");
    expect(newState.dialogHistory.items[0].title).toBe(
      "Family Analysis: John Doe"
    );
    expect(newState.dialogHistory.items[0].entityUid).toBe("person:john-doe");
  });

  test("pops dialog history (goes back)", () => {
    const stateWithHistory = {
      ...initialUIState,
      dialogHistory: {
        items: [
          {
            id: "history_1",
            dialogType: "familyAnalysis",
            title: "Family Analysis: John Doe",
            entityUid: "person:john-doe",
            entityName: "John Doe",
            timestamp: Date.now(),
          },
          {
            id: "history_2",
            dialogType: "biographicalAnalysis",
            title: "Bio Analysis: Jane Doe",
            entityUid: "person:jane-doe",
            entityName: "Jane Doe",
            timestamp: Date.now(),
          },
        ],
        currentIndex: 1,
      },
    };

    const action = { type: "POP_DIALOG_HISTORY" as const };
    const newState = uiReducer(stateWithHistory, action);

    expect(newState.dialogHistory.currentIndex).toBe(0);
  });

  test("goes to specific history item", () => {
    const stateWithHistory = {
      ...initialUIState,
      dialogHistory: {
        items: [
          {
            id: "1",
            dialogType: "familyAnalysis",
            title: "Item 1",
            timestamp: Date.now(),
          },
          {
            id: "2",
            dialogType: "biographicalAnalysis",
            title: "Item 2",
            timestamp: Date.now(),
          },
          {
            id: "3",
            dialogType: "researchReport",
            title: "Item 3",
            timestamp: Date.now(),
          },
        ],
        currentIndex: 2,
      },
    };

    const action = {
      type: "GO_TO_HISTORY_ITEM" as const,
      payload: { index: 1 },
    };

    const newState = uiReducer(stateWithHistory, action);
    expect(newState.dialogHistory.currentIndex).toBe(1);
  });

  test("clears dialog history", () => {
    const stateWithHistory = {
      ...initialUIState,
      dialogHistory: {
        items: [
          {
            id: "1",
            dialogType: "familyAnalysis",
            title: "Item 1",
            timestamp: Date.now(),
          },
          {
            id: "2",
            dialogType: "biographicalAnalysis",
            title: "Item 2",
            timestamp: Date.now(),
          },
        ],
        currentIndex: 1,
      },
    };

    const action = { type: "CLEAR_DIALOG_HISTORY" as const };
    const newState = uiReducer(stateWithHistory, action);

    expect(newState.dialogHistory.items).toHaveLength(0);
    expect(newState.dialogHistory.currentIndex).toBe(-1);
  });

  test("handles invalid history navigation", () => {
    const action1 = { type: "POP_DIALOG_HISTORY" as const };
    const newState1 = uiReducer(initialUIState, action1);
    expect(newState1.dialogHistory.currentIndex).toBe(-1); // No change when no history

    const action2 = {
      type: "GO_TO_HISTORY_ITEM" as const,
      payload: { index: 999 },
    };
    const newState2 = uiReducer(initialUIState, action2);
    expect(newState2.dialogHistory.currentIndex).toBe(-1); // No change for invalid index
  });
});
