# @protolabsai/yjs-history - Complete File Tree

```
packages/yjs-history/
│
├── 📄 START_HERE.md                      ⭐ Quick navigation guide
├── 📄 PACKAGE_INDEX.md                   📋 Package overview
├── 📄 QUICK_START.md                     🚀 30-second integration
├── 📄 README.md                          📖 Full API reference (400+ lines)
├── 📄 MIGRATION_GUIDE.md                 🔄 Step-by-step migration
├── 📄 INTEGRATION_CHECKLIST.md           ✅ Task-by-task checklist
├── 📄 IMPLEMENTATION_SUMMARY.md          🏗️  Architecture & design decisions
├── 📄 TEST_SUMMARY.md                    🧪 Test coverage report
├── 📄 FILE_TREE.md                       📂 This file
│
├── 📦 package.json                       Package manifest
├── 🔧 tsconfig.json                      TypeScript config
├── 🔧 tsup.config.ts                     Build config
├── 🔧 vitest.config.ts                   Test config
├── 🚫 .gitignore                         Git ignore rules
│
├── 📁 dist/                              Built output
│   ├── index.js                          ESM bundle
│   ├── index.cjs                         CommonJS bundle
│   ├── index.d.ts                        Type definitions
│   └── *.map                             Source maps
│
└── 📁 src/                               Source code
    │
    ├── 📄 index.ts                       Main exports
    ├── 📄 types.ts                       TypeScript definitions
    │
    ├── 📁 core/                          Core version management
    │   ├── version-manager.ts            Version snapshot logic
    │   ├── index.ts                      Core exports
    │   └── __tests__/
    │       └── version-manager.test.ts   17 tests (15 passing, 2 skipped)
    │
    ├── 📁 hooks/                         React hooks
    │   ├── useYjsHistory.ts              Main history hook (272 lines)
    │   ├── useReactFlowYjsHistory.ts     React Flow variant (100 lines)
    │   ├── index.ts                      Hook exports
    │   └── __tests__/
    │       └── useYjsHistory.test.ts     21 tests (20 passing, 1 skipped)
    │
    ├── 📁 storage/                       Storage adapters
    │   ├── indexeddb-storage.ts          Browser persistence (120 lines)
    │   ├── memory-storage.ts             In-memory storage (50 lines)
    │   ├── index.ts                      Storage exports
    │   └── __tests__/
    │       └── memory-storage.test.ts    12 tests (all passing)
    │
    └── 📁 utils/                         Utility functions
        ├── version-browser.ts            Browsing utilities (200 lines)
        ├── index.ts                      Utils exports
        └── __tests__/
            └── version-browser.test.ts   30 tests (all passing)
```

---

## Documentation Tree

```
/
├── 📄 HANDOFF_YJS_HISTORY_INTEGRATION.md  ⭐ MAIN HANDOFF (1,021 lines)
├── 📄 YJS_HISTORY_PACKAGE_SUMMARY.md      Executive summary
│
└── docs/developer/features/
    └── 📄 yjs-history-system.md           Developer documentation
```

---

## File Count Summary

| Category | Files | Lines |
|----------|-------|-------|
| **Source Code** | 11 | ~1,500 |
| **Tests** | 4 | ~625 |
| **Documentation** | 11 | ~3,500 |
| **Config** | 4 | ~100 |
| **Built Output** | 6 | Auto-generated |
| **Total** | 36 | ~5,700+ |

---

## Test Files Detail

```
src/
├── core/__tests__/
│   └── version-manager.test.ts          ✓ 15/17 (2 skipped)
├── hooks/__tests__/
│   └── useYjsHistory.test.ts            ✓ 20/21 (1 skipped)
├── storage/__tests__/
│   └── memory-storage.test.ts           ✓ 12/12
└── utils/__tests__/
    └── version-browser.test.ts          ✓ 30/30

Total: 77 passing | 3 skipped | 80 total
```

---

## Key File Purposes

### Source Files
| File | Purpose | LOC |
|------|---------|-----|
| `types.ts` | Core TypeScript definitions | 150 |
| `core/version-manager.ts` | Version snapshot management | 130 |
| `hooks/useYjsHistory.ts` | Main history hook | 272 |
| `hooks/useReactFlowYjsHistory.ts` | React Flow integration | 100 |
| `storage/indexeddb-storage.ts` | Browser persistence | 120 |
| `storage/memory-storage.ts` | In-memory storage | 50 |
| `utils/version-browser.ts` | Browsing utilities | 200 |

### Documentation Files
| File | Purpose | LOC |
|------|---------|-----|
| `START_HERE.md` | Navigation guide | 200 |
| `README.md` | API reference | 400 |
| `QUICK_START.md` | Fast integration | 250 |
| `MIGRATION_GUIDE.md` | Migration steps | 350 |
| `INTEGRATION_CHECKLIST.md` | Task list | 300 |
| `TEST_SUMMARY.md` | Test report | 400 |
| `IMPLEMENTATION_SUMMARY.md` | Architecture | 300 |
| `PACKAGE_INDEX.md` | Overview | 250 |

### Handoff Files
| File | Purpose | LOC |
|------|---------|-----|
| `/HANDOFF_YJS_HISTORY_INTEGRATION.md` | Main handoff | 1,021 |
| `/YJS_HISTORY_PACKAGE_SUMMARY.md` | Executive summary | 300 |

---

## Integration Files (To Modify)

```
apps/rabbit-hole/app/research/
│
├── hooks/
│   └── useWorkspace.ts                  [MODIFY] Replace useYjsUndo
│
├── components/
│   ├── VersionBrowserDialog.tsx         [CREATE] New dialog
│   │
│   └── workspace/
│       ├── canvas/
│       │   └── GraphCanvasIntegrated.tsx  [MODIFY] Add version UI
│       │
│       └── toolbar/
│           └── GraphToolbarButtons.tsx    [MODIFY] Add buttons
│
└── ResearchPage.tsx                     [MODIFY] Pass props
```

---

## Quick Reference

### Import Statement
```typescript
import {
  useYjsHistory,
  IndexedDBVersionStorage,
  type VersionMetadata,
} from "@protolabsai/yjs-history";
```

### Basic Usage
```typescript
const { undo, redo, canUndo, canRedo } = useYjsHistory({
  ydoc,
  userId,
  scope: yWorkspace,
});
```

### With Versioning
```typescript
const {
  undo, redo, canUndo, canRedo,
  createVersion, listVersions, restoreVersion
} = useYjsHistory({
  ydoc,
  userId,
  scope: yWorkspace,
  enableVersioning: true,
  versionStorage: new IndexedDBVersionStorage(workspaceId),
});
```

---

**Start integration:** `/HANDOFF_YJS_HISTORY_INTEGRATION.md`




