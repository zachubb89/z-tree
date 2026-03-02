# NV Field Guide — Google Sheets Setup Guide
*5–10 min total. One-time setup. Zero hosting fees.*

---

## What You're Setting Up

```
Your Friends
    │
    ├─ Edit rows in Google Sheet  ──────────────────┐
    │                                               ▼
    └─ Use the web guide ◄──── Google Apps Script ──► Google Sheet
         │                         (free serverless)      (database)
         └─ Leave comments ──────────────────────────────────────┘
```

---

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) → **New spreadsheet**
2. Rename it: **"NV Field Guide"**
3. You need **two tabs** (sheets). Rename the default one and add a second:

### Tab 1: `Entries`
Click the tab at the bottom → rename to `Entries`

Add these **exact column headers** in row 1:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| name | category | lat | lng | desc | detail | rating | url | emoji | vibe_tag | must_order | price | hours | added_by | timestamp |

### Tab 2: `Comments`
Click **+** at the bottom → add a new tab → rename to `Comments`

Add these **exact column headers** in row 1:

| A | B | C | D |
|---|---|---|---|
| timestamp | spot_name | author | comment |

> ⚠️ Column names must match exactly (lowercase, underscores). The script reads them by name.

---

## Step 2 — Get Your Spreadsheet ID

Look at the URL of your sheet:
```
https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_ID/edit
```
Copy that ID — you'll need it in a moment.

---

## Step 3 — Set Up Apps Script

1. In your Google Sheet: **Extensions → Apps Script**
2. Delete the default empty `myFunction()` code
3. Open the file **`nv-guide-backend.gs`** (in this folder) → copy everything → paste it in
4. On line 2, replace `YOUR_SPREADSHEET_ID_HERE` with your actual ID:
   ```javascript
   const SHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'; // example
   ```
5. Click **Save** (floppy disk icon, or Ctrl+S)

---

## Step 4 — Deploy as Web App

1. In Apps Script: click **Deploy → New deployment**
2. Click the ⚙️ gear icon next to "Type" → select **Web app**
3. Set these options:
   - **Description**: `NV Guide API`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone` ← important!
4. Click **Deploy**
5. It'll ask you to authorize — click through the Google permissions dialogs (it's just your own script accessing your own sheet)
6. Copy the **Web app URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycby.../exec
   ```

---

## Step 5 — Wire the URL into the HTML

1. Open **`nv-guide_6.html`** in a text editor
2. Find this line near the top of the `<script>` section:
   ```javascript
   const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
   ```
3. Replace with your URL:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
   ```
4. Save the file

---

## Step 6 — Share With Friends

- Share the **`nv-guide_6.html`** file — they can open it directly in any browser
- Share the **Google Sheet** — they can add new rows directly, which appear in the guide on next load
- Or host the HTML on GitHub Pages / Netlify / Dropbox for a live URL (free)

---

## How It Works Day-to-Day

### Adding spots via the web:
Click **"＋ Add a Spot"** (bottom-right corner of the guide) → fill out the form → submit. Entry lands in the `Entries` tab.

### Adding spots via the sheet:
Just add a new row to the `Entries` tab. Required: `name`, `category` (restaurant/bar/nature/culture), `desc`. Everything else is optional.

### Leaving comments via the web:
Click **"💬 Comments"** on any card → type your note → Post. Comment lands in the `Comments` tab with timestamp.

### Viewing comments via the sheet:
Open the `Comments` tab — every comment is timestamped with the spot name and author.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Community spots not loading | Check the URL in the HTML matches your deployed Web App URL |
| "Couldn't load community spots" error | Make sure "Who has access" is set to **Anyone** when deploying |
| Changes not showing up | The sheet is live — refresh the page. If new columns added, redeploy the script |
| Script authorization issues | In Apps Script → Run → `doGet` manually, accept the permission dialog |

---

## Re-deploying After Changes

If you edit the Apps Script code later:
1. **Deploy → Manage deployments**
2. Click the pencil ✏️ on your existing deployment
3. Change version to **"New version"**
4. Click **Deploy** — URL stays the same ✅

---

*Built by Claude · NV Field Guide by Zach · October*
