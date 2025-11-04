# School Menu of the Day

Daily emails for the Cupertino USD menu, powered by Google Cloud Functions and Gmail.

## Function

| Function | Purpose | Schedule |
|----------|---------|----------|
| `sendDailyMenu` | Scrapes the district site, resolves the accessible menu via GraphQL, and emails breakfast/lunch details. | `0 7 * * 1-5`

## Deploy

1. Copy `cloud-function/.env.example` to `cloud-function/.env.yaml` and fill in your Gmail app password plus recipient list.
2. Deploy the daily menu function:
   ```bash
   cd cloud-function
   gcloud functions deploy sendDailyMenu --gen2 --runtime=nodejs20 \
     --region=us-central1 --source=. --entry-point=sendDailyMenu \
     --trigger-http --allow-unauthenticated --env-vars-file=.env.yaml \
     --project=school-menu-notify
   ```

## Development Notes

- Run locally with `npm install` then `npx functions-framework --target=sendDailyMenu`.
- Utility/debug scripts live under `scripts/` (`cloud-function/scripts/` for menu-specific tools).
- Secrets (`*.env*`) and dependencies (`node_modules/`) are ignored—regenerate with `npm install` as needed.
