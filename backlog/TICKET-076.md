# TICKET-076 — Dashboard notifications inbox

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Add a general notifications inbox to the logged-in dashboard. This is a shared inbox for all platform events — not scoped to rental offers only. The tab should indicate unread notifications with a badge count.

## Acceptance criteria

- [ ] Logged-in dashboard has a "Notifications" inbox tab
- [ ] Unread notification count is shown as a badge on the tab
- [ ] Notifications are marked as read when the user opens the tab
- [ ] The following events generate a notification:
  - Quiz purchased by a buyer (creator receives notification)
  - Quiz rented by a buyer (creator receives notification)
  - New review received on one of your quizzes (creator receives notification)
  - New version available for a quiz you purchased (buyer receives notification with accept/dismiss actions)
  - Post-rental 20% discount offer (buyer receives notification, time-limited 24h)
  - Pro subscription expiry reminder (user receives notification before renewal or trial end)
- [ ] Expired or actioned notifications are visually distinct (greyed out or removed)
- [ ] Version update notifications include "Update to latest" and "Stay on current version" actions
