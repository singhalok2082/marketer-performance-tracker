// Converts a Google Drive/Docs/Sheets/Slides share link into its embeddable
// "/preview" URL so it can be shown in an iframe without forcing a download.
// Returns null if the link doesn't match a recognizable Google pattern —
// callers should fall back to an "Open in Google Drive" link in that case.
export function driveEmbedUrl(link) {
  if (!link) return null;
  const patterns = [
    { re: /\/document\/d\/([^/]+)/,     base: "https://docs.google.com/document/d/ID/preview" },
    { re: /\/spreadsheets\/d\/([^/]+)/, base: "https://docs.google.com/spreadsheets/d/ID/preview" },
    { re: /\/presentation\/d\/([^/]+)/, base: "https://docs.google.com/presentation/d/ID/preview" },
    { re: /\/file\/d\/([^/]+)/,         base: "https://drive.google.com/file/d/ID/preview" },
    { re: /[?&]id=([^&]+)/,             base: "https://drive.google.com/file/d/ID/preview" },
  ];
  for (const { re, base } of patterns) {
    const m = link.match(re);
    if (m) return base.replace("ID", m[1]);
  }
  return null;
}
