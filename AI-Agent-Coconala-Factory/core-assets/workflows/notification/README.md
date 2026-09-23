# Notifications

In Phase 1, notifications are **not a separate workflow**. Each workflow declares its
`notifications[]`, and actions call the shared `services/notify.ts` (owner email via MailApp, never
failing the customer's request). LINE push to the owner or the customer is the planned action
`sendLineMessage@1`. When it is implemented, a `notification-*` workflow (for example reminders on
a time trigger) belongs in this folder.
