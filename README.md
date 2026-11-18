This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

On Windows, double-click **Launch ASPC RTS Tool.bat** to start this checkout and open the main page in your default browser. Keep the server window open while using the tool; press Ctrl+C to stop it. The launcher reuses an existing server for this checkout, otherwise chooses an available port starting at 3010. Node.js/npm must be installed; missing project dependencies are installed on the first launch.

### TikTok pricing in Brochure View

Upload your workbook as usual and switch to **Brochure View**. When the selected Marketing build has a unique full-name match with a priced product in the **TikTok Price** worksheet, a separate **TikTok Pricing** section appears below the brochure's Copy Specs button.

The section shows **Name**, **Website Price** from `.com Selling Price (Unactivated)`, and the exact **TikTok Price (Activated)** and **TikTok Price (Unactivated)** rows. It preserves cents and displays **Not available** for missing values. It does not substitute Listing Price, activated website prices or RAM-upgrade prices.

Matching ignores capitalization and repeated whitespace, but retains the full model/configuration and variant names. Builds without a match, entries without a positive base TikTok price, and ambiguous duplicate names do not show the section. Workbooks without the optional TikTok Price worksheet continue to work normally. Each upload replaces the TikTok data; brochure prices, copied specifications, live products and build filters keep their existing behavior.

Verify parsing and matching with `npx tsx scripts/verify-tiktok-pricing.mts`. Optionally pass a workbook path to check the integration against your own source data. No pricing workbook is bundled with this feature.

### Google Sheets connection and change history

Use **Connect** in the compact Google Sheets status bar and sign in. Once connected, **Check now** and **History** stay in the bar; **Settings** opens a side panel for the sheet link, check interval, notifications and account. The panel overlays the workspace without moving the brochure; close it with the close button, Escape or the backdrop. If a team sheet is configured, it connects automatically on first use; otherwise paste a sheet link. The tool reads Marketing and optional TikTok Price data directly, checks every 2 minutes by default while open and refreshes automatically. Choose **2, 5, 10, 15, 30 or 60 minutes** under **Check for changes every**; the interval is saved in this browser. Changing it restarts the countdown without resuming paused checks. **Check now**, **Pause checks**, **Sign out**, and a history filter (hour/day/week/all) are available. XLSX upload remains supported and pauses syncing. The latest 1,000 detected field changes are saved in this browser per account and spreadsheet; the first read creates a baseline, and formatting or intermediate edits between checks are not tracked.

Detected product additions, updates and removals show an in-app popup with **View changes**. Enable optional browser notifications under **Settings > Notifications** to receive alerts while using another tab. Alerts require the tool to remain open; the baseline, unchanged checks and failed reads stay quiet.

Real sign-in requires Google OAuth configuration. Follow [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for the exact redirect URI, server environment variables, consent setup, storage behavior and validation steps. No credentials or private sheet URL are bundled.

Set the optional server variable `GOOGLE_DEFAULT_SHEET_ID` to connect new users to the team sheet automatically after sign-in. Each user still needs Google permission to view it. A saved custom sheet takes priority, and paused checks stay paused across reloads. Completing a fresh sign-in resumes the default connection after a pause. The sheet ID is returned only to signed-in users, not embedded in the public frontend.

### Live laptop brochures

The laptop sidebar groups variants under their model name (the website title before `/`), with prices ascending within each model. Different generations and named editions stay separate. Search filters variants while retaining their model headings; selecting a variant opens its own details and matching TikTok pricing.

Choose **Laptops** in the header, even before uploading a workbook. This separate catalog loads only products tagged `category:LAPTOPS` in the [specified website listing](https://aftershockpc.com/ready-to-ship/desktops?category=laptops&custom_yes=1). Search by model or specification, select a laptop, copy its specifications, or open its product page. Website prices, original prices, images and specifications come from that listing. **Refresh laptops** fetches the current listing again; loading, empty and retry states are independent of desktop builds.

Upload an XLSX to add a separate TikTok Pricing panel for matching laptops. Laptops remain available without a workbook, a TikTok Price tab or a matching price. In the Laptops section, a pricing-only workbook without Marketing is also supported. A successful upload replaces the optional laptop pricing, so a workbook without TikTok prices clears previous matches.

Laptop matching requires the full model and CPU/GPU configuration. It tolerates leading Gigabyte/Aftershock branding, capitalization, spacing and parentheses around generation labels. The website's Eagle (2026) name has one explicit alias for the sheet's Eagle with the same Ryzen 5 7533HS / RTX 4050 configuration. Colour, generation, CPU/GPU and other configuration differences remain distinct; ambiguous matches and shortened model-only names are excluded. Desktop matching is unchanged.

The TikTok panel still uses the exact XLSX rows documented above. Its Website Price remains the sheet's **unactivated** price, separate from the live website price. Missing unactivated prices show **Not available**.

The `/api/live-laptops` endpoint fetches only the fixed listing URL, with no persistent price cache. It reads the page's reference-encoded Remix collection data as JSON (never executes scripts) and filters category tags, since the page's JSON-LD also includes desktops. If that data format changes or the collection becomes paginated, the endpoint reports a load error instead of returning an incorrect or partial catalog.

Run `npx tsx scripts/verify-live-laptops.mts` for parser and matching regression checks. Optional arguments are a saved listing HTML path and a workbook path; neither source is bundled in the repository.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
