# CitizenTrack

CitizenTrack is an open-source web app for tracking German citizenship application timelines, contributing anonymized community data, and viewing aggregate processing statistics.

The app is built as an installable PWA with a public dashboard and authenticated user workspace.

## Features

- Public aggregate dashboard for application totals, approvals, processing times, and trends.
- Email/password authentication with Supabase.
- Private application tracking for user-owned cases.
- Claim flow for matching legacy spreadsheet entries without double-counting.
- AI-assisted timeline estimate backed by deterministic aggregate statistics.
- Weekly public data exports as JSON and XLSX.
- Light and dark themes.
- Installable PWA metadata for mobile browsers.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth and Postgres
- Recharts
- OpenAI API for optional estimate explanations
- Netlify deployment

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in the Supabase and OpenAI values in `.env.local`, then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable anon key. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL for redirects and links. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for server matching and AI cache writes | Supabase service role key. Never expose this client-side. |
| `OPENAI_API_KEY` | Optional | Enables AI-written estimate explanations. Without it, deterministic fallback estimates are returned. |
| `OPENAI_MODEL` | Optional | Defaults to `gpt-4.1-mini`. |

## Public Data Exports

CitizenTrack publishes anonymized application exports weekly through a Netlify scheduled function.

- Latest JSON: https://mxkmpiatovfmtmnicaur.supabase.co/storage/v1/object/public/public-exports/applications/latest.json
- Latest XLSX: https://mxkmpiatovfmtmnicaur.supabase.co/storage/v1/object/public/public-exports/applications/latest.xlsx
- Dated snapshots are written under `applications/snapshots/YYYY-MM-DD.json` and `applications/snapshots/YYYY-MM-DD.xlsx`.

The JSON export includes a statistics section and one application-type section per law type. The XLSX export mirrors that structure as a workbook with a `Statistics` worksheet and one worksheet per application type. It excludes Supabase user IDs, emails, auth data, and raw free-text date fields.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Contributing

Pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

All changes to the default branch should go through pull request review before merge.

## License

[MIT](./LICENSE)
