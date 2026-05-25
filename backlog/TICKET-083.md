# TICKET-083 — Quiz version update notifications for buyers

**Status:** Open  
**Type:** Feature  
**Priority:** Low

## Goal

When a creator publishes a new version of a quiz, notify all users who have purchased that quiz. Buyers choose whether to update to the latest version or stay on the version they purchased. Version updates are opt-in, never automatic.

## Acceptance criteria

- [ ] When a creator saves an edit to a published quiz (incrementing its version), the server identifies all `QuizPurchase` records for that listing where `versionAtPurchase` is behind the current version
- [ ] A `Notification` is created for each affected buyer with type `VERSION_UPDATE`, containing the quiz name, old version, and new version
- [ ] The notification appears in the buyer's inbox with two actions: "Update to latest" and "Stay on current version"
- [ ] Accepting the update sets `QuizPurchase.versionAtPurchase` to the latest version
- [ ] Dismissing the notification leaves `versionAtPurchase` unchanged
- [ ] Buyers who have already updated do not receive duplicate notifications for the same version
- [ ] The update badge on the "Purchased" dashboard tab (TICKET-069) reflects the presence of pending version update notifications
