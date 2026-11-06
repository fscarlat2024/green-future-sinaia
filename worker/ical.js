// Citire si scriere calendare iCal (schimb de disponibilitate cu Booking.com / Airbnb).
const toIso = (v) => `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
const addDay = (s) => new Date(Date.parse(s + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);

export function parseIcal(text) {
  // liniile lungi continua pe randul urmator cu un spatiu la inceput
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur?.from) {
        const to = cur.to && cur.to > cur.from ? cur.to : addDay(cur.from);
        events.push({ from: cur.from, to, summary: cur.summary || "" });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const m = line.match(/^(DTSTART|DTEND|SUMMARY)[^:]*:(.*)$/);
    if (!m) continue;
    if (m[1] === "SUMMARY") cur.summary = m[2].replace(/\\([,;\\])/g, "$1");
    else if (/^\d{8}/.test(m[2])) cur[m[1] === "DTSTART" ? "from" : "to"] = toIso(m[2]);
  }
  return events;
}

export function buildIcal(name, rows) {
  const compact = (d) => d.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Green Future Sinaia//Rezervari//RO", "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${name.replace(/[,;\\]/g, " ")}`];
  for (const r of rows) {
    out.push("BEGIN:VEVENT", `UID:${r.uid}@greenfuturesinaia.com`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(r.a)}`, `DTEND;VALUE=DATE:${compact(r.b)}`, "SUMMARY:Rezervat", "END:VEVENT");
  }
  out.push("END:VCALENDAR");
  return out.join("\r\n") + "\r\n";
}
