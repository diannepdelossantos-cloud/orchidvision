import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { toDate } from './adminStats';

// Export a Disease Knowledge Base entry as a PDF or CSV file.
//   Phone: the file is created, then the share sheet opens (save to Files,
//          Drive, email, Messenger, …).
//   Web:   CSV downloads directly; PDF opens the browser's print dialog,
//          where "Save as PDF" is the destination.

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const fileSafe = (name) =>
  String(name || 'disease')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'disease';

function updatedText(disease) {
  const d = toDate(disease.updatedAt);
  return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export function buildDiseaseHtml(disease) {
  const list = (items, ordered) => {
    if (!items?.length) return '<p class="muted">None recorded.</p>';
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag}>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</${tag}>`;
  };

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(disease.name)} — OrchidVision</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1f2a1f; margin: 32px; }
  .brand { color: #2e7d32; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  h1 { font-size: 26px; margin: 4px 0 10px; }
  .badges span { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-right: 6px; background: #eef5ee; color: #2e7d32; }
  table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; }
  td { padding: 8px 0; border-bottom: 1px solid #e6e9e6; vertical-align: top; }
  td.k { width: 38%; color: #6b756b; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: #2e7d32; margin: 22px 0 6px; }
  li { margin: 4px 0; font-size: 14px; line-height: 1.45; }
  .box { background: #f3f7f3; border-radius: 10px; padding: 12px 16px; }
  .muted { color: #8a948a; font-size: 13px; }
  .foot { margin-top: 28px; font-size: 11px; color: #8a948a; }
  code { font-family: Menlo, Consolas, monospace; }
</style>
</head>
<body>
  <div class="brand">OrchidVision · Disease Knowledge Base</div>
  <h1>${escapeHtml(disease.name)}</h1>
  <div class="badges">
    <span>Category: ${escapeHtml(disease.category || 'None')}</span>
    <span>Severity: ${escapeHtml(disease.severity || 'None')}</span>
  </div>
  <table>
    <tr><td class="k">Classification label</td><td><code>${escapeHtml(disease.classificationLabel)}</code></td></tr>
    <tr><td class="k">Last updated</td><td>${escapeHtml(updatedText(disease))}</td></tr>
  </table>
  <h2>Symptoms</h2>
  ${list(disease.symptoms, false)}
  <h2>Preventive protocols</h2>
  ${list(disease.prevention, false)}
  <h2>Treatment recommendation</h2>
  <div class="box">${list(disease.protocols, true)}</div>
  <div class="foot">Exported ${escapeHtml(new Date().toLocaleString())}. Confirm with a grower or agriculturist before treating.</div>
</body>
</html>`;
}

// One row per item, so the file opens cleanly in Excel / Google Sheets.
export function buildDiseaseCsv(disease) {
  const rows = [
    ['Field', 'Value'],
    ['Disease name', disease.name],
    ['Classification label', disease.classificationLabel],
    ['Category', disease.category || 'None'],
    ['Severity', disease.severity || 'None'],
    ['Last updated', updatedText(disease)],
    ...(disease.symptoms || []).map((v, i) => [`Symptom ${i + 1}`, v]),
    ...(disease.prevention || []).map((v, i) => [`Preventive protocol ${i + 1}`, v]),
    ...(disease.protocols || []).map((v, i) => [`Treatment step ${i + 1}`, v]),
  ];
  // BOM so Excel reads accents / special characters correctly.
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export async function exportDiseasePdf(disease) {
  const html = buildDiseaseHtml(disease);

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (!win) throw new Error('Allow pop-ups for this site to export the PDF.');
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  const target = `${FileSystem.cacheDirectory}${fileSafe(disease.name)}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: target }).catch(() => {});
  const fileUri = (await FileSystem.getInfoAsync(target)).exists ? target : uri;
  await shareFile(fileUri, 'application/pdf', 'com.adobe.pdf');
}

export async function exportDiseaseCsv(disease) {
  const csv = buildDiseaseCsv(disease);
  const filename = `${fileSafe(disease.name)}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(fileUri, 'text/csv', 'public.comma-separated-values-text');
}

async function shareFile(uri, mimeType, UTI) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType, UTI, dialogTitle: 'Export disease entry' });
}
