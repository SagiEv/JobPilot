# Frontend Feedbacks Test Plan

This document outlines the testing strategy for the application's native feedback UI components (`ToastProvider` and `ConfirmProvider`), which replace browser-native `alert()`, `confirm()`, and `prompt()` functions.

## 1. Unit/Component Tests

### ToastProvider & useToast Hook
- **Context Provision:** Verify that components wrapped in `<ToastProvider>` can access `useToast`.
- **Render Toast:** Test that calling `addToast(message, type)` correctly renders a toast element in the DOM with the correct message.
- **Toast Types:**
  - `success`: Verify it uses the success color scheme (`#10b981`) and success icon.
  - `error`: Verify it uses the error color scheme (`#ef4444`) and error icon.
  - `warn`: Verify it uses the warning color scheme (`#f59e0b`) and warning icon.
  - `info`: Verify it uses the info color scheme (`#3b82f6`) and info icon.
  - `processing`: Verify it displays a loading spinner and pulsing text animation (`#6366f1`).
- **Auto-Dismiss:** Verify that non-processing toasts are automatically removed from the DOM after 5000ms.
- **Manual Dismiss/Click:** Verify that clicking a toast with an `onClick` handler executes the callback and removes the toast.
- **Remove Toast:** Verify that calling `removeToast(id)` programmatically removes the specific toast.

### ConfirmProvider & useConfirm Hook
- **Context Provision:** Verify that components wrapped in `<ConfirmProvider>` can access `useConfirm`.
- **Render Dialog:** Test that calling `confirm(message)` displays a modal dialog containing the message, a "Cancel" button, and a "Confirm" button.
- **Confirm Action:** 
  - Simulate a click on "Confirm".
  - Verify that the modal is removed from the DOM.
  - Verify that the `Promise` returned by `confirm()` resolves to `true`.
- **Cancel Action:**
  - Simulate a click on "Cancel".
  - Verify that the modal is removed from the DOM.
  - Verify that the `Promise` returned by `confirm()` resolves to `false`.
- **Z-Index and Overlay:** Ensure the dialog has a high z-index and displays a semi-transparent backdrop overlay.

## 2. End-to-End (E2E) Flow Tests

### E2E Flow 1: Global Confirmation Dialog (Logout Flow)
**Objective:** Verify that triggering a protected action prompts the user natively and handles their decision correctly.
1. Navigate to the `Settings` page as an authenticated user.
2. Click the "Log out" button.
3. **Assert:** The custom confirmation dialog appears with the text "Are you sure you want to log out?".
4. Click the "Cancel" button on the dialog.
5. **Assert:** The dialog disappears, and the user remains logged in (no network request made).
6. Click the "Log out" button again.
7. Click the "Confirm" button on the dialog.
8. **Assert:** The dialog disappears, a logout request is triggered, and the user is redirected to the login screen.

### E2E Flow 2: Global Toast Notification (API Key Error Flow)
**Objective:** Verify that application errors correctly display as native error toasts.
1. Navigate to the `Settings` page.
2. Enter an invalid OpenAI API key and click "Test".
3. Mock the backend response to return a 401 Unauthorized or general error.
4. **Assert:** A red error toast appears dynamically at the bottom-right of the screen containing the error message (e.g., "Failed to test key: Invalid API Key").
5. **Assert:** The toast automatically disappears after 5 seconds.
