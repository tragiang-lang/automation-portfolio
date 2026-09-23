# 0006: Reservation = request + owner confirmation, via LINE date-time picker

**Context.** Phase 1 has no booking UI. The salon apps' full flow (calendar, staff, cancel
tokens, confirmation emails) is large and web-centric.

**Decision.** `reservation-basic-v1` opens LINE's native date-time picker from the Rich Menu.
The chosen slot is checked against opening hours, closed dates, lead time, booking window and a
capacity of N overlapping bookings, all under the script lock. It is saved as `REQUESTED`, and the
owner confirms by setting `CONFIRMED` in the sheet. `getAvailability` exists for the Phase 2 UI.

**Consequences.** It is simple, sellable, and matches how many small shops already work. The customer
reply must say "request", not "confirmed". Calendar, staff, cancellation, and push notifications are
documented extension points (planned actions).
