// ══════════════════════════════════════════════════════════════
//  Lincoln, NE Field Guide — Google Apps Script Backend
//  Paste this entire file into your Apps Script editor,
//  then deploy as a Web App (see LINCOLN-NE-SETUP.md).
// ══════════════════════════════════════════════════════════════

const SHEET_ID   = 'YOUR_SPREADSHEET_ID_HERE'; // ← replace after creating the sheet
const SHEET_NAME_ENTRIES  = 'Entries';
const SHEET_NAME_COMMENTS = 'Comments';
const SHEET_NAME_LIKES    = 'Likes';

// ── CORS helper ──────────────────────────────────────────────
function corsHeaders() {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Ensure Likes sheet exists with headers ───────────────────
function ensureLikesSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME_LIKES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_LIKES);
    sheet.appendRow(['spot_name', 'likes']);
  }
  return sheet;
}

// ── GET handler — fetch entries + comments + likes ───────────
function doGet(e) {
  try {
    const ss       = SpreadsheetApp.openById(SHEET_ID);
    const action   = e.parameter.action || 'entries';

    if (action === 'entries') {
      const sheet  = ss.getSheetByName(SHEET_NAME_ENTRIES);
      const data   = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows   = data.slice(1).filter(r => r[0]); // skip empty rows
      const entries = rows.map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
      return jsonResponse({ ok: true, entries });
    }

    if (action === 'comments') {
      const spotName = e.parameter.spot || '';
      const sheet    = ss.getSheetByName(SHEET_NAME_COMMENTS);
      const data     = sheet.getDataRange().getValues();
      const headers  = data[0];
      const rows     = data.slice(1).filter(r => r[0]);
      let comments   = rows.map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
      if (spotName) {
        comments = comments.filter(c => c.spot_name === spotName);
      }
      return jsonResponse({ ok: true, comments });
    }

    if (action === 'likes') {
      const sheet = ensureLikesSheet(ss);
      const data  = sheet.getDataRange().getValues();
      if (data.length <= 1) return jsonResponse({ ok: true, likes: [] });
      const rows  = data.slice(1).filter(r => r[0]);
      const likes = rows.map(row => ({ spot_name: row[0], likes: parseInt(row[1]) || 0 }));
      return jsonResponse({ ok: true, likes });
    }

    if (action === 'place_info') {
      var mapsUrl = decodeURIComponent(e.parameter.url || '');
      if (!mapsUrl.startsWith('http')) return jsonResponse({ ok: false, error: 'Invalid URL' });
      try {
        var resp = UrlFetchApp.fetch(mapsUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          followRedirects: true,
          muteHttpExceptions: true
        });
        var html = resp.getContentText();
        var info = {};

        var ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/);
        if (ogTitle) info.name = ogTitle[1].replace(/\s*[-–·|]\s*Google Maps.*$/i, '').trim();

        var metaDesc = html.match(/<meta name="description" content="([^"]+)"/);
        if (metaDesc) {
          var desc = metaDesc[1];
          info.raw_desc = desc;

          var rMatch = desc.match(/(\d[\d.]+)\s*(?:stars?)/i) || desc.match(/⭐\s*(\d[\d.]+)/) || desc.match(/Rated\s+(\d[\d.]+)/i);
          if (rMatch) info.rating = '⭐ ' + rMatch[1];

          var pMatch = desc.match(/(\${1,4})/);
          if (pMatch) info.price = pMatch[1];

          var hMatch = desc.match(/((?:Open|Close[sd])[^·\n.]{2,40})/i);
          if (hMatch) info.hours = hMatch[1].trim().replace(/\s+/g, ' ');

          var cMatch = desc.match(/·\s*([A-Za-z\s]{3,40}(?:restaurant|bar|café|cafe|pub|lounge|club|park|garden|market|gallery|museum|shop|store|brewery))/i);
          if (cMatch) info.place_type = cMatch[1].trim();
        }

        var jldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (jldMatch) {
          try {
            var jld = JSON.parse(jldMatch[1]);
            if (jld.name) info.name = jld.name;
            if (jld.aggregateRating && jld.aggregateRating.ratingValue)
              info.rating = '⭐ ' + jld.aggregateRating.ratingValue;
            if (jld.openingHours)
              info.hours = Array.isArray(jld.openingHours) ? jld.openingHours.join(' · ') : String(jld.openingHours);
            if (jld.priceRange) info.price = jld.priceRange;
            if (jld['@type']) info.place_type = Array.isArray(jld['@type']) ? jld['@type'][0] : jld['@type'];
            if (jld.address && jld.address.streetAddress) info.address = jld.address.streetAddress;
            if (jld.telephone) info.phone = jld.telephone;
          } catch(je) { info.jld_error = je.message; }
        }

        return jsonResponse({ ok: true, data: info });
      } catch(fetchErr) {
        return jsonResponse({ ok: false, error: fetchErr.message });
      }
    }

    return jsonResponse({ ok: false, error: 'Unknown action' });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── POST handler — add comment, new entry, or like ───────────
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const ss     = SpreadsheetApp.openById(SHEET_ID);

    if (action === 'comment') {
      const sheet = ss.getSheetByName(SHEET_NAME_COMMENTS);
      sheet.appendRow([
        new Date().toISOString(),
        body.spot_name  || '',
        body.author     || 'Anonymous',
        body.comment    || '',
      ]);
      return jsonResponse({ ok: true, message: 'Comment saved!' });
    }

    if (action === 'like') {
      const sheet   = ensureLikesSheet(ss);
      const spotName = body.spot_name || '';
      const delta   = parseInt(body.delta) || 1;

      const data = sheet.getDataRange().getValues();
      let found  = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === spotName) {
          const newCount = Math.max(0, (parseInt(data[i][1]) || 0) + delta);
          sheet.getRange(i + 1, 2).setValue(newCount);
          found = true;
          return jsonResponse({ ok: true, spot_name: spotName, likes: newCount });
        }
      }
      if (!found && delta > 0) {
        sheet.appendRow([spotName, 1]);
        return jsonResponse({ ok: true, spot_name: spotName, likes: 1 });
      }
      return jsonResponse({ ok: true, spot_name: spotName, likes: 0 });
    }

    if (action === 'add_entry') {
      const sheet = ss.getSheetByName(SHEET_NAME_ENTRIES);
      sheet.appendRow([
        body.name        || '',
        body.category    || 'restaurant',
        parseFloat(body.lat)  || 0,
        parseFloat(body.lng)  || 0,
        body.desc        || '',
        body.detail      || '',
        body.rating      || '⭐ ?',
        body.url         || '',
        body.emoji       || '📍',
        body.vibe_tag    || '',
        body.must_order  || '',
        body.price       || '$',
        body.hours       || '',
        body.added_by    || 'Anonymous',
        new Date().toISOString(),
      ]);
      return jsonResponse({ ok: true, message: 'Entry added!' });
    }

    return jsonResponse({ ok: false, error: 'Unknown action' });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}
