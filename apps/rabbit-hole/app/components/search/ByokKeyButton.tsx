"use client";

import { useState } from "react";

import { useByokKey } from "../../hooks/useByokKey";

/**
 * Bring-your-own-key control for the public demo. Lets a visitor paste their
 * own LLM key, stored only in localStorage and attached as a per-request header
 * (see useChatSearch). The key never touches our server or storage.
 */
export function ByokKeyButton() {
  const { key, hasKey, setKey, clearKey } = useByokKey();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="fixed top-4 right-4 z-40">
      <button
        type="button"
        onClick={() => {
          setDraft(key ?? "");
          setOpen((o) => !o);
        }}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Bring your own key"
      >
        <span
          className={`h-2 w-2 rounded-full ${
            hasKey ? "bg-emerald-500" : "bg-muted-foreground/40"
          }`}
        />
        {hasKey ? "Key set" : "Add key"}
      </button>

      {open && (
        <>
          {/* click-away */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 mt-2 w-80 z-40 rounded-xl border border-border bg-background p-4 shadow-lg">
            <div className="text-sm font-medium text-foreground">
              Bring your own key
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Paste your own Anthropic API key to run the live demo. It is
              stored only in this browser and sent straight to the model — never
              to our server.
            </p>
            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setKey(draft);
                  setOpen(false);
                }
              }}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
              className="mt-3 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  clearKey();
                  setDraft("");
                }}
                disabled={!hasKey}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  setKey(draft);
                  setOpen(false);
                }}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
