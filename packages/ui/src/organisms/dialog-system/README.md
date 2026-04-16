# Dialog System Components

**Note:** This directory contains portable dialog components only.

## Exported Components

- ✅ `ConditionalDialog` - Permission-based dialog triggers
- ✅ `ConfirmPopover` - Confirmation popover for destructive actions

## App-Specific Components (Not Exported)

These remain in `app/components/ui/` due to app-specific dependencies:

- `DialogRegistry` - Requires app dialog hooks
- `DialogHistoryNavigation` - Requires useDialogHistory hook
- Dialog stories - Require app dialog system integration

## Type Errors

Type errors in `history-navigation/`, `file-upload-button/`, `theme-selector/`, `themed-user-button/`, and `user-stats-page/` are expected - these components are excluded from package exports and remain as reference implementations only.

## Usage

```tsx
import { ConditionalDialog, ConfirmPopover } from "@protolabsai/ui/organisms";
```
