# Owner's Guide — atelier ito

This guide is for the salon owner and staff — no technical knowledge
needed. It explains what happens when a customer uses your website, and
how to make everyday changes yourself, safely, without asking a developer.

Everything below is done by editing your spreadsheet in a web browser,
the same way you'd edit any Excel or Google Sheets file. Nothing here
requires touching any code.

There is no Google Forms involved anywhere in this system. Reservations
and inquiries are handled by a custom booking system built specifically
for your site — customers never leave your website to book or ask a
question.

## What happens when a customer makes a reservation

1. A customer visits your website and picks a service (for example, a
   cut and color).
2. They pick a stylist (or choose "no preference" if you allow that), then
   pick an available date and time.
3. They confirm the reservation with their name, email, and phone number.
4. The system immediately:
   - Sends the customer a confirmation email.
   - Sends you (the owner) a notification email so you know a new booking
     came in.
   - Adds the appointment to your salon's Google Calendar.
   - Records the reservation as a new row in your spreadsheet's
     RESERVATIONS sheet, so you always have a full written record.

If a customer later needs to cancel, they use a link in their confirmation
email. The cancellation request is recorded in the spreadsheet, and you're
notified by email as well.

## What happens when a customer sends an inquiry

1. A customer fills out the contact form on your website with their name,
   contact details, and a message.
2. The system immediately:
   - Records the inquiry as a new row in your spreadsheet's INQUIRIES
     sheet.
   - Sends you (the owner) a notification email with their message, so you
     can follow up directly.

## Everyday changes you can make yourself

All of these are done by opening your spreadsheet and editing cells — no
code, no developer needed. Changes take effect immediately; there is
nothing to "publish" or "restart."

### Change your business hours

Open the sheet tab called **CONFIG**. Find the rows for each day of the
week (they look like "hours.monday", "hours.tuesday", and so on) and edit
the value next to that day. Write hours like `10:00-19:00`, or write
`closed` for a day you're not open.

### Add a holiday or a day you're closed

Open the sheet tab called **HOLIDAYS**. Add a new row with the date (in
the format `2026-01-01`) and a short label describing the closure (for
example, "New Year's Day"). Customers won't be able to book that date
anymore.

### Change a service's price or how long it takes

Open the sheet tab called **SERVICES**. Find the row for that service and
edit the price or duration cell directly. The change is live on the site
right away.

### Add a new service to your menu

Open the **SERVICES** sheet and add a new row: give it a unique ID (like
`SV006`), a name, how many minutes it takes, its price, mark it as active,
say whether a stylist must be selected for it, and a display order number
(lower numbers show first).

### Temporarily hide a service without deleting it

In the **SERVICES** sheet, find the service's row and change its "Active"
column to `FALSE`. It disappears from the site immediately but the row and
its booking history stay safe. Set it back to `TRUE` to bring it back.

### Add a staff member (stylist)

Open the **STAFF** sheet and add a new row: a unique ID (like `ST005`),
their name, mark them as active, and a display order number. You can
optionally add their role/title, a short bio, and a photo (photos need to
be added to the website's image files first — ask your developer for that
one step).

### Remove a staff member from the booking list

In the **STAFF** sheet, find their row and change "Active" to `FALSE`.
They stop appearing as bookable, but their past appointment history is
preserved.

### Change where owner notification emails are sent

Open the **CONFIG** sheet and find the row labeled
"email.ownerNotifyAddress". Change the value to the email address that
should receive new-reservation and new-inquiry alerts. This is separate
from your public contact email shown on the website (the row labeled
"business.email") — you can set those to the same address or different
ones, whichever suits how you work.

## Where everything is recorded

Your spreadsheet is the permanent record of everything that happens:

- **RESERVATIONS** — every booking made through the site.
- **CANCELLATION_REQUESTS** — every cancellation a customer has asked for.
- **INQUIRIES** — every message sent through the contact form.
- **EMAIL_LOG** — a record of every notification email the system has
  sent (or tried to send), so you can confirm an email actually went out.

You should never need to manually edit rows in these four sheets — they
are written automatically by the system as a record-keeping log.

## Getting help

If something looks wrong (a booking didn't come through, an email didn't
arrive, hours aren't showing correctly), check the CONFIG and relevant
sheet tab first — most issues are a typo in a spreadsheet cell (for
example, hours written as `10-19` instead of `10:00-19:00`). If you can't
find the cause, contact your developer with the date/time the issue
happened and, if relevant, the customer's name — that's usually enough to
trace it in the EMAIL_LOG or ERROR_LOG sheets.
