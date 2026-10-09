# Arabic copy — native review required before launch

All Arabic text on the site (`dictionaries/ar.json`, Arabic names and
descriptions in `src/data/catalog.ts`, and the Arabic email templates in
`src/lib/notifications/templates.ts`) was written in Modern Standard Arabic
for a UAE audience, but **must be reviewed by a competent native Arabic
reviewer before launch** (constitution §IX, owner instructions §8).

Please check in particular:

- Tone: warm and hospitable, suitable for an Emirati family restaurant.
- Dish names and spellings the restaurant actually uses (e.g. مجبوس، قوزي، هريس، لقيمات).
- Catering wording: a submitted request must never read as a confirmed booking
  («إرسال الطلب لا يثبّت الموعد»).
- Legal wording on the privacy page (also needs legal review under UAE data-protection law).

Numbers, phone numbers and email examples inside Arabic sentences are wrapped
in Unicode isolates (U+2066 … U+2069) so they display left-to-right; keep
those marks when editing.
