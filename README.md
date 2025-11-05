# School Menu of the Day

Daily emails for the Cupertino USD menu, powered by Google Cloud Functions and Gmail.

## Functions

| Function | Purpose | Schedule |
|----------|---------|----------|
| `sendDailyMenu` | Scrapes the district site, resolves the accessible menu via GraphQL, and emails breakfast/lunch details. | `0 7 * * 1-5`
| `subscribe` | POST endpoint to add an address to the Firestore-backed mailing list. | — |
| `unsubscribe` | Handles the email unsubscribe link (validates HMAC token and disables the subscriber). | — |

## Deploy

1. Copy `cloud-function/.env.example` to `cloud-function/.env.yaml` and fill in your Gmail app password, recipient bootstrap list, plus a long random `SUBSCRIPTION_SECRET` and the deployed `UNSUBSCRIBE_URL`.
2. Deploy the daily menu function:
   ```bash
   cd cloud-function
   gcloud functions deploy sendDailyMenu --gen2 --runtime=nodejs20 \
     --region=us-central1 --source=. --entry-point=sendDailyMenu \
     --trigger-http --allow-unauthenticated --env-vars-file=.env.yaml \
     --project=school-menu-notify
   ```

## Firestore Mailing List

- Subscribers live in the `subscribers` collection (doc id = lower-cased email, fields: `email`, `active`, timestamps).
- On first deploy the function bootstraps Firestore using `RECIPIENT_EMAIL` if the collection is empty.
- `sendDailyMenu` reads only `active === true` documents and sends personalised messages (unique unsubscribe links) per address.
- `subscribe` accepts `POST` requests with JSON `{ "email": "user@example.com" }` and marks the subscriber active.
- `unsubscribe` expects query/body parameters `email` and `token` (generated HMAC in the email footer) and deactivates the record.

## Development Notes

- Run locally with `npm install` (in the project root and `cloud-function/`) then `npx functions-framework --target=sendDailyMenu`.
- Utility/debug scripts live under `scripts/` (`cloud-function/scripts/` for menu-specific tools).
- Secrets (`*.env*`) and dependencies (`node_modules/`) are ignored—regenerate with `npm install` as needed.
