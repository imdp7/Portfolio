#!/usr/bin/env node
/**
 * Renders public/resumeData.json into the PDF the site links to.
 *
 * The JSON is the single source of truth: the React site reads it at runtime,
 * this script reads the same file at build time, and `main.resumedownload`
 * names the output file for both. Edit the JSON, never the PDF.
 *
 * This runs as an npm `prebuild` step. The freshly rendered PDF is committed
 * rather than left as a pure build artifact, so a CI box that cannot launch
 * Chromium falls back to the last good file instead of shipping a download
 * link that 404s. Only a checkout with neither Chromium nor that PDF fails the
 * build. Rebuild and commit the PDF whenever you edit the JSON.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(PUBLIC, "resumeData.json");

const NAVY = "#1F3864";
const GREY = "#444444";

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const href = (url) => (/^https?:|^mailto:|^tel:/.test(url) ? url : `https://${url}`);
const link = (url, label, cls = "") =>
  `<a ${cls ? `class="${cls}" ` : ""}href="${esc(href(url))}">${esc(
    label
  )}</a>`;

// Contact line, with the phone, email and URLs as real PDF hyperlinks.
function contactLine(main) {
  const site = main.website.replace(/^https?:\/\//, "");
  return [
    esc(`${main.address.city}, ${main.address.state}`),
    link(`tel:${main.phone.replace(/[^\d+]/g, "")}`, main.phone),
    link(`mailto:${main.email}`, main.email),
    main.linkedin && link(main.linkedin, main.linkedin),
    link(main.website, site),
  ]
    .filter(Boolean)
    .join("  •  ");
}

const section = (title) => `<h2 class="section">${esc(title)}</h2>`;
const bullets = (items) =>
  `<ul>${items.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;

// Comma-separated keyword line set in 2pt type at the foot of the page, for
// ATS keyword matching. Readable only when zoomed, but fully text-extractable.
function keywordLine(keywords) {
  if (!keywords || !keywords.length) return "";
  return `<p class="keywords">${esc(keywords.join(", "))}</p>`;
}

function jobs(work) {
  return work
    .map(
      (job) => `
    <div class="entry">
      <div class="line">
        <span class="role">${esc(job.title)}</span>
        <span class="dates">${esc(job.years)}</span>
      </div>
      <div class="line">
        <span class="org">${esc(job.company)}</span>
        <span class="loc">${esc(job.location || "")}</span>
      </div>
      ${bullets(job.highlights)}
    </div>`
    )
    .join("");
}

function projects(list) {
  if (!list || !list.length) return "";
  return (
    section("Projects") +
    list
      .map(
        (p) => `
    <div class="entry">
      <div class="line">
        <span><span class="role">${esc(
          p.name
        )}</span><span class="sep">—</span>${link(p.url, p.url, "url")}</span>
        <span class="dates">${esc(p.years)}</span>
      </div>
      ${bullets(p.highlights)}
    </div>`
      )
      .join("")
  );
}

function education(list) {
  return list
    .map(
      (e) => `
    <div class="entry edu">
      <div class="line">
        <span class="role">${esc(e.degree)}</span>
        <span class="dates">${esc(e.graduated)}</span>
      </div>
      <div class="line">
        <span class="org">${esc(e.school)}</span>
        <span class="loc">${esc(e.location || "")}</span>
      </div>
    </div>`
    )
    .join("");
}

function skills(groups) {
  return groups
    .map(
      (g) =>
        `<p class="skill"><span class="skill-label">${esc(
          g.label
        )}:</span> ${esc(g.items)}</p>`
    )
    .join("");
}

function buildHtml(data) {
  const { main, resume } = data;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(main.name)} — ${esc(main.occupation)}</title>
<style>
  @page { size: Letter; margin: 0.26in 0.45in; }
  * { box-sizing: border-box; }
  html { color-scheme: light; }
  body {
    margin: 0;
    background: #FFFFFF;
    font-family: Calibri, Carlito, "Segoe UI", Candara, sans-serif;
    font-size: 9.5pt;
    line-height: 1.15;
    color: #111111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .name { font-size: 17pt; font-weight: 700; color: ${NAVY}; text-align: center; margin: 0 0 1pt; }
  .title { font-size: 11pt; font-weight: 700; text-align: center; margin: 0 0 1pt; }
  .contact { font-size: 8.5pt; color: ${GREY}; text-align: center; margin: 0 0 4pt; }

  h2.section {
    font-size: 10.5pt; font-weight: 700; color: ${NAVY};
    text-transform: uppercase; letter-spacing: 0.3pt;
    border-bottom: 0.75pt solid ${NAVY};
    margin: 4.5pt 0 2pt; padding-bottom: 1pt;
  }
  h2.section:first-of-type { margin-top: 4pt; }

  p.summary { margin: 0; text-align: justify; }

  .entry { margin-top: 2.5pt; }
  .entry:first-of-type { margin-top: 1pt; }
  .line { display: flex; justify-content: space-between; align-items: baseline; gap: 8pt; }
  .role { font-weight: 700; font-size: 10.5pt; }
  .dates { font-size: 9.5pt; font-style: italic; color: ${GREY}; white-space: nowrap; }
  .org { font-style: italic; font-size: 10pt; color: ${NAVY}; }
  .loc { font-style: italic; font-size: 9.5pt; color: ${GREY}; white-space: nowrap; }
  .sep { color: ${GREY}; margin: 0 4pt; }
  .url { font-style: italic; font-size: 9.5pt; color: ${NAVY}; }

  ul { margin: 1.5pt 0 0; padding-left: 12pt; }
  li { margin-bottom: 0; }

  .edu .line + .line { margin-top: 0.5pt; }
  p.skill { font-size: 8pt; margin: 0 0 0.5pt; }
  .skill-label { font-weight: 700; }
  a { color: inherit; text-decoration: none; }
  .contact a { color: ${GREY}; }
  a.url { color: ${NAVY}; font-style: italic; font-size: 9.5pt; }

  p.keywords {
    font-size: 2pt; line-height: 1.1; color: #FFFFFF;
    margin: 3pt 0 0; text-align: justify;
  }
</style>
</head>
<body>
  <div class="name">${esc(main.name)}</div>
  <div class="title">${esc(main.occupation)}</div>
  <div class="contact">${contactLine(main)}</div>

  ${section("Summary")}
  <p class="summary">${esc(resume.summary)}</p>

  ${section("Work Experience")}
  ${jobs(resume.work)}

  ${projects(resume.projects)}

  ${section("Education")}
  ${education(resume.education)}

  ${section("Skills")}
  ${skills(resume.skillGroups)}
  ${keywordLine(resume.atsKeywords)}
</body>
</html>`;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const html = buildHtml(data);

  // The filename the site links to is the filename we write. `resumedownload`
  // in the JSON is the single definition of it — never hardcode it here.
  const filename = data.main.resumedownload;
  if (!filename || !filename.toLowerCase().endsWith(".pdf")) {
    throw new Error(
      `main.resumedownload must name a .pdf file (got ${JSON.stringify(filename)})`
    );
  }
  const OUT = path.join(PUBLIC, filename);

  // Tolerate a render failure whenever a PDF is still on disk — the committed
  // one on CI, or a previous render locally. Only a checkout missing both
  // Chromium and the PDF fails, since that would deploy without the file.
  const orFail = (reason) => {
    if (fs.existsSync(OUT)) {
      console.warn(`[resume] ${reason} — keeping the existing ${filename}.`);
      return;
    }
    throw new Error(
      `${reason}, and no ${filename} exists to fall back on — ` +
        `the site's download link would 404.`
    );
  };

  let puppeteer;
  try {
    puppeteer = require("puppeteer");
  } catch (err) {
    // Also the failure mode on too old a Node: puppeteer is present in
    // node_modules but unloadable, so report what require actually said.
    return orFail(
      `puppeteer could not be loaded on node ${process.version} ` +
        `(needs >=22.12; run \`npm i -D puppeteer\` if it is missing): ${err.message}`
    );
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (err) {
    return orFail(`could not launch Chromium: ${err.message}`);
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({
      path: OUT,
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
    });
    console.log(`[resume] wrote ${path.relative(ROOT, OUT)}`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[resume] ${err.message}`);
    process.exit(1);
  });
}

module.exports = { buildHtml };
