// ---------- Writers' Room, Books, Videos, Compare ----------
const WRITERS = JSON.parse(document.getElementById("writers-data").textContent.replace(/<!--DATA:(BEGIN|END)-->/g, ""));
const GROUP_LABEL = { hindi: "Hindi & Urdu", film: "Indian film & series", world: "World classics", theatre: "Theatre", craft: "Craft books" };
let tab = "stories";
const room = {
  view: "home", filter: "all", q: "", writerId: null, tech: null, imit: {}, imitLang: "hinglish",
  critique: { text: "", label: "", lens: "", craft: ["aristotle", "mckee", "stanislavski"], useLib: true, out: "", rewrite: "", err: "" },
  lesson: { out: "", answer: "", check: "", err: "" },
  sbs: { text: "", ids: [], outs: {}, err: "" },
  compare: { a: "", b: "", aLabel: "Draft A", bLabel: "Draft B", out: "", err: "", shown: false },
};
let roomBusy = null;
const put = (el, ...kids) => { for (const k of kids.flat()) if (k != null && k !== false) el.append(k); };
const ICON_COMPARE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v13"/><path d="M3 13l4 4 4-4"/><path d="M17 20V7"/><path d="M13 11l4-4 4 4"/></svg>';
const icon = svg => { const s = document.createElement("span"); s.className = "ic"; s.innerHTML = svg; return s; };

function gotoTab(t) {
  if (t === tab) { if (t === "room") room.view = "home"; if (t === "books") books.view = "list"; if (t === "videos") vids.view = "list"; }
  tab = t; msg = null; render(); window.scrollTo(0, 0);
}
function gotoRoom(view, extra) { tab = "room"; room.view = view; Object.assign(room, extra || {}); render(); window.scrollTo(0, 0); }
function tabsNav() {
  const I = {
    stories: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    room: '<path d="M7 8h10"/><path d="M7 12h6"/><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    books: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    videos: '<rect x="2" y="5" width="15" height="14" rx="3"/><path d="m22 8-5 4 5 4z"/>' };
  const tabs = [["stories", "Stories"], ["room", "Writers' Room"], ["books", "Books"], ["videos", "Videos"]];
  return h("nav", { class: "tabs", "aria-label": "Sections" }, tabs.map(([k, l]) => {
    const b = h("button", { "aria-current": tab === k ? "page" : null, onclick: () => gotoTab(k) });
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
    b.append(h("span", { text: l }));
    return b;
  }));
}
function roomBusyRow() {
  if (!roomBusy) return null;
  return h("div", { class: "busy", role: "status" }, h("span", { class: "dot" }), roomBusy.label,
    h("button", { class: "ghost", onclick: () => roomBusy?.ctrl.abort() }, "Stop"));
}
function errNote(t) { return t ? h("div", { class: "note err", role: "alert" }, t) : null; }

// ---------- Markdown (safe, small) ----------
function inlineMd(s) {
  const frag = document.createDocumentFragment();
  for (const part of s.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g)) {
    if (!part) continue;
    if (/^\*\*[^*]+\*\*$/.test(part)) frag.append(h("strong", { text: part.slice(2, -2) }));
    else if (/^\*[^*]+\*$/.test(part)) frag.append(h("em", { text: part.slice(1, -1) }));
    else frag.append(document.createTextNode(part));
  }
  return frag;
}
function md(text) {
  const box = h("div", { class: "md" });
  const lines = (text || "").replace(/\r/g, "").split("\n");
  let list = null, para = [], quote = [], table = [];
  const flush = () => {
    if (para.length) { const p = h("p"); p.append(inlineMd(para.join(" "))); box.append(p); para = []; }
    if (quote.length) { const q = h("blockquote"); q.append(inlineMd(quote.join(" "))); box.append(q); quote = []; }
    if (table.length) {
      const rows = table.filter(r => !/^\|?\s*:?-{2,}/.test(r.replace(/\|/g, "|").trim()) || /[A-Za-zऀ-ॿ]/.test(r.replace(/[-|:\s]/g, "")));
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      const wrap = h("div", { class: "tablewrap" }), t = h("table");
      rows.forEach((r, i) => { const tr = h("tr"); cells(r).forEach(c => { const td = h(i === 0 ? "th" : "td"); td.append(inlineMd(c)); tr.append(td); }); t.append(tr); });
      wrap.append(t); box.append(wrap); table = [];
    }
    list = null;
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) { flush(); continue; }
    if (/^\s*\|/.test(l)) { if (para.length || quote.length) { const keep = table; table = []; flush(); table = keep; } table.push(l); continue; }
    else if (table.length) flush();
    const hm = l.match(/^(#{1,4})\s+(.*)/);
    if (hm) { flush(); const el = h(hm[1].length <= 2 ? "h3" : "h4"); el.append(inlineMd(hm[2])); box.append(el); continue; }
    const li = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
    if (li) {
      if (para.length || quote.length) { const p = para, q = quote; para = []; quote = []; if (p.length) { const e = h("p"); e.append(inlineMd(p.join(" "))); box.append(e); } if (q.length) { const e = h("blockquote"); e.append(inlineMd(q.join(" "))); box.append(e); } }
      if (!list) { list = h(/^\s*\d/.test(l) ? "ol" : "ul"); box.append(list); }
      const item = h("li"); const cb = li[1].match(/^\[( |x|X)\]\s*(.*)/);
      if (cb) { item.className = "todo"; item.append(h("span", { class: "box", text: cb[1] === " " ? "☐" : "☑" }), inlineMd(cb[2])); } else item.append(inlineMd(li[1]));
      list.append(item); continue;
    }
    const bq = l.match(/^\s*>\s?(.*)/);
    if (bq) { if (para.length) { const e = h("p"); e.append(inlineMd(para.join(" "))); box.append(e); para = []; } list = null; quote.push(bq[1]); continue; }
    if (quote.length) { const e = h("blockquote"); e.append(inlineMd(quote.join(" "))); box.append(e); quote = []; }
    list = null; para.push(l.trim());
  }
  flush();
  return box;
}
// Stream Claude into an element, rendering Markdown as it arrives.
async function streamInto(el, prompt, opts = {}) {
  let raf = 0, latest = "";
  const r = await AI.sample(prompt, { cache: false, modelTier: AI.tier(opts.tier || "default"), signal: opts.signal,
    onText: ({ text }) => { latest = text; if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (el) el.replaceChildren(md(opts.clean ? opts.clean(latest) : latest)); }); } });
  return r.text;
}

// ---------- Library storage (books and videos) ----------
const Lib = {
  books: [], videos: [], loaded: false, chunkCache: {}, pieceCache: {},
  base() { return Store.col().doc("_lib"); },
  async load() {
    try {
      if (Store.mode === "db") {
        const [b, v] = await Promise.all([this.base().collection("books").get(), this.base().collection("videos").get()]);
        this.books = b.docs.map(d => d.data()); this.videos = v.docs.map(d => d.data());
      } else { this.books = Store.localGet("pd.books", []) || []; this.videos = Store.localGet("pd.videos", []) || []; }
    } catch (e) { this.books = this.books || []; this.videos = this.videos || []; }
    this.books.sort((a, b) => b.createdAt - a.createdAt); this.videos.sort((a, b) => b.createdAt - a.createdAt);
    this.loaded = true;
  },
  localStrict(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  async saveBook(b) {
    if (Store.mode === "db") return this.base().collection("books").doc(b.id).set(JSON.parse(JSON.stringify(b)));
    const all = (Store.localGet("pd.books", []) || []).filter(x => x.id !== b.id); all.unshift(b); this.localStrict("pd.books", all);
  },
  async saveChunks(id, chunks, onProgress) {
    if (Store.mode === "db") {
      const col = this.base().collection("books").doc(id).collection("chunks");
      for (let i = 0; i < chunks.length; i++) { await col.doc("c" + i).set(chunks[i]); onProgress?.(i + 1, chunks.length); }
    } else this.localStrict("pd.chunks." + id, chunks);
    this.chunkCache[id] = chunks;
  },
  async chunks(id) {
    if (this.chunkCache[id]) return this.chunkCache[id];
    let cs;
    if (Store.mode === "db") { const snap = await this.base().collection("books").doc(id).collection("chunks").get(); cs = snap.docs.map(d => d.data()).sort((a, b) => a.n - b.n); }
    else cs = Store.localGet("pd.chunks." + id, []) || [];
    return (this.chunkCache[id] = cs);
  },
  async removeBook(id) {
    if (Store.mode === "db") {
      const col = this.base().collection("books").doc(id).collection("chunks"); const snap = await col.get();
      for (const d of snap.docs) await col.doc(d.id).delete();
      await this.base().collection("books").doc(id).delete();
    } else { this.localStrict("pd.books", (Store.localGet("pd.books", []) || []).filter(x => x.id !== id)); try { localStorage.removeItem("pd.chunks." + id); } catch {} }
    this.books = this.books.filter(b => b.id !== id); delete this.chunkCache[id]; delete this.pieceCache["book:" + id];
  },
  async saveVideo(v) {
    if (Store.mode === "db") return this.base().collection("videos").doc(v.id).set(JSON.parse(JSON.stringify(v)));
    const all = (Store.localGet("pd.videos", []) || []).filter(x => x.id !== v.id); all.unshift(v); this.localStrict("pd.videos", all);
  },
  async removeVideo(v) {
    if (v.assetId) { try { const a = await claude.use("assets"); await a?.delete(v.assetId); } catch {} }
    if (Store.mode === "db") await this.base().collection("videos").doc(v.id).delete();
    else this.localStrict("pd.videos", (Store.localGet("pd.videos", []) || []).filter(x => x.id !== v.id));
    this.videos = this.videos.filter(x => x.id !== v.id); delete this.pieceCache["video:" + v.id];
  },
};

// ---------- Search over the person's library ----------
const STOP = new Set("the and that with this from have for was were are but not you your they them their his her she him its what when which into there then than been will would could should about also just like one all can had has our out who how hai hain aur nahi kya kar raha rahi tha thi the ki ka ke ko se mein par bhi woh yeh koi kuch".split(" "));
const tok = s => ((s || "").toLowerCase().match(/[\p{L}\p{M}\p{N}]{3,}/gu) || []).filter(w => !STOP.has(w));
function windows(text, label, size = 1800) {
  const out = [];
  for (let i = 0; i < text.length; i += size) out.push({ label, text: text.slice(i, i + size + 200) });
  return out;
}
async function piecesFor(id) {
  if (Lib.pieceCache[id]) return Lib.pieceCache[id];
  let ps = [];
  if (id.startsWith("book:")) {
    const b = Lib.books.find(x => "book:" + x.id === id); if (!b) return [];
    for (const c of await Lib.chunks(b.id)) for (const p of c.pages) if (p.t) ps.push(...windows(p.t, `${b.title}, p. ${p.p}`));
  } else {
    const v = Lib.videos.find(x => "video:" + x.id === id); if (!v?.transcript) return [];
    ps = windows(v.transcript, `Video: ${v.title}${v.person ? " (" + v.person + ")" : ""}`);
  }
  ps.forEach(p => { const tf = new Map(); for (const w of tok(p.text)) tf.set(w, (tf.get(w) || 0) + 1); p.tf = tf; p.len = [...tf.values()].reduce((a, b) => a + b, 0) || 1; });
  return (Lib.pieceCache[id] = ps);
}
async function libraryPassages(query, k = 4, ids) {
  const all = ids || [...Lib.books.map(b => "book:" + b.id), ...Lib.videos.filter(v => v.transcript).map(v => "video:" + v.id)];
  let pieces = [];
  for (const id of all) { try { pieces = pieces.concat(await piecesFor(id)); } catch {} }
  if (!pieces.length) return [];
  const q = [...new Set(tok(query))].slice(0, 300);
  const df = new Map(); for (const w of q) { let n = 0; for (const p of pieces) if (p.tf.has(w)) n++; df.set(w, n); }
  const N = pieces.length;
  const scored = pieces.map(p => { let s = 0; for (const w of q) { const f = p.tf.get(w); if (f) s += (f / (f + 1.2 * (0.25 + 0.75 * p.len / 300))) * Math.log(1 + N / (df.get(w) || 1)); } return { p, s }; })
    .filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k);
  return scored.map(x => ({ label: x.p.label, text: x.p.text }));
}
const libraryIds = () => [...Lib.books.map(b => "book:" + b.id), ...Lib.videos.filter(v => v.transcript).map(v => "video:" + v.id)];

// ---------- Prompt pieces ----------
function writerById(id) {
  if (id && id.startsWith("book:")) {
    const b = Lib.books.find(x => "book:" + x.id === id);
    return b && { id, name: (b.author ? b.author + ", " : "") + b.title + " (your library)", group: "library", book: b, techniques: [], excerpts: [] };
  }
  return WRITERS.find(w => w.id === id);
}
const styleChoices = () => [...WRITERS.filter(w => w.group !== "craft"), ...Lib.books.filter(b => b.kind === "fiction").map(b => writerById("book:" + b.id))];
async function styleBrief(id, query) {
  const w = writerById(id); if (!w) return "";
  if (w.book) {
    const ps = await libraryPassages(query || w.book.title, 2, [id]);
    return `STYLE: the writing in "${w.book.title}"${w.book.author ? " by " + w.book.author : ""}, a book the writer uploaded to study.\nStyle notes: ${w.book.card?.style_notes || w.book.card?.summary || "(none yet)"}\nReference passages from that book (study the technique; never copy its sentences):\n` + ps.map(p => `[${p.label}]\n${p.text}`).join("\n\n");
  }
  let t = `STYLE: ${w.name} (${w.era}). ${w.signature}\nSignature techniques:\n` + w.techniques.map(x => `- ${x.name}: ${x.how}`).join("\n");
  if (w.excerpts?.length) t += `\nPublic-domain passages by ${w.name} (study the technique; don't copy sentences):\n` + w.excerpts.map(e => `[${e.work}]\n${e.text}`).join("\n\n");
  else t += `\n${w.name}'s work is under copyright: imitate the techniques only. Never reproduce, quote or closely paraphrase their actual sentences, dialogue or lyrics.`;
  return t;
}
function craftBrief(ids) {
  const cs = ids.map(id => WRITERS.find(w => w.id === id)).filter(Boolean);
  if (!cs.length) return "";
  return "CRAFT BOOKS TO DRAW ON:\n" + cs.map(c => `* ${c.name} (${c.era}): ${c.signature}\n  Key ideas: ${c.techniques.map(t => t.name + " — " + t.how).join(" | ")}` +
    (c.excerpts?.length ? `\n  Exact public-domain quotes you may cite: ${c.excerpts.map(e => `[${e.work}] "${e.text.slice(0, 600)}"`).join(" ")}` : `\n  (Cite this book by idea and title only; never invent quotes or page numbers.)`)).join("\n");
}
async function storyStyleBlock(s, query) {
  const st = s.style; if (!st?.a) return "";
  let t = "\nWRITING STYLE FOR THIS DRAFT:\n" + await styleBrief(st.a, query);
  if (st.b) t += `\n\nBLEND THE STYLE: about ${st.mix}% the style above and ${100 - st.mix}% this second style:\n` + await styleBrief(st.b, query);
  return t + "\nApply the style through technique (rhythm, imagery, structure, dialogue habits) while keeping the required language and format exactly.\n";
}
function styleLabel(st) {
  if (!st?.a) return "";
  const a = writerById(st.a)?.name || st.a, b = st.b ? writerById(st.b)?.name || st.b : "";
  return b ? `${st.mix}% ${a} + ${100 - st.mix}% ${b}` : a;
}
const HINGLISH = "Write in Hinglish (Hindi in Roman letters mixed naturally with English); use English craft terms where they're clearer.";
const MENTOR = "You are an honest writing mentor and script doctor who has taught Indian film, theatre and fiction writers. Be direct and specific, never harsh. Every criticism comes with a concrete fix. Always name at least one thing that genuinely works.";

// ---------- Room screens ----------
function renderRoom() {
  ({ home: roomHome, writer: roomWriter, critique: roomCritique, lesson: roomLesson, sbs: roomSbs, compare: roomCompare })[room.view]();
}
function backToRoom() { return h("button", { class: "ghost", onclick: () => { room.view = "home"; render(); } }, "← Writers' Room"); }
function roomHome() {
  const tools = [
    ["critique", "Critic", "Paste your writing or pick a draft part. Honest notes, line fixes and craft-book references."],
    ["sbs", "Side by side", "One paragraph rewritten in 2–3 writers' styles, next to each other."],
    ["compare", "Compare drafts", "Two drafts: every change highlighted, and the difference in story and style explained."],
  ];
  app.append(h("section", { class: "sheet" }, h("h2", { text: "Writers' Room" }),
    h("p", { class: "muted", text: "Learn from writers past and present, get critiques, and co-write in their styles. Pick a writer below for lessons, or open a tool." }),
    h("div", { class: "tools" }, tools.map(([v, t, d]) => h("button", { class: "tool", onclick: () => gotoRoom(v) },
      h("b", {}, v === "compare" ? icon(ICON_COMPARE) : null, t), h("span", { class: "muted small", text: d }))))));
  const groups = ["all", ...Object.keys(GROUP_LABEL)];
  const list = WRITERS.filter(w => (room.filter === "all" || w.group === room.filter) &&
    (!room.q || (w.name + " " + w.line + " " + w.works.join(" ")).toLowerCase().includes(room.q.toLowerCase())));
  const sec = h("section", { class: "sheet" },
    h("div", { class: "row" }, h("h2", { class: "spacer", text: "Style library" }),
      h("input", { id: "wsearch", type: "text", placeholder: "Search writers or works", value: room.q, style: "max-width:240px",
        oninput: e => { room.q = e.target.value; clearTimeout(roomHome.t); roomHome.t = setTimeout(() => { render(); const el = document.getElementById("wsearch"); el?.focus(); el?.setSelectionRange(el.value.length, el.value.length); }, 250); } })),
    h("div", { class: "chips" }, groups.map(g => h("button", { "aria-pressed": room.filter === g ? "true" : "false", onclick: () => { room.filter = g; render(); } }, g === "all" ? "All" : GROUP_LABEL[g]))),
    list.length ? h("div", { class: "stories" }, list.map(w => h("div", { class: "card", tabindex: "0", role: "button",
      onclick: () => gotoRoom("writer", { writerId: w.id }), onkeydown: e => { if (e.key === "Enter") gotoRoom("writer", { writerId: w.id }); } },
      h("span", { class: "t", text: w.name }), h("span", { class: "muted small", text: w.era + (w.area ? " · " + w.area : "") }),
      h("p", { class: "small", text: w.line }),
      h("span", { class: "chip" + (w.excerpts.length ? " gold" : ""), text: w.excerpts.length ? "Real passages" : "Style notes" }))))
      : h("div", { class: "empty" }, "No writer matches that search."),
    h("p", { class: "muted small", text: "“Real passages” are out-of-copyright texts copied from Wikisource, with the source named. Writers still under copyright have style notes, and any example Claude writes for them is labelled as an imitation." }));
  app.append(sec);
}
function roomWriter() {
  const w = writerById(room.writerId); if (!w) { room.view = "home"; return roomHome(); }
  const craft = w.group === "craft";
  const sec = h("section", { class: "sheet" }, h("div", { class: "row" }, backToRoom()),
    h("span", { class: "label", text: (GROUP_LABEL[w.group] || "") + " · " + w.era + (w.area ? " · " + w.area : "") }),
    h("h2", { text: w.name }), h("p", { class: "lead", text: w.line }), h("p", { text: w.signature }),
    h("h3", { text: craft ? "Key ideas" : "Signature techniques" }),
    h("div", { class: "techs" }, w.techniques.map(t => h("div", { class: "tech" },
      h("div", { class: "spacer" }, h("b", { text: t.name }), h("p", { class: "small", text: t.how })),
      h("button", { disabled: !AI.sample, onclick: () => startLesson(w.id, t) }, "Teach me")))),
    h("h3", { text: "Works to study" }), h("p", { class: "small", text: w.works.join(" · ") }));
  if (w.excerpts.length) {
    put(sec, h("h3", { text: "Real passages" }));
    for (const e of w.excerpts) put(sec, h("figure", { class: "excerpt" },
      h("blockquote", { class: e.lang === "hi" ? "hindi" : "", lang: e.lang, text: e.text }),
      h("figcaption", {}, h("b", { text: e.work }), " · ", h("a", { href: e.url, target: "_blank", rel: "noopener" }, e.source)),
      h("p", { class: "note small" }, h("b", { text: "What to notice: " }), e.note)));
    if (w.id === "premchand" || w.id === "prasad") put(sec, h("p", { class: "muted small", text: "Hindi Wikisource texts are scanned and typed by volunteers; one obvious scanning typo was corrected (ज़्यादा)." }));
  }
  if (!craft) {
    const im = room.imit[w.id];
    const out = h("div", { class: "page", id: "imitout" }); if (im) out.append(h("div", { class: "prose", text: im }));
    put(sec, h("h3", { text: "An example in this style" }),
      h("p", { class: "muted small", text: "Claude writes a short original scene using these techniques. It is an imitation, not the writer's own words." }),
      h("div", { class: "row" },
        h("select", { id: "imitlang", "aria-label": "Language", style: "max-width:180px", onchange: e => room.imitLang = e.target.value },
          [["hinglish", "Hinglish"], ["hindi", "Hindi"], ["english", "English"]].map(([v, l]) => h("option", { value: v, selected: room.imitLang === v ? "selected" : null }, l))),
        h("button", { disabled: !AI.sample || !!roomBusy, onclick: () => imitate(w) }, im ? "Write another" : "Write an imitation")),
      roomBusyRow(), (im || roomBusy) ? h("div", {}, h("span", { class: "chip", text: "Imitation by Claude" }), out) : null);
  }
  put(sec, h("div", { class: "row" },
    h("button", { onclick: () => gotoRoom("critique", { critique: { ...room.critique, lens: craft ? room.critique.lens : w.id, craft: craft ? [...new Set([...room.critique.craft, w.id])] : room.critique.craft } }) }, craft ? "Critique with this book" : "Critique my writing in this lens"),
    !craft ? h("button", { onclick: () => { if (!room.sbs.ids.includes(w.id)) room.sbs.ids = [...room.sbs.ids, w.id].slice(-3); gotoRoom("sbs"); } }, "Add to side by side") : null));
  app.append(sec);
}
async function imitate(w) {
  const ctrl = new AbortController(); roomBusy = { label: "Writing an imitation…", ctrl }; render();
  const lang = room.imitLang === "hindi" ? "Hindi in Devanagari" : room.imitLang === "english" ? "English" : "Hinglish (Roman script)";
  const prompt = `${await styleBrief(w.id, w.line)}\n\nWrite an ORIGINAL short scene (about 150–200 words) that shows these techniques clearly, set in present-day India, in ${lang}. Pick your own small situation. Do not quote or reproduce any real text by this writer. After the scene, add one line starting "Techniques used:" naming the 2–3 techniques you used.`;
  try { const el = document.getElementById("imitout"); room.imit[w.id] = await streamInto(el, prompt, { signal: ctrl.signal }); }
  catch (e) { toast(AI.errText(e)); }
  roomBusy = null; render();
}

// Lesson
function startLesson(id, tech) { room.lesson = { out: "", answer: "", check: "", err: "" }; gotoRoom("lesson", { writerId: id, tech }); runLesson(); }
async function runLesson() {
  const w = writerById(room.writerId), t = room.tech; if (!w || !AI.sample) return;
  const ctrl = new AbortController(); roomBusy = { label: "Preparing the lesson…", ctrl }; render();
  const lib = room.critique.useLib && libraryIds().length ? await libraryPassages(`${t.name} ${t.how} ${w.name}`, 3) : [];
  const src = w.group === "craft" ? craftBrief([w.id]) : await styleBrief(w.id, t.name);
  const prompt = `You are a warm, exacting writing teacher for an Indian screenwriter and novelist. ${HINGLISH}\n\n${src}\n\n` +
    (lib.length ? `PASSAGES FROM THE STUDENT'S OWN LIBRARY (books and video transcripts; cite as [label] if you use them):\n${lib.map(p => `[${p.label}]\n${p.text}`).join("\n\n")}\n\n` : "") +
    `Teach ONE technique: "${t.name}" — ${t.how}\n\nStructure the lesson in Markdown:\n## Technique kya hai\n(2–4 sentences)\n## Kyun kaam karti hai\n(the effect on the reader or audience)\n## Example\n${w.excerpts?.length ? "Quote 1–3 short lines EXACTLY from the public-domain passages above and explain what they do." : "Write a short ORIGINAL example (label it 'Imitation'); never quote this writer's real copyrighted text."}\n## Indian screen/stage pe kaise use karein\n(one concrete idea for a Hindi film, web series or play scene)\n## Galtiyan jo log karte hain\n(2–3 bullets)\n${lib.length ? "## Aapki library se\n(what the student's own books or videos add, with [label] citations)\n" : ""}## Exercise\n(one exercise the student can do in 10–15 minutes, with clear constraints)`;
  const el = document.getElementById("lessonout");
  try { room.lesson.out = await streamInto(el, prompt, { signal: ctrl.signal }); }
  catch (e) { room.lesson.err = AI.errText(e); }
  roomBusy = null; render();
}
async function checkExercise() {
  const w = writerById(room.writerId), t = room.tech;
  const ctrl = new AbortController(); roomBusy = { label: "Reading your exercise…", ctrl }; render();
  const prompt = `${MENTOR} ${HINGLISH}\n\nThe student just had this lesson:\n"""\n${room.lesson.out.slice(0, 6000)}\n"""\nTechnique: ${t.name} (${w.name}).\n\nTheir exercise attempt:\n"""\n${room.lesson.answer}\n"""\n\nGive feedback in Markdown:\n## Score\n(x/10 for how well the technique is used, one line why)\n## Kya kaam kiya\n## Kya sudhaarna hai\n(2–3 points, each with a fix)\n## Ek line ka upgrade\n(quote one of their lines with "> " and show the improved version)\n## Agla step`;
  try { room.lesson.check = await streamInto(document.getElementById("checkout"), prompt, { signal: ctrl.signal }); }
  catch (e) { room.lesson.err = AI.errText(e); }
  roomBusy = null; render();
}
function roomLesson() {
  const w = writerById(room.writerId), L = room.lesson;
  const sec = h("section", { class: "sheet" },
    h("div", { class: "row" }, h("button", { class: "ghost", onclick: () => gotoRoom("writer") }, "← " + w.name)),
    h("span", { class: "label", text: "Lesson · " + w.name }), h("h2", { text: room.tech.name }),
    errNote(L.err), h("div", { class: "page mdpage", id: "lessonout" }, L.out ? md(L.out) : null),
    !L.out ? roomBusyRow() : null);
  if (L.out && !(roomBusy && !L.check && roomBusy.label.startsWith("Preparing"))) {
    const ta = h("textarea", { id: "exercise", rows: 8, placeholder: "Write your exercise here…", value: L.answer, oninput: e => L.answer = e.target.value });
    put(sec, h("div", { class: "field" }, h("label", { for: "exercise" }, "Your exercise"), ta),
      roomBusy ? roomBusyRow() : h("div", { class: "row" },
        h("button", { class: "ghost", disabled: !AI.sample, onclick: () => { L.out = ""; L.check = ""; runLesson(); } }, "New version of this lesson"),
        h("span", { class: "spacer" }),
        h("button", { class: "primary", disabled: !AI.sample, onclick: () => { if (!L.answer.trim()) return toast("Write your exercise first"); checkExercise(); } }, "Check my exercise")),
      h("div", { class: "page mdpage", id: "checkout", hidden: !L.check && !(roomBusy && roomBusy.label.startsWith("Reading")) }, L.check ? md(L.check) : null));
  }
  app.append(sec);
}

// Critic
function partPicker(onPick, label = "Load from my stories") {
  const wrap = h("div", { class: "row" });
  const sSel = h("select", { "aria-label": "Story", style: "max-width:260px" }, h("option", { value: "" }, label + "…"),
    stories.filter(s => s.outline).map(s => h("option", { value: s.id }, s.outline.title || s.title || "Untitled")));
  const pSel = h("select", { "aria-label": "Part", style: "max-width:260px", hidden: true });
  let ps = {}, st = null;
  sSel.onchange = async () => {
    st = stories.find(s => s.id === sSel.value); pSel.hidden = true; if (!st) return;
    ps = await Store.parts(st.id).catch(() => ({}));
    const opts = [];
    st.outline.parts.forEach((p, k) => {
      if (!ps[k]?.text) return;
      opts.push(h("option", { value: k + ":cur" }, `Part ${k + 1}: ${p.title} (current)`));
      (ps[k].history || []).slice().reverse().forEach((v, j, arr) => opts.push(h("option", { value: k + ":h" + (arr.length - 1 - j) }, `Part ${k + 1}: earlier version ${arr.length - j}${v.style ? " · " + v.style : ""}`)));
    });
    pSel.replaceChildren(h("option", { value: "" }, opts.length ? "Pick a part…" : "No written parts yet"), ...opts); pSel.hidden = false;
  };
  pSel.onchange = () => {
    if (!pSel.value || !st) return;
    const [k, v] = pSel.value.split(":"); const p = ps[+k];
    const text = v === "cur" ? p.text : p.history[+v.slice(1)].text;
    onPick(text, `${st.outline.title} · Part ${+k + 1}${v === "cur" ? "" : " (earlier version)"}`, { story: st, i: +k });
  };
  wrap.append(sSel, pSel);
  return wrap;
}
function roomCritique() {
  const C = room.critique;
  const lensSel = h("select", { id: "lens", onchange: e => C.lens = e.target.value },
    h("option", { value: "" }, "No style lens"), styleChoices().map(w => h("option", { value: w.id, selected: C.lens === w.id ? "selected" : null }, w.name)));
  const crafts = WRITERS.filter(w => w.group === "craft");
  const hasLib = libraryIds().length > 0;
  const ta = h("textarea", { id: "crittext", rows: 10, placeholder: "Paste a scene, chapter or script pages…", value: C.text, oninput: e => { C.text = e.target.value; if (C.source && !C.fixes?.some(f => f.status === "fixed")) C.source = null; } });
  const sec = h("section", { class: "sheet" }, h("div", { class: "row" }, backToRoom()), h("h2", { text: "Critic" }),
    h("p", { class: "muted", text: "Honest-mentor notes in Hinglish: what works, the biggest problems with fixes, line-by-line improvements, and what the craft books say." }),
    partPicker((text, label, ref) => { C.text = text; C.label = label; C.marks = []; C.out = ""; C.fixes = []; C.source = ref && !/earlier version/.test(label) ? { storyId: ref.story.id, ks: [ref.i] } : null; render(); }),
    C.label ? h("p", { class: "small muted", text: "Loaded: " + C.label }) : null,
    C.marks?.length ? h("div", { class: "note" }, h("b", { text: `Focusing on ${C.marks.length} marked ${C.marks.length === 1 ? "line" : "lines"}` }),
      h("ol", { class: "focuslist" }, C.marks.map(m => h("li", {}, h("i", { text: "“" + m.quote.replace(/\s+/g, " ").slice(0, 140) + (m.quote.length > 140 ? "…" : "") + "”" }), m.note ? " — " + m.note : ""))),
      h("button", { class: "ghost", onclick: () => { C.marks = []; render(); } }, "Clear focus")) : null,
    h("div", { class: "field" }, h("label", { for: "crittext" }, "Text to critique"), ta),
    h("div", { class: "field" }, h("label", { for: "lens" }, "Style lens (optional)"), lensSel),
    h("div", { class: "field" }, h("span", { class: "label", text: "Craft books" }),
      h("div", { class: "checks" }, crafts.map(c => h("label", {}, h("input", { type: "checkbox", checked: C.craft.includes(c.id) ? "checked" : null,
        onchange: e => { C.craft = e.target.checked ? [...C.craft, c.id] : C.craft.filter(x => x !== c.id); } }), c.name.split(",")[0])))),
    hasLib ? h("label", { class: "checkline" }, h("input", { type: "checkbox", checked: C.useLib ? "checked" : null, onchange: e => C.useLib = e.target.checked }), "Also draw on my books and videos") : null,
    errNote(C.err),
    roomBusy ? roomBusyRow() : h("div", { class: "row end" }, h("button", { class: "primary", disabled: !AI.sample, onclick: runCritique }, "Critique")),
    h("div", { class: "page mdpage", id: "critout", hidden: !C.out && !roomBusy }, C.out ? md(C.out) : null));
  if (C.out && !roomBusy && C.fixes?.length) put(sec, fixList());
  if (C.out && !roomBusy) put(sec, h("div", { class: "row" },
    h("button", { disabled: !AI.sample, onclick: rewriteFromCritique }, "Rewrite using this critique"),
    C.rewrite ? h("button", { onclick: () => openCompare(C.text, C.rewrite, "Your original", "Rewrite after critique") }, icon(ICON_COMPARE), "Compare original and rewrite") : null));
  if (C.rewrite || (roomBusy && roomBusy.label.startsWith("Rewriting"))) put(sec, h("h3", { text: "Rewrite" }), h("div", { class: "page", id: "rewriteout" }, C.rewrite ? h("div", { class: "prose", text: C.rewrite }) : null));
  app.append(sec);
}
async function runCritique() {
  const C = room.critique;
  if (!C.text.trim()) { C.err = "Paste some writing or load a part first."; return render(); }
  C.err = ""; C.out = ""; C.rewrite = "";
  const ctrl = new AbortController(); roomBusy = { label: "Reading closely…", ctrl }; render();
  const text = C.text.slice(0, 40000);
  const lens = C.lens ? await styleBrief(C.lens, text.slice(0, 3000)) : "";
  const lib = C.useLib && libraryIds().length ? await libraryPassages(text.slice(0, 4000) + " " + C.craft.join(" "), 4) : [];
  const lensName = C.lens ? writerById(C.lens)?.name : "";
  const prompt = `${MENTOR} ${HINGLISH}\n\n${lens ? "STYLE LENS THE WRITER CHOSE:\n" + lens + "\n\n" : ""}${craftBrief(C.craft)}\n\n` +
    (lib.length ? `PASSAGES FROM THE WRITER'S OWN LIBRARY (their uploaded books and video transcripts). Cite them as [label] and recommend specific pages or moments to revisit:\n${lib.map(p => `[${p.label}]\n${p.text}`).join("\n\n")}\n\n` : "") +
    (C.marks?.length ? `WHILE READING, THE WRITER MARKED THESE LINES. Deal with every one of them first, in this order:\n${C.marks.map((m, n) => `${n + 1}. ${C.marks.some(x => x.part !== C.marks[0].part) ? "(Part " + (m.part + 1) + ") " : ""}"${m.quote.replace(/\s+/g, " ")}"${m.note ? " — writer's note: " + m.note : " — no note (they felt something was off)"}`).join("\n")}\n\n` : "") +
    `THE WRITER'S TEXT:\n"""\n${text}\n"""\n\nWrite the critique in Markdown with these headings:\n` +
    (C.marks?.length ? `## Aapki marked lines\n(one block per mark, in order: "### Mark N", the line quoted with "> ", what is wrong or right with it in light of the writer's note, then "**Fix:**" with a rewritten line or a concrete change)\n` : "") + `## Kya kaam kar raha hai\n## Sabse badi 3 problems\n(for each: what it is, why it hurts the reader or audience, and a concrete fix)\n## Line-by-line fixes\n(quote 3–6 original lines, each on its own line starting "> ", then the improved line and a few words on why)\n` +
    (lensName ? `## Style lens: ${lensName}\n(how close the text is to this style, which 2–3 techniques to borrow and where; refer to the passages above when they exist)\n` : "") +
    `## Craft books kya kehti hain\n(2–4 points, each naming the book and the idea; quote only the exact public-domain quotes given above; never invent quotes or page numbers)\n` +
    (lib.length ? `## Aapki library se\n(what their own books/videos suggest here, with [label] citations and what to re-read or re-watch)\n` : "") + `## Agla exercise\n(one short exercise aimed at the biggest problem)` +
    `\n## Revision list\n(a checklist, most important first, every item starting "- [ ] "${C.marks?.length ? ": include every marked line plus the 3 biggest problems" : ""})\n\n` +
    `Finally, after everything else, output the revision list again as machine-readable JSON inside a fenced block that starts with \`\`\`fixes and ends with \`\`\`:\n` +
    `{"items": [{"label": "short checklist text, same as above", "original": "the exact line or sentence from THE WRITER'S TEXT this item is about, copied character for character (keep its punctuation; no part labels); empty string if the item is not about one specific line", "replacement": "the improved version of that exact line, in the same language, script and format, ready to paste in its place; empty string if original is empty", "mark": the mark number this item answers, or null}]}\n` +
    `Give a replacement for every marked line and for every line-by-line fix. Keep "original" short: one line, sentence or dialogue block, never a whole paragraph.`;
  try {
    const raw = await streamInto(document.getElementById("critout"), prompt, { signal: ctrl.signal, tier: "complex", clean: cleanCritique });
    C.fixes = parseFixes(raw).map(f => ({ ...f, status: "open" }));
    C.out = C.fixes.length ? dropRevisionSection(cleanCritique(raw)) : cleanCritique(raw);
  }
  catch (e) { C.err = AI.errText(e); }
  roomBusy = null; render();
}
async function rewriteFromCritique() {
  const C = room.critique;
  const ctrl = new AbortController(); roomBusy = { label: "Rewriting with the critique…", ctrl }; render();
  const lens = C.lens ? await styleBrief(C.lens, C.text.slice(0, 3000)) : "";
  const prompt = `You are a skilled co-writer. Rewrite the writer's text applying the critique below. Keep the same language, script format, characters and events unless the critique says to change them. ${lens ? "\n\n" + lens : ""}\n\nCRITIQUE:\n"""\n${C.out}\n"""\n\nORIGINAL TEXT:\n"""\n${C.text.slice(0, 30000)}\n"""\n\nOutput only the rewritten text.`;
  let raf = 0;
  try {
    const r = await AI.sample(prompt, { signal: ctrl.signal, cache: false, modelTier: AI.tier("complex"),
      onText: ({ text }) => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; const el = document.getElementById("rewriteout"); if (el) el.replaceChildren(h("div", { class: "prose", text })); }); } });
    C.rewrite = r.text.trim();
  } catch (e) { C.err = AI.errText(e); }
  roomBusy = null; render();
}

// Side by side
function roomSbs() {
  const S = room.sbs;
  const choices = styleChoices();
  const sec = h("section", { class: "sheet" }, h("div", { class: "row" }, backToRoom()), h("h2", { text: "Side by side" }),
    h("p", { class: "muted", text: "The same passage rewritten in up to three styles, so you can see how each writer would handle it. Every version is an imitation by Claude." }),
    partPicker(text => { S.text = text.slice(0, 4000); render(); }),
    h("div", { class: "field" }, h("label", { for: "sbstext" }, "Passage (best under 300 words)"),
      h("textarea", { id: "sbstext", rows: 6, value: S.text, oninput: e => S.text = e.target.value })),
    h("div", { class: "field" }, h("span", { class: "label", text: `Styles (${S.ids.length} of 3)` }),
      h("div", { class: "checks" }, choices.map(w => h("label", {}, h("input", { type: "checkbox", checked: S.ids.includes(w.id) ? "checked" : null,
        disabled: !S.ids.includes(w.id) && S.ids.length >= 3 ? "disabled" : null,
        onchange: e => { S.ids = e.target.checked ? [...S.ids, w.id] : S.ids.filter(x => x !== w.id); render(); } }), w.name)))),
    errNote(S.err),
    roomBusy ? roomBusyRow() : h("div", { class: "row end" }, h("button", { class: "primary", disabled: !AI.sample || S.ids.length < 1, onclick: runSbs }, "Write side by side")));
  const ids = Object.keys(S.outs);
  if (ids.length || roomBusy) {
    put(sec, h("div", { class: "sbs" }, S.ids.map(id => h("div", { class: "sbscol" },
      h("span", { class: "chip", text: "Imitation: " + (writerById(id)?.name || id) }),
      h("div", { class: "page", id: "sbs-" + id }, S.outs[id] ? h("div", { class: "prose", text: S.outs[id] }) : null)))));
    if (ids.length >= 2 && !roomBusy) put(sec, h("div", { class: "row" }, h("button", { onclick: () => openCompare(S.outs[S.ids[0]], S.outs[S.ids[1]], writerById(S.ids[0])?.name, writerById(S.ids[1])?.name) }, icon(ICON_COMPARE), "Compare the first two")));
  }
  app.append(sec);
}
async function runSbs() {
  const S = room.sbs;
  if (!S.text.trim()) { S.err = "Paste a passage first."; return render(); }
  S.err = ""; S.outs = {};
  const ctrl = new AbortController(); roomBusy = { label: "Writing in each style…", ctrl }; render();
  await Promise.all(S.ids.map(async id => {
    const prompt = `${await styleBrief(id, S.text)}\n\nRewrite the passage below in this style. Keep the same events, characters and language (Hindi stays Hindi, Hinglish stays Hinglish, English stays English) and roughly the same length. Output only the rewritten passage.\n\nPASSAGE:\n"""\n${S.text.slice(0, 6000)}\n"""`;
    try {
      const r = await AI.sample(prompt, { signal: ctrl.signal, cache: false, modelTier: AI.tier("default"),
        onText: ({ text }) => { const el = document.getElementById("sbs-" + id); if (el) el.replaceChildren(h("div", { class: "prose", text })); } });
      S.outs[id] = r.text.trim();
    } catch (e) { if (e?.code !== "cancelled") S.err = AI.errText(e); }
  }));
  roomBusy = null; render();
}

// Compare drafts
function openCompare(a, b, aLabel, bLabel, back) { room.compare = { a: a || "", b: b || "", aLabel: aLabel || "Draft A", bLabel: bLabel || "Draft B", out: "", err: "", shown: true, back: back || "" }; gotoRoom("compare"); }
function textStats(t) {
  const words = (t.match(/\S+/g) || []).length;
  const sentences = Math.max(1, (t.match(/[^.!?।]+[.!?।]+/g) || []).length || 1);
  const paras = t.split(/\n\s*\n/).filter(x => x.trim()).length;
  const quoted = (t.match(/["“][^"”]*["”]/g) || []).join("").length;
  const lines = t.split("\n"); let dlg = 0;
  for (let i = 1; i < lines.length; i++) if (isUpper(lines[i - 1].trim().replace(/\(.*?\)/g, "")) && lines[i - 1].trim().length < 50 && lines[i].trim() && !isUpper(lines[i].trim())) dlg += lines[i].length;
  return { words, sentences, avg: Math.round(words / sentences * 10) / 10, paras, dialogue: Math.round(100 * Math.min(1, (quoted + dlg) / Math.max(1, t.length))) };
}
function wordDiff(a, b) {
  const A = a.match(/\S+\s*/g) || [], B = b.match(/\S+\s*/g) || [];
  const n = A.length, m = B.length;
  if (n * m > 12e6) return null;
  const key = s => s.trim();
  const dp = new Uint32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i * (m + 1) + j] = key(A[i]) === key(B[j]) ? dp[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + j + 1]);
  const out = []; let i = 0, j = 0;
  const push = (t, s) => { const last = out[out.length - 1]; if (last && last.t === t) last.s += s; else out.push({ t, s }); };
  while (i < n && j < m) {
    if (key(A[i]) === key(B[j])) { push("same", B[j]); i++; j++; }
    else if (dp[(i + 1) * (m + 1) + j] >= dp[i * (m + 1) + j + 1]) { push("del", A[i]); i++; }
    else { push("ins", B[j]); j++; }
  }
  while (i < n) push("del", A[i++]); while (j < m) push("ins", B[j++]);
  return out;
}
function roomCompare() {
  const C = room.compare;
  const side = (k, label) => h("div", { class: "field" },
    h("input", { type: "text", "aria-label": "Name of draft " + k.toUpperCase(), value: C[k + "Label"], oninput: e => C[k + "Label"] = e.target.value, class: "labelinput" }),
    partPicker((text, l) => { C[k] = text; C[k + "Label"] = l; C.out = ""; render(); }, "Load"),
    h("textarea", { id: "cmp" + k, rows: 8, value: C[k], placeholder: "Paste " + label + "…", oninput: e => { C[k] = e.target.value; } }));
  const sec = h("section", { class: "sheet" }, h("div", { class: "row" }, backToRoom()),
    C.back === "critique" ? h("div", { class: "row" }, h("button", { class: "ghost", onclick: () => gotoRoom("critique") }, "← Back to the critique")) : null,
    C.back === "draft" && story ? h("div", { class: "row" }, h("button", { class: "ghost", onclick: () => gotoTab("stories") }, "← Back to the draft")) : null,
    h("h2", {}, icon(ICON_COMPARE), " Compare drafts"),
    h("p", { class: "muted", text: "Every word that changed is highlighted, the numbers compare the two, and Claude explains the difference in story, characters and writing style." }),
    h("div", { class: "two" }, side("a", "the first draft"), side("b", "the second draft")),
    errNote(C.err),
    roomBusy ? roomBusyRow() : h("div", { class: "row end" }, h("button", { class: "primary", disabled: !AI.sample && false, onclick: runCompare }, "Compare")));
  if (C.shown && C.a.trim() && C.b.trim()) {
    const sa = textStats(C.a), sb = textStats(C.b);
    const row = (l, x, y, u = "") => h("tr", {}, h("th", { text: l }), h("td", { text: x + u }), h("td", { text: y + u }));
    put(sec, h("h3", { text: "At a glance" }), h("div", { class: "tablewrap" }, h("table", { class: "stats" },
      h("tr", {}, h("th"), h("th", { text: C.aLabel }), h("th", { text: C.bLabel })),
      row("Words", sa.words, sb.words), row("Sentences", sa.sentences, sb.sentences), row("Words per sentence", sa.avg, sb.avg),
      row("Paragraphs / blocks", sa.paras, sb.paras), row("Dialogue share (approx.)", sa.dialogue, sb.dialogue, "%"))));
    const d = wordDiff(C.a, C.b);
    const diffBox = h("div", { class: "page diff" });
    if (d) d.forEach(x => diffBox.append(x.t === "same" ? document.createTextNode(x.s) : h(x.t === "ins" ? "ins" : "del", { text: x.s })));
    else diffBox.append(h("p", { class: "muted", text: "These drafts are too long to highlight word by word. The explanation below still covers them in full." }));
    put(sec, h("h3", { text: "Every change" }), h("p", { class: "muted small" }, h("del", { text: "struck through" }), " = only in " + C.aLabel + " · ", h("ins", { text: "highlighted" }), " = only in " + C.bLabel), diffBox);
  }
  put(sec, h("div", { class: "page mdpage", id: "cmpout", hidden: !C.out && !roomBusy }, C.out ? md(C.out) : null));
  app.append(sec);
}
async function runCompare() {
  const C = room.compare;
  if (!C.a.trim() || !C.b.trim()) { C.err = "Add both drafts first."; return render(); }
  C.err = ""; C.shown = true; C.out = "";
  if (!AI.sample) return render();
  const ctrl = new AbortController(); roomBusy = { label: "Comparing the drafts…", ctrl }; render();
  const sa = textStats(C.a), sb = textStats(C.b);
  const names = WRITERS.filter(w => w.group !== "craft").map(w => w.name).join(", ");
  const prompt = `You are a senior story editor. Compare two drafts of the same piece and explain the differences thoroughly. ${HINGLISH}\n\nMeasured numbers — ${C.aLabel}: ${sa.words} words, ${sa.avg} words/sentence, ${sa.dialogue}% dialogue. ${C.bLabel}: ${sb.words} words, ${sb.avg} words/sentence, ${sb.dialogue}% dialogue.\n\nDRAFT A — "${C.aLabel}":\n"""\n${C.a.slice(0, 30000)}\n"""\n\nDRAFT B — "${C.bLabel}":\n"""\n${C.b.slice(0, 30000)}\n"""\n\nAnswer in Markdown with these headings:\n## Ek line mein farq\n## Kahani mein kya badla\n(events, information order, what's added or cut, the ending)\n## Characters aur dialogue\n(how each character reads differently; quote short lines with "> ")\n## Writing style ka farq\n(sentence rhythm, word choice, imagery, point of view, tense, show vs tell, pacing; use the numbers above. Say which writers each draft's style is closest to, choosing from: ${names}, and why)\n## Kaun kis cheez mein behtar\n(a Markdown table: | Aspect | ${C.aLabel} | ${C.bLabel} | covering hook, clarity, emotion, dialogue, pacing, originality, style consistency)\n## Recommendation\n(which draft to keep as the base, and exactly what to bring over from the other)`;
  try { C.out = await streamInto(document.getElementById("cmpout"), prompt, { signal: ctrl.signal, tier: "complex" }); }
  catch (e) { C.err = AI.errText(e); }
  roomBusy = null; render();
}

// ---------- Books ----------
const books = { view: "list", id: null, pending: null, progress: "", err: "", ask: {} };
let pdfjsP = null;
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn't load " + src)); document.head.append(s); }); }
function loadPdfJs() {
  if (!pdfjsP) pdfjsP = (async () => {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"); // runs in the page (no web worker needed)
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    return window.pdfjsLib;
  })().catch(e => { pdfjsP = null; throw e; });
  return pdfjsP;
}
async function readPdf(file) {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableFontFace: true }).promise;
  const meta = await doc.getMetadata().catch(() => null);
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i); const tc = await page.getTextContent();
    const t = tc.items.map(it => it.str + (it.hasEOL ? "\n" : " ")).join("").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    pages.push({ p: i, t }); page.cleanup?.();
    if (i % 5 === 0 || i === doc.numPages) { books.progress = `Reading page ${i} of ${doc.numPages}…`; const el = document.getElementById("bookprog"); if (el) el.textContent = books.progress; }
  }
  return { pages, title: meta?.info?.Title || "", author: meta?.info?.Author || "" };
}
async function onPdfChosen(file) {
  books.err = ""; books.pending = null;
  if (!file) return;
  if (file.size > 80 * 1024 * 1024) { books.err = "That PDF is over 80 MB. Split it into smaller files first."; return render(); }
  books.progress = "Opening the PDF…"; render();
  try {
    const r = await readPdf(file);
    const chars = r.pages.reduce((a, p) => a + p.t.length, 0);
    if (chars < 200) { books.err = "This PDF has almost no selectable text (it's probably scanned images), so it can't be read. Try a PDF where you can select the words."; books.progress = ""; return render(); }
    books.pending = { pages: r.pages, chars, title: r.title || file.name.replace(/\.pdf$/i, ""), author: r.author, kind: "craft", area: "Screenwriting" };
  } catch (e) { books.err = "Couldn't read that PDF: " + (e?.message || "unknown error"); }
  books.progress = ""; render();
}
async function saveBook() {
  const P = books.pending; if (!P) return;
  const id = "b" + Date.now().toString(36);
  const chunks = []; let cur = { n: 0, pages: [] }, size = 0;
  for (const p of P.pages) { if (size + p.t.length > 50000 && cur.pages.length) { chunks.push(cur); cur = { n: chunks.length, pages: [] }; size = 0; } cur.pages.push({ p: p.p, t: p.t.slice(0, 50000) }); size += p.t.length; }
  if (cur.pages.length) chunks.push(cur);
  const book = { id, title: P.title.trim() || "Untitled book", author: P.author.trim(), kind: P.kind, area: P.kind === "craft" ? P.area : "", pages: P.pages.length, chars: P.chars, docs: chunks.length, card: null, createdAt: Date.now() };
  books.progress = "Saving…"; render();
  try {
    await Lib.saveChunks(id, chunks, (i, n) => { const el = document.getElementById("bookprog"); if (el) el.textContent = `Saving part ${i} of ${n}…`; });
    await Lib.saveBook(book);
    Lib.books.unshift(book); books.pending = null; books.view = "detail"; books.id = id; books.progress = "";
    toast("Saved to your library"); render();
    makeBookCard(book);
  } catch (e) {
    books.err = Store.mode === "db" ? "Couldn't save the book: " + (e?.message || e?.code) : "This browser ran out of space for the book. Open Pehla Draft signed in to Claude to save books to your account.";
    books.progress = ""; render();
  }
}
async function makeBookCard(book) {
  if (!AI.sample) return;
  const ctrl = new AbortController(); roomBusy = { label: "Reading the book and writing a summary card…", ctrl }; render();
  const cs = await Lib.chunks(book.id);
  const pages = cs.flatMap(c => c.pages);
  const head = pages.slice(0, 12).map(p => `[p. ${p.p}] ${p.t}`).join("\n").slice(0, 14000);
  const step = Math.max(1, Math.floor(pages.length / 10));
  const samples = []; for (let i = 12; i < pages.length; i += step) samples.push(`[p. ${pages[i].p}] ${pages[i].t.slice(0, 1600)}`);
  const prompt = `A writer uploaded this book to learn from: "${book.title}"${book.author ? " by " + book.author : ""} (${book.kind === "craft" ? "a craft book on " + book.area : "fiction, a script or poetry to study as a style reference"}). Below are its opening pages and sample pages.\n\n${head}\n\n${samples.join("\n\n").slice(0, 26000)}\n\nWrite a study card. ${HINGLISH}\nReply with JSON only: {"summary": string (3–5 sentences), "key_ideas": [{"idea": string, "pages": string}] (5–8 items; give page numbers only where you saw them above), "use_it_for": [string] (3–5 concrete situations where this book helps a screenwriter/novelist), "style_notes": string (${book.kind === "fiction" ? "how this author writes: sentence rhythm, imagery, dialogue, structure, with page references" : "empty string"})}`;
  try {
    const c = await AI.sample.json(prompt, { signal: ctrl.signal, modelTier: AI.tier("default") });
    book.card = { summary: String(c.summary || ""), key_ideas: (c.key_ideas || []).map(k => ({ idea: String(k.idea || ""), pages: String(k.pages || "") })), use_it_for: (c.use_it_for || []).map(String), style_notes: String(c.style_notes || "") };
    await Lib.saveBook(book).catch(() => {});
  } catch (e) { books.err = "The book is saved, but the summary card failed: " + AI.errText(e); }
  roomBusy = null; render();
}
async function askLibrary(state, ids, q, elId) {
  const ctrl = new AbortController(); roomBusy = { label: "Searching and answering…", ctrl }; state.out = ""; render();
  const ps = await libraryPassages(q, 6, ids);
  const prompt = `${MENTOR} ${HINGLISH}\n\nThe writer asks: ${q}\n\nAnswer only from these passages of their own library. Cite each point as [label]. If the passages don't answer it, say so and suggest what to look for instead. End with "Kahan padhein/dekhein" listing the most useful [label] references.\n\n${ps.map(p => `[${p.label}]\n${p.text}`).join("\n\n") || "(no matching passages found)"}`;
  try { state.out = await streamInto(document.getElementById(elId), prompt, { signal: ctrl.signal }); }
  catch (e) { state.err = AI.errText(e); }
  roomBusy = null; render();
}
function renderBooks() {
  if (!Lib.loaded) { app.append(h("div", { class: "empty" }, "Loading your library…")); return; }
  if (books.view === "detail") return bookDetail();
  const P = books.pending;
  const up = h("section", { class: "sheet" }, h("h2", { text: "Books" }),
    h("p", { class: "muted", text: "Upload a PDF of a book you own: a craft book on screenwriting, acting or directing, or a novel or script whose style you want to study. Pehla Draft reads it, saves the text privately to your account, and draws on it in critiques, lessons and co-writing." }),
    errNote(books.err),
    books.progress ? h("div", { class: "busy", role: "status" }, h("span", { class: "dot" }), h("span", { id: "bookprog", text: books.progress })) :
      !P ? h("label", { class: "upload" }, h("input", { type: "file", accept: "application/pdf,.pdf", id: "pdfin", onchange: e => onPdfChosen(e.target.files[0]) }), h("b", { text: "Choose a PDF" }), h("span", { class: "muted small", text: "PDFs with selectable text work. Scanned pages can't be read." })) : null);
  if (P && !books.progress) up.append(h("div", { class: "sheet inner" },
    h("p", { class: "small", text: `Read ${P.pages.length} pages (${P.chars.toLocaleString("en-IN")} characters).` }),
    h("div", { class: "lengths" },
      h("div", { class: "field" }, h("label", { for: "btitle" }, "Title"), h("input", { id: "btitle", type: "text", value: P.title, oninput: e => P.title = e.target.value })),
      h("div", { class: "field" }, h("label", { for: "bauthor" }, "Author"), h("input", { id: "bauthor", type: "text", value: P.author, oninput: e => P.author = e.target.value }))),
    h("div", { class: "field" }, h("label", { for: "bkind" }, "What kind of book is it?"),
      h("select", { id: "bkind", onchange: e => { P.kind = e.target.value.split(":")[0]; P.area = e.target.value.split(":")[1] || ""; } },
        ["craft:Screenwriting", "craft:Acting", "craft:Directing", "craft:Theatre craft", "fiction:"].map(v => h("option", { value: v, selected: (P.kind + ":" + (P.kind === "craft" ? P.area : "")) === v ? "selected" : null },
          v === "fiction:" ? "Novel, story collection, script or poetry (style reference)" : "Craft book: " + v.split(":")[1])))),
    h("div", { class: "row end" }, h("button", { class: "ghost", onclick: () => { books.pending = null; render(); } }, "Cancel"), h("button", { class: "primary", onclick: saveBook }, "Save to my library"))));
  app.append(up);
  const list = h("section", { class: "sheet" }, h("h3", { text: `Your books (${Lib.books.length})` }));
  if (!Lib.books.length) list.append(h("div", { class: "empty" }, "Books you upload appear here, each with a summary card you can ask questions."));
  else list.append(h("div", { class: "stories" }, Lib.books.map(b => h("div", { class: "card", tabindex: "0", role: "button", onclick: () => { books.view = "detail"; books.id = b.id; render(); }, onkeydown: e => { if (e.key === "Enter") { books.view = "detail"; books.id = b.id; render(); } } },
    h("span", { class: "t", text: b.title }), h("span", { class: "muted small", text: (b.author || "Unknown author") + " · " + b.pages + " pages" }),
    h("span", { class: "chip" + (b.kind === "fiction" ? " gold" : ""), text: b.kind === "fiction" ? "Style reference" : b.area || "Craft" })))));
  app.append(list);
}
function bookDetail() {
  const b = Lib.books.find(x => x.id === books.id); if (!b) { books.view = "list"; return renderBooks(); }
  const A = books.ask[b.id] || (books.ask[b.id] = { q: "", out: "", err: "", confirm: false });
  const c = b.card;
  const sec = h("section", { class: "sheet" },
    h("div", { class: "row" }, h("button", { class: "ghost", onclick: () => { books.view = "list"; render(); } }, "← All books")),
    h("span", { class: "label", text: (b.kind === "fiction" ? "Style reference" : "Craft book · " + b.area) + " · " + b.pages + " pages" }),
    h("h2", { text: b.title }), b.author ? h("p", { class: "lead", text: b.author }) : null, errNote(books.err));
  if (c) {
    put(sec, h("p", { text: c.summary }), h("h3", { text: "Key ideas" }),
      h("ul", {}, c.key_ideas.map(k => h("li", {}, k.idea, k.pages ? h("span", { class: "muted small", text: " · p. " + k.pages }) : null))),
      h("h3", { text: "Use it when" }), h("ul", {}, c.use_it_for.map(u => h("li", { text: u }))),
      c.style_notes ? h("div", {}, h("h3", { text: "Style notes" }), h("p", { text: c.style_notes })) : null);
  } else put(sec, roomBusy ? roomBusyRow() : h("div", { class: "row" }, h("p", { class: "muted spacer", text: "No summary card yet." }), h("button", { disabled: !AI.sample, onclick: () => makeBookCard(b) }, "Write summary card")));
  put(sec, h("h3", { text: "Ask this book" }),
    h("div", { class: "field" }, h("label", { for: "bq" }, "Question"), h("textarea", { id: "bq", rows: 2, value: A.q, placeholder: "e.g. Interval point kaise design karein? Subtext ke liye kya exercise hai?", oninput: e => A.q = e.target.value })),
    roomBusy && c ? roomBusyRow() : h("div", { class: "row" }, h("button", { class: "primary", disabled: !AI.sample, onclick: () => { if (A.q.trim()) askLibrary(A, ["book:" + b.id], A.q, "bookans"); } }, "Ask"),
      b.kind === "fiction" ? h("button", { onclick: () => gotoRoom("critique", { critique: { ...room.critique, lens: "book:" + b.id } }) }, "Use as a style lens") : null),
    errNote(A.err), h("div", { class: "page mdpage", id: "bookans", hidden: !A.out && !roomBusy }, A.out ? md(A.out) : null),
    h("div", { class: "row end" }, A.confirm
      ? h("div", { class: "row" }, h("button", { class: "danger", onclick: async () => { await Lib.removeBook(b.id).catch(() => {}); books.view = "list"; toast("Book deleted"); render(); } }, "Delete for good"), h("button", { class: "ghost", onclick: () => { A.confirm = false; render(); } }, "Keep"))
      : h("button", { class: "ghost danger", onclick: () => { A.confirm = true; render(); } }, "Delete book")));
  app.append(sec);
}

// ---------- Videos ----------
const vids = { view: "list", id: null, form: null, err: "", busy: "", ask: {} };
function parseSubs(text) {
  const out = []; let stamp = "";
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const l = raw.trim();
    if (!l || l === "WEBVTT" || /^\d+$/.test(l) || /^NOTE\b/.test(l)) continue;
    const tc = l.match(/^(\d{1,2}:)?(\d{2}):(\d{2})[.,]\d{3}\s+-->/);
    if (tc) { const hh = tc[1] ? +tc[1].slice(0, -1) : 0; stamp = `[${hh ? hh + ":" : ""}${tc[2]}:${tc[3]}] `; continue; }
    out.push(stamp + l.replace(/<[^>]+>/g, "")); stamp = "";
  }
  return out.join("\n").replace(/\n(?!\[)/g, " ");
}
function capTranscript(t) {
  let s = t.slice(0, 80000);
  while (new TextEncoder().encode(s).length > 200000) s = s.slice(0, Math.floor(s.length * 0.9));
  return s;
}
function newVideoForm() { return { title: "", person: "", role: "Writer", link: "", file: null, transcript: "", notes: "" }; }
async function saveVideo() {
  const F = vids.form;
  if (!F.title.trim()) { vids.err = "Give the video a title."; return render(); }
  if (!F.file && !F.link.trim()) { vids.err = "Choose a video file or paste a link."; return render(); }
  if (F.file && F.file.size > 20 * 1024 * 1024) { vids.err = "That file is over 20 MB, the limit for uploads here. Paste a YouTube or other link instead, and add its transcript."; return render(); }
  if (F.link && !/^https?:\/\//i.test(F.link.trim())) { vids.err = "The link should start with https://"; return render(); }
  vids.err = ""; vids.busy = F.file ? "Uploading the video…" : "Saving…"; render();
  try {
    const v = { id: "v" + Date.now().toString(36), title: F.title.trim(), person: F.person.trim(), role: F.role, link: F.link.trim(), assetId: "", url: "",
      transcript: capTranscript(F.transcript.trim()), notes: F.notes.trim(), card: null, createdAt: Date.now() };
    if (F.file) {
      const assets = await claude.use("assets");
      if (!assets) throw new Error("Uploads aren't available in this view. Paste a link instead.");
      const r = await assets.upload(F.file); v.assetId = r.id; v.url = r.url;
    }
    await Lib.saveVideo(v); Lib.videos.unshift(v);
    vids.form = null; vids.view = "detail"; vids.id = v.id; vids.busy = ""; toast("Saved to your videos"); render();
    if (v.transcript || v.notes) makeVideoCard(v);
  } catch (e) {
    vids.busy = ""; vids.err = e?.code === "too_large" ? "That file is too big to upload (20 MB limit). Paste a link instead." : e?.code === "not_granted" ? "Uploading was not allowed. Allow file uploads in the page's permissions, or paste a link." : "Couldn't save the video: " + (e?.message || e?.code || "unknown error");
    render();
  }
}
async function makeVideoCard(v) {
  if (!AI.sample) return;
  const ctrl = new AbortController(); roomBusy = { label: "Studying the transcript…", ctrl }; render();
  const prompt = `A writer saved this interview or documentary to learn from: "${v.title}"${v.person ? " with " + v.person + " (" + v.role + ")" : ""}.\n${v.notes ? "Their notes: " + v.notes + "\n" : ""}\nTRANSCRIPT (timestamps in [mm:ss] where available):\n"""\n${(v.transcript || "(no transcript)").slice(0, 60000)}\n"""\n\nWrite a study card. ${HINGLISH} Use only what the transcript and notes say; never invent quotes.\nReply with JSON only: {"summary": string (3–4 sentences), "lessons": [{"lesson": string, "at": string (timestamp if present, else "")}] (4–8 craft lessons for a writer), "quotes": [{"text": string (exact words from the transcript, under 30 words), "at": string}] (up to 3), "try_this": [string] (2–3 exercises)}`;
  try {
    const c = await AI.sample.json(prompt, { signal: ctrl.signal, modelTier: AI.tier("default") });
    v.card = { summary: String(c.summary || ""), lessons: (c.lessons || []).map(x => ({ lesson: String(x.lesson || ""), at: String(x.at || "") })),
      quotes: (c.quotes || []).map(x => ({ text: String(x.text || ""), at: String(x.at || "") })).filter(q => q.text && (v.transcript || "").includes(q.text.slice(0, 25))),
      try_this: (c.try_this || []).map(String) };
    await Lib.saveVideo(v).catch(() => {});
  } catch (e) { vids.err = "The video is saved, but the study card failed: " + AI.errText(e); }
  roomBusy = null; render();
}
function renderVideos() {
  if (!Lib.loaded) { app.append(h("div", { class: "empty" }, "Loading your videos…")); return; }
  if (vids.view === "detail") return videoDetail();
  const F = vids.form;
  const sec = h("section", { class: "sheet" }, h("h2", { text: "Video corner" }),
    h("p", { class: "muted", text: "Keep interviews and documentaries on writers, actors and directors. Claude can't watch video, so add the transcript or subtitles (YouTube shows a transcript under the video) and it will turn them into lessons and use them in critiques." }),
    errNote(vids.err));
  if (!F) put(sec, h("div", { class: "row" }, h("button", { class: "primary", onclick: () => { vids.form = newVideoForm(); vids.err = ""; render(); } }, "+ Add a video")));
  else {
    const subIn = h("input", { type: "file", accept: ".srt,.vtt,.txt,text/plain,text/vtt", id: "subsin", onchange: async e => { const f = e.target.files[0]; if (!f) return; const t = await f.text(); F.transcript = /-->/.test(t) ? parseSubs(t) : t; render(); } });
    put(sec, h("div", { class: "sheet inner" },
      h("div", { class: "lengths" },
        h("div", { class: "field" }, h("label", { for: "vtitle" }, "Title"), h("input", { id: "vtitle", type: "text", value: F.title, placeholder: "e.g. Gulzar on writing Ijaazat", oninput: e => F.title = e.target.value })),
        h("div", { class: "field" }, h("label", { for: "vperson" }, "Who's speaking"), h("input", { id: "vperson", type: "text", value: F.person, oninput: e => F.person = e.target.value })),
        h("div", { class: "field" }, h("label", { for: "vrole" }, "They are a…"), h("select", { id: "vrole", onchange: e => F.role = e.target.value }, ["Writer", "Actor", "Director", "Other"].map(r => h("option", { selected: F.role === r ? "selected" : null }, r))))),
      h("div", { class: "field" }, h("label", { for: "vfile" }, "Video file (mp4 or webm, up to 20 MB)"),
        h("input", { id: "vfile", type: "file", accept: "video/mp4,video/webm", onchange: e => { F.file = e.target.files[0] || null; if (F.file && F.file.size > 20 * 1024 * 1024) { vids.err = "That file is over 20 MB. Paste a link instead."; F.file = null; render(); } } })),
      h("div", { class: "field" }, h("label", { for: "vlink" }, "…or a link (YouTube, Vimeo, any site)"), h("input", { id: "vlink", type: "text", inputmode: "url", value: F.link, placeholder: "https://", oninput: e => F.link = e.target.value })),
      h("div", { class: "field" }, h("label", { for: "vtrans" }, "Transcript or subtitles"),
        h("textarea", { id: "vtrans", rows: 6, value: F.transcript, placeholder: "Paste the transcript here, or load an .srt / .vtt subtitle file below", oninput: e => F.transcript = e.target.value }), subIn),
      h("div", { class: "field" }, h("label", { for: "vnotes" }, "Your notes (optional)"), h("textarea", { id: "vnotes", rows: 3, value: F.notes, oninput: e => F.notes = e.target.value })),
      vids.busy ? h("div", { class: "busy" }, h("span", { class: "dot" }), vids.busy) :
        h("div", { class: "row end" }, h("button", { class: "ghost", onclick: () => { vids.form = null; vids.err = ""; render(); } }, "Cancel"), h("button", { class: "primary", onclick: saveVideo }, "Save video"))));
  }
  app.append(sec);
  const list = h("section", { class: "sheet" }, h("h3", { text: `Your videos (${Lib.videos.length})` }));
  if (!Lib.videos.length) list.append(h("div", { class: "empty" }, "Videos you add appear here, each with lessons drawn from its transcript."));
  else list.append(h("div", { class: "stories" }, Lib.videos.map(v => h("div", { class: "card", tabindex: "0", role: "button", onclick: () => { vids.view = "detail"; vids.id = v.id; render(); }, onkeydown: e => { if (e.key === "Enter") { vids.view = "detail"; vids.id = v.id; render(); } } },
    h("span", { class: "t", text: v.title }), h("span", { class: "muted small", text: [v.person, v.role].filter(Boolean).join(" · ") }),
    h("div", { class: "row" }, h("span", { class: "chip", text: v.assetId ? "Uploaded" : "Link" }), v.transcript ? h("span", { class: "chip gold", text: "Transcript" }) : null)))));
  app.append(list);
}
function videoDetail() {
  const v = Lib.videos.find(x => x.id === vids.id); if (!v) { vids.view = "list"; return renderVideos(); }
  const A = vids.ask[v.id] || (vids.ask[v.id] = { q: "", out: "", err: "", confirm: false, edit: false, t: v.transcript });
  const c = v.card;
  const sec = h("section", { class: "sheet" },
    h("div", { class: "row" }, h("button", { class: "ghost", onclick: () => { vids.view = "list"; render(); } }, "← All videos")),
    h("span", { class: "label", text: [v.person, v.role].filter(Boolean).join(" · ") }), h("h2", { text: v.title }), errNote(vids.err),
    v.url ? h("video", { src: v.url, controls: true, playsinline: true, preload: "metadata", class: "player" }) : null,
    v.link ? h("p", {}, h("a", { href: v.link, target: "_blank", rel: "noopener" }, "Watch at the source ↗")) : null,
    v.notes ? h("p", { class: "note", text: v.notes }) : null);
  if (c) put(sec, h("h3", { text: "What to learn" }), h("p", { text: c.summary }),
    h("ul", {}, c.lessons.map(l => h("li", {}, l.lesson, l.at ? h("span", { class: "muted small", text: " · " + l.at }) : null))),
    c.quotes.length ? h("div", {}, h("h3", { text: "In their words" }), c.quotes.map(q => h("blockquote", {}, q.text, q.at ? h("span", { class: "muted small", text: " " + q.at }) : null))) : null,
    h("h3", { text: "Try this" }), h("ul", {}, c.try_this.map(t => h("li", { text: t }))));
  else if (v.transcript) put(sec, roomBusy ? roomBusyRow() : h("div", { class: "row" }, h("p", { class: "muted spacer", text: "No study card yet." }), h("button", { disabled: !AI.sample, onclick: () => makeVideoCard(v) }, "Write study card")));
  put(sec, h("details", { class: "transcript" }, h("summary", { text: v.transcript ? "Transcript" : "Add a transcript" }),
    h("textarea", { id: "vt-edit", rows: 8, value: A.t || "", placeholder: "Paste the transcript…", oninput: e => A.t = e.target.value }),
    h("div", { class: "row end" }, h("button", { onclick: async () => { v.transcript = capTranscript((A.t || "").trim()); v.card = null; delete Lib.pieceCache["video:" + v.id]; await Lib.saveVideo(v).catch(() => {}); toast("Transcript saved"); render(); if (v.transcript) makeVideoCard(v); } }, "Save transcript"))));
  if (v.transcript) put(sec, h("h3", { text: "Ask this video" }),
    h("div", { class: "field" }, h("label", { for: "vq" }, "Question"), h("textarea", { id: "vq", rows: 2, value: A.q, placeholder: "e.g. Dialogue likhne ke baare mein kya kehte hain?", oninput: e => A.q = e.target.value })),
    roomBusy && c ? roomBusyRow() : h("div", { class: "row" }, h("button", { class: "primary", disabled: !AI.sample, onclick: () => { if (A.q.trim()) askLibrary(A, ["video:" + v.id], A.q, "vidans"); } }, "Ask")),
    errNote(A.err), h("div", { class: "page mdpage", id: "vidans", hidden: !A.out && !roomBusy }, A.out ? md(A.out) : null));
  put(sec, h("div", { class: "row end" }, A.confirm
    ? h("div", { class: "row" }, h("button", { class: "danger", onclick: async () => { await Lib.removeVideo(v).catch(() => {}); vids.view = "list"; toast("Video deleted"); render(); } }, "Delete for good"), h("button", { class: "ghost", onclick: () => { A.confirm = false; render(); } }, "Keep"))
    : h("button", { class: "ghost danger", onclick: () => { A.confirm = true; render(); } }, "Delete video")));
  app.append(sec);
}

// ---------- Hooks into the story draft ----------
function stylePanel() {
  const st = story.style || (story.style = { a: "", b: "", mix: 70 });
  const choices = styleChoices();
  const sel = (id, val, label, on) => h("div", { class: "field" }, h("label", { for: id }, label),
    h("select", { id, onchange: e => { on(e.target.value); persist(); render(); } }, h("option", { value: "" }, "None"),
      choices.map(w => h("option", { value: w.id, selected: val === w.id ? "selected" : null }, w.name))));
  return h("details", { class: "sheet sofar", open: st.a ? true : null },
    h("summary", {}, h("h3", { text: "Co-writer style" + (st.a ? ": " + styleLabel(st) : "") })),
    h("p", { class: "muted small", text: "Pick a writer, or blend two. New parts and rewrites use these techniques; your language and format stay the same. Writers still under copyright are imitated by technique, never copied." }),
    h("div", { class: "lengths" },
      sel("stylea", st.a, "Main style", v => st.a = v),
      st.a ? sel("styleb", st.b, "Blend with (optional)", v => st.b = v) : null),
    st.a && st.b ? h("div", { class: "field" }, h("label", { for: "mix" }, `Mix: ${st.mix}% ${writerById(st.a)?.name} · ${100 - st.mix}% ${writerById(st.b)?.name}`),
      h("input", { id: "mix", type: "range", min: "50", max: "90", step: "10", value: st.mix, onchange: e => { st.mix = +e.target.value; persist(); render(); } })) : null);
}

// ---------- Reading mode ----------
const ICON_READ = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/></svg>';
const readerPrefs = (() => { try { return Object.assign({ size: 21, tone: "auto", font: "serif" }, JSON.parse(localStorage.getItem("pd.reader") || "{}")); } catch { return { size: 21, tone: "auto", font: "serif" }; } })();
const saveReaderPrefs = () => { try { localStorage.setItem("pd.reader", JSON.stringify(readerPrefs)); } catch {} };
let readerEl = null;
function openReader(startPart) {
  closeReader(true);
  const o = story.outline, script = medium(story) !== "page";
  const written = o.parts.map((p, k) => parts[k]?.text ? k : -1).filter(k => k >= 0);
  const words = written.reduce((a, k) => a + (parts[k].text.match(/\S+/g) || []).length, 0);
  const minutes = Math.max(1, Math.round(words / (script ? 180 : 220)));
  const darkHost = matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light" || document.documentElement.dataset.theme === "dark";
  const tone = () => readerPrefs.tone === "auto" ? (darkHost ? "night" : "day") : readerPrefs.tone;
  const root = h("div", { class: "reader", role: "dialog", "aria-modal": "true", "aria-label": "Reading mode: " + o.title, tabindex: "-1" });
  const apply = () => { root.dataset.tone = tone(); root.dataset.font = readerPrefs.font; root.style.setProperty("--r-size", readerPrefs.size + "px"); toneBtns.forEach(b => b.setAttribute("aria-pressed", b.dataset.t === readerPrefs.tone ? "true" : "false")); };
  const toneBtns = [["auto", "Auto"], ["day", "Day"], ["sepia", "Sepia"], ["night", "Night"]].map(([t, l]) => { const b = h("button", { onclick: () => { readerPrefs.tone = t; saveReaderPrefs(); apply(); } }, l); b.dataset.t = t; return b; });
  const progress = h("div", { class: "reader-progress", "aria-hidden": "true" });
  const panel = h("div", { class: "reader-panel", hidden: true },
    h("button", { "aria-label": "Smaller text", onclick: () => { readerPrefs.size = Math.max(16, readerPrefs.size - 2); saveReaderPrefs(); apply(); } }, "A−"),
    h("button", { "aria-label": "Larger text", onclick: () => { readerPrefs.size = Math.min(32, readerPrefs.size + 2); saveReaderPrefs(); apply(); } }, "A+"),
    toneBtns,
    script ? h("button", { onclick: e => { readerPrefs.font = readerPrefs.font === "serif" ? "courier" : "serif"; saveReaderPrefs(); apply(); e.currentTarget.textContent = readerPrefs.font === "serif" ? "Script font" : "Serif font"; } }, readerPrefs.font === "serif" ? "Script font" : "Serif font") : null,
    document.fullscreenEnabled ? h("button", { onclick: () => { (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen()).catch(() => {}); } }, "Full screen") : null);
  const marksPanel = h("div", { class: "reader-panel marks-panel", hidden: true });
  const marksBtn = h("button", { "aria-expanded": "false", onclick: () => { marksPanel.hidden = !marksPanel.hidden; panel.hidden = true; marksBtn.setAttribute("aria-expanded", String(!marksPanel.hidden)); if (!marksPanel.hidden) fillMarksPanel(); } });
  const fillMarksPanel = () => {
    const ms = allMarks();
    marksBtn.textContent = ms.length ? `Marks ${ms.length}` : "Marks";
    if (marksPanel.hidden) return;
    marksPanel.replaceChildren(...(ms.length ? ms.map(m => h("div", { class: "mk-item" },
      h("button", { class: "mk-jump", onclick: () => { const el = root.querySelector(`mark.hl[data-id="${m.id}"]`); marksPanel.hidden = true; el?.scrollIntoView({ block: "center", behavior: "smooth" }); el?.classList.add("flash"); setTimeout(() => el?.classList.remove("flash"), 1200); } },
        h("span", { class: "mk-q", text: "“" + m.quote.replace(/\s+/g, " ").slice(0, 120) + (m.quote.length > 120 ? "…" : "") + "”" }),
        m.note ? h("span", { class: "mk-n", text: m.note }) : null,
        h("span", { class: "mk-meta", text: (o.parts.length > 1 ? `Part ${m.part + 1}` : "") + (markStale(m.part, m) ? " · line has changed" : "") + (m.done ? " · done" : "") })))) :
      [h("p", { class: "mk-empty", text: "Select any words in the draft, then tap Highlight or Add note." })]),
      ms.length ? h("div", { class: "row", style: "justify-content:center;width:100%" }, h("button", { class: "done", onclick: () => critiqueMarks() }, "Critique marked lines")) : null);
  };
  const aa = h("button", { "aria-label": "Text settings", "aria-expanded": "false", onclick: () => { marksPanel.hidden = true; panel.hidden = !panel.hidden; aa.setAttribute("aria-expanded", String(!panel.hidden)); } }, "Aa");
  const bar = h("div", { class: "reader-bar" },
    h("button", { class: "done", onclick: () => closeReader() }, "Done"),
    h("span", { class: "rtitle", text: o.title }), marksBtn, aa, panel, marksPanel);
  const text = h("article", { class: "reader-text" },
    h("header", { class: "r-cover" }, h("h1", { text: o.title }), o.logline ? h("p", { text: o.logline }) : null,
      h("p", { class: "meta", text: `${fmtOf(story).name} · ${written.length} of ${o.parts.length} parts · about ${minutes} min read` })));
  o.parts.forEach((p, k) => {
    const sec = h("section", { class: "r-part", id: "rpart-" + k },
      o.parts.length > 1 ? h("div", { class: "r-label", text: `Part ${k + 1}` }) : null, h("h2", { text: p.title }));
    if (parts[k]?.text) { const body = h("div", { class: "r-body" }, renderText(parts[k].text)); body.dataset.part = k; sec.append(body); }
    else sec.append(h("p", { class: "r-missing", text: "This part isn't written yet." }));
    text.append(sec);
  });
  const endMarksBtn = h("button", { class: "primary", hidden: !allMarks().length, onclick: () => critiqueMarks() }, "Critique marked lines");
  text.append(h("footer", { class: "r-end" }, h("span", { class: "orn", text: "· · ·" }), h("p", { text: "End of the draft so far." }),
    h("div", { class: "row", style: "justify-content:center" },
      endMarksBtn,
      h("button", { class: endMarksBtn.hidden ? "primary" : "", onclick: () => { const t = written.map(k => parts[k].text).join("\n\n"); closeReader(); room.critique = { ...room.critique, text: t, label: o.title + " · whole draft", lens: story.style?.a || "", marks: [], out: "", rewrite: "", err: "", fixes: [], source: { storyId: story.id, ks: written } }; gotoRoom("critique"); } }, "Critique the whole draft"),
      h("button", { onclick: () => closeReader() }, "Back to editing"))));
  // Highlighting: select words, then Highlight or Add note. Tap a highlight to edit it.
  let lastSel = null, selTimer = 0;
  const pill = h("div", { class: "sel-pill", hidden: true },
    h("button", { onclick: () => { if (lastSel) { addMark(lastSel.k, lastSel.quote, lastSel.occ, ""); afterMark(); } } }, "Highlight"),
    h("button", { onclick: () => { if (lastSel) openSheet({ k: lastSel.k, quote: lastSel.quote, occ: lastSel.occ }); } }, "Add note"));
  pill.addEventListener("pointerdown", e => e.preventDefault());
  const sheetNote = h("textarea", { id: "marknote", rows: 3, placeholder: "Quick note, e.g. “too much explaining”, “sharper line chahiye”" });
  const sheetQuote = h("p", { class: "sheet-q" });
  const sheetDel = h("button", { class: "danger" }, "Remove highlight");
  const sheet = h("div", { class: "mark-sheet", hidden: true, role: "dialog", "aria-label": "Note for this line" },
    sheetQuote, h("label", { for: "marknote", class: "sheet-label" }, "Your note"), sheetNote,
    h("div", { class: "row" }, sheetDel, h("span", { class: "spacer" }), h("button", { onclick: () => { sheet.hidden = true; } }, "Cancel"), h("button", { class: "done" }, "Save")));
  let sheetTarget = null;
  sheet.querySelector("button.done").onclick = () => {
    const note = sheetNote.value.trim();
    if (sheetTarget.id) updateMark(sheetTarget.k, sheetTarget.id, { note }); else addMark(sheetTarget.k, sheetTarget.quote, sheetTarget.occ, note);
    sheet.hidden = true; afterMark();
  };
  sheetDel.onclick = () => { if (sheetTarget?.id) removeMark(sheetTarget.k, sheetTarget.id); sheet.hidden = true; afterMark(); };
  function openSheet(t) {
    sheetTarget = t; pill.hidden = true;
    sheetQuote.textContent = "“" + t.quote.replace(/\s+/g, " ").slice(0, 220) + (t.quote.length > 220 ? "…" : "") + "”";
    sheetNote.value = t.note || ""; sheetDel.hidden = !t.id; sheet.hidden = false; sheetNote.focus();
  }
  function afterMark() {
    getSelection()?.removeAllRanges(); pill.hidden = true; lastSel = null;
    root.querySelectorAll(".r-body").forEach(b => paintMarks(b, +b.dataset.part));
    endMarksBtn.hidden = !allMarks().length; fillMarksPanel();
  }
  document.addEventListener("selectionchange", onSel);
  function onSel() {
    if (!readerEl) return document.removeEventListener("selectionchange", onSel);
    clearTimeout(selTimer);
    selTimer = setTimeout(() => { const info = selectionInfo(root); if (info) { lastSel = info; pill.hidden = false; } else if (!sheet.contains(document.activeElement)) pill.hidden = true; }, 220);
  }
  text.addEventListener("click", e => {
    const mk = e.target.closest("mark.hl"); if (!mk) return;
    e.stopPropagation(); const k = +mk.closest(".r-body").dataset.part; const m = (parts[k].marks || []).find(x => x.id === mk.dataset.id);
    if (m) openSheet({ k, id: m.id, quote: m.quote, note: m.note });
  }, true);
  root.append(progress, bar, text, pill, sheet);
  apply();
  root.querySelectorAll(".r-body").forEach(b => paintMarks(b, +b.dataset.part));
  fillMarksPanel();
  // Bar hides while reading and returns on scroll up, tap, or mouse near the top.
  let lastY = 0, calmTimer = 0;
  root.addEventListener("scroll", () => {
    const y = root.scrollTop, max = root.scrollHeight - root.clientHeight;
    progress.style.width = (max > 0 ? Math.min(100, 100 * y / max) : 100) + "%";
    root.classList.toggle("calm", y > lastY + 4 && y > 120); if (y < lastY - 4) root.classList.remove("calm");
    lastY = y;
  }, { passive: true });
  text.addEventListener("click", e => { if (!e.target.closest("button") && getSelection()?.isCollapsed !== false) root.classList.toggle("calm"); });
  root.addEventListener("mousemove", e => { if (e.clientY < 70) root.classList.remove("calm"); });
  root.addEventListener("keydown", e => { if (e.key === "Escape" && !document.fullscreenElement) closeReader(); });
  document.body.append(root); document.body.style.overflow = "hidden";
  readerEl = root; root.focus({ preventScroll: true });
  if (startPart > 0 && parts[startPart]?.text) requestAnimationFrame(() => document.getElementById("rpart-" + startPart)?.scrollIntoView());
}
function closeReader(silent) {
  if (!readerEl) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  readerEl.remove(); readerEl = null; document.body.style.overflow = "";
  if (!silent) { if (tab === "stories" && story) render(); document.querySelector(".readbtn")?.focus(); }
}


// ---------- Marks: highlighted lines with notes ----------
const strip = t => (t || "").replace(/\s+/g, "");
function allMarks() {
  const out = [];
  (story?.outline?.parts || []).forEach((p, k) => (parts[k]?.marks || []).forEach(m => out.push({ ...m, part: k })));
  return out;
}
const markStale = (k, m) => !strip(parts[k]?.text).includes(strip(m.quote));
function saveMarks(k) { Store.savePart(story.id, parts[k]).catch(() => toast("Couldn't save the highlight")); }
function addMark(k, quote, occ, note) {
  const p = parts[k]; if (!p) return;
  p.marks = p.marks || [];
  p.marks.push({ id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), quote: quote.slice(0, 600), occ: occ || 0, note: note || "", at: Date.now(), done: false });
  saveMarks(k); toast(note ? "Note added" : "Highlighted");
}
function updateMark(k, id, patch) { const m = (parts[k]?.marks || []).find(x => x.id === id); if (m) { Object.assign(m, patch); saveMarks(k); } }
function removeMark(k, id) { if (!parts[k]) return; parts[k].marks = (parts[k].marks || []).filter(x => x.id !== id); saveMarks(k); }
function selectionInfo(root) {
  const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0);
  const el = n => n.nodeType === 3 ? n.parentNode : n;
  const body = el(r.startContainer).closest?.(".r-body");
  if (!body || !root.contains(body) || el(r.endContainer).closest?.(".r-body") !== body) return null;
  const quote = sel.toString().trim(); const q = strip(quote);
  if (q.length < 2) return null;
  const pre = document.createRange(); pre.setStart(body, 0); pre.setEnd(r.startContainer, r.startOffset);
  const preS = strip(pre.toString()); let occ = 0, i = -1;
  while ((i = preS.indexOf(q, i + 1)) >= 0) occ++;
  return { k: +body.dataset.part, quote, occ };
}
function paintMarks(container, k) {
  container.querySelectorAll("mark.hl").forEach(mk => mk.replaceWith(...mk.childNodes));
  container.normalize();
  const ms = parts[k]?.marks || []; if (!ms.length) return;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const map = []; let str = "", node;
  while ((node = walker.nextNode())) { const t = node.nodeValue; for (let i = 0; i < t.length; i++) if (!/\s/.test(t[i])) { map.push([node, i]); str += t[i]; } }
  const ranges = [];
  for (const m of ms) {
    const q = strip(m.quote); if (!q) continue;
    let idx = -1, from = 0;
    for (let n = 0; n <= (m.occ || 0); n++) { const f = str.indexOf(q, from); if (f < 0) break; idx = f; from = f + 1; }
    if (idx < 0) continue;
    const [sn, so] = map[idx], [en, eo] = map[idx + q.length - 1];
    const rg = document.createRange(); rg.setStart(sn, so); rg.setEnd(en, eo + 1);
    ranges.push({ rg, m });
  }
  for (const { rg, m } of ranges) {
    const nodes = []; const w = document.createTreeWalker(container, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) if (rg.intersectsNode(n)) nodes.push(n);
    const sc = rg.startContainer, so = rg.startOffset, ec = rg.endContainer, eo = rg.endOffset;
    for (let t of nodes) {
      let a = t === sc ? so : 0, b = t === ec ? eo : t.nodeValue.length;
      if (a >= b || !t.nodeValue.slice(a, b).trim()) continue;
      if (b < t.nodeValue.length) t.splitText(b);
      if (a > 0) t = t.splitText(a);
      const mk = document.createElement("mark"); mk.className = "hl" + (m.note ? " noted" : "") + (m.done ? " done" : ""); mk.dataset.id = m.id;
      if (m.note) mk.title = m.note;
      t.parentNode.insertBefore(mk, t); mk.append(t);
    }
  }
}
function critiqueMarks() {
  const ms = allMarks().filter(m => !m.done);
  if (!ms.length) return toast("All marked lines are done. Mark new ones, or untick some.");
  const ks = [...new Set(ms.map(m => m.part))].sort((a, b) => a - b);
  const o = story.outline;
  const text = ks.map(k => (o.parts.length > 1 ? `[Part ${k + 1}: ${o.parts[k].title}]\n` : "") + parts[k].text).join("\n\n");
  closeReader(true);
  room.critique = { ...room.critique, text, label: `${o.title} · ${ms.length} marked ${ms.length === 1 ? "line" : "lines"}`, lens: story.style?.a || "",
    marks: ms.map(m => ({ part: m.part, quote: m.quote, note: m.note })), out: "", rewrite: "", err: "", fixes: [], source: { storyId: story.id, ks } };
  gotoRoom("critique");
}
function revisionPanel() {
  const ms = allMarks(); if (!ms.length) return null;
  const open = ms.filter(m => !m.done).length;
  const o = story.outline;
  return h("details", { class: "sheet sofar revision", open: true },
    h("summary", {}, h("h3", { text: `Revision list · ${open} to do` + (ms.length - open ? `, ${ms.length - open} done` : "") })),
    h("p", { class: "muted small", text: "Lines you marked in reading mode. Tick them off as you fix them; the Critic works through the ones still open." }),
    h("ul", { class: "revlist" }, ms.map(m => h("li", { class: m.done ? "done" : "" },
      h("input", { type: "checkbox", id: "rv-" + m.id, checked: m.done ? "checked" : null, "aria-label": "Done", onchange: e => { updateMark(m.part, m.id, { done: e.target.checked }); render(); } }),
      h("label", { for: "rv-" + m.id },
        h("span", { class: "rv-q", text: "“" + m.quote.replace(/\s+/g, " ").slice(0, 160) + (m.quote.length > 160 ? "…" : "") + "”" }),
        m.note ? h("span", { class: "rv-n", text: m.note }) : null,
        h("span", { class: "muted small", text: (o.parts.length > 1 ? `Part ${m.part + 1}: ${o.parts[m.part].title}` : "") + (markStale(m.part, m) ? " · this line has changed since" : "") })),
      h("button", { class: "ghost", "aria-label": "Remove", onclick: () => { removeMark(m.part, m.id); render(); } }, "✕")))),
    h("div", { class: "row" },
      h("button", { onclick: () => openReader(ms.find(m => !m.done)?.part ?? 0) }, icon(ICON_READ), "Open in reading mode"),
      h("span", { class: "spacer" }),
      h("button", { class: "primary", disabled: !open || !AI.sample, onclick: () => critiqueMarks() }, "Critique marked lines")));
}


// ---------- Fix this line ----------
function cleanCritique(t) {
  const i = (t || "").search(/```\s*(fixes|json)/i);
  return i >= 0 ? t.slice(0, i).trimEnd() : t;
}
function dropRevisionSection(t) { return t.replace(/\n#{2,3}\s*Revision list[\s\S]*$/i, "").trimEnd(); }
function parseFixes(raw) {
  const m = (raw || "").match(/```\s*(?:fixes|json)\s*([\s\S]*?)```/i) || (raw || "").match(/```\s*(?:fixes|json)\s*([\s\S]*)$/i);
  if (!m) return [];
  try {
    const j = JSON.parse(m[1].trim());
    return (j.items || j || []).filter(x => x && x.label).map(x => ({ label: String(x.label), original: String(x.original || "").trim(), replacement: String(x.replacement || "").trim(), mark: Number(x.mark) || null }))
      .map(x => (x.original && x.replacement && x.original !== x.replacement) ? x : { ...x, original: "", replacement: "" });
  } catch { return []; }
}
const QUOTES = "[\"“”„'‘’]";
function findLoose(text, needle) {
  if (!text || !needle) return null;
  const i = text.indexOf(needle); if (i >= 0) return { start: i, end: i + needle.length };
  const esc = needle.trim().split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/["“”„'‘’]/g, QUOTES)).join("\\s+");
  try { const m = new RegExp(esc).exec(text); if (m) return { start: m.index, end: m.index + m[0].length }; } catch {}
  return null;
}
async function fixTargets() {
  const C = room.critique, src = C.source;
  if (!src?.storyId) return null;
  const cur = story && story.id === src.storyId;
  const ps = cur ? parts : (C._ps && C._ps.id === src.storyId ? C._ps.parts : null) || await Store.parts(src.storyId).catch(() => ({}));
  if (!cur) C._ps = { id: src.storyId, parts: ps };
  return ps;
}
function locateFix(f, ps) {
  const src = room.critique.source;
  if (ps) {
    const order = [...new Set([...(src.ks || []), ...Object.keys(ps).map(Number)])];
    for (const k of order) { const at = findLoose(ps[k]?.text, f.original); if (at) return { k, at }; }
    return null;
  }
  const at = findLoose(room.critique.text, f.original);
  return at ? { k: null, at } : null;
}
async function applyFix(i, quiet) {
  const C = room.critique, f = C.fixes[i];
  if (!f || f.status === "fixed" || !f.original) return false;
  const ps = await fixTargets();
  const hit = locateFix(f, ps);
  if (!hit) { f.err = "This line isn't in the draft any more (it may already have changed). Edit it by hand."; if (!quiet) render(); return false; }
  const splice = (t, at) => t.slice(0, at.start) + f.replacement + t.slice(at.end);
  if (ps) {
    const p = ps[hit.k], before = p.text;
    p.history = [...(p.history || []), { text: before, at: p.at || Date.now(), style: p.style || "", fix: f.label, made: p.made || "" }].slice(-8);
    p.text = splice(before, hit.at); p.at = Date.now(); p.made = "Fix: " + f.label;
    const mk = f.mark && C.marks?.[f.mark - 1];
    (p.marks || []).forEach(m => {
      if ((mk && strip(mk.quote) === strip(m.quote)) || strip(f.original).includes(strip(m.quote)) || strip(m.quote).includes(strip(f.original))) m.done = true;
    });
    try { await Store.savePart(C.source.storyId, p); }
    catch (e) { p.text = before; p.history.pop(); f.err = "Couldn't save the change: " + (e?.message || e?.code); if (!quiet) render(); return false; }
    f.applied = { k: hit.k, before, after: p.text };
    const inText = findLoose(C.text, f.original); if (inText) C.text = splice(C.text, inText);
  } else {
    const before = C.text; C.text = splice(before, hit.at); f.applied = { k: null, before, after: C.text };
  }
  f.status = "fixed"; f.err = "";
  if (!quiet) { toast("Line fixed"); render(); }
  return true;
}
async function undoFix(i) {
  const C = room.critique, f = C.fixes[i]; if (!f?.applied) return;
  const ps = await fixTargets();
  if (ps && f.applied.k != null) {
    const p = ps[f.applied.k];
    const at = findLoose(p.text, f.replacement);
    if (!at) { f.err = "The fixed line has been edited since, so it can't be undone automatically."; return render(); }
    const before = p.text;
    p.history = [...(p.history || []), { text: before, at: p.at || Date.now(), style: p.style || "", fix: "Undo: " + f.label, made: p.made || "" }].slice(-8);
    p.text = before.slice(0, at.start) + f.original + before.slice(at.end); p.at = Date.now(); p.made = "Undid fix: " + f.label;
    await Store.savePart(C.source.storyId, p).catch(() => {});
    const t2 = findLoose(C.text, f.replacement); if (t2) C.text = C.text.slice(0, t2.start) + f.original + C.text.slice(t2.end);
  } else {
    const at = findLoose(C.text, f.replacement); if (at) C.text = C.text.slice(0, at.start) + f.original + C.text.slice(at.end);
  }
  f.status = "open"; f.applied = null; f.err = ""; toast("Change undone"); render();
}
async function fixAll(btn) {
  const C = room.critique; let n = 0;
  btn.disabled = true; btn.textContent = "Fixing…";
  for (let i = 0; i < C.fixes.length; i++) if (C.fixes[i].status === "open" && C.fixes[i].original) { if (await applyFix(i, true)) n++; }
  toast(n ? `Fixed ${n} ${n === 1 ? "line" : "lines"}` : "No lines could be fixed automatically"); render();
}
function fixList() {
  const C = room.critique;
  const fixable = C.fixes.filter(f => f.original && f.status === "open").length;
  const done = C.fixes.filter(f => f.status !== "open").length;
  const target = C.source?.storyId ? "your draft" : "the text above";
  return h("div", { class: "fixes" },
    h("div", { class: "row" }, h("h3", { class: "spacer", text: `Revision list · ${C.fixes.length - done} to do` }),
      fixable > 1 ? h("button", { onclick: e => fixAll(e.currentTarget) }, `Fix all ${fixable} lines`) : null),
    h("p", { class: "muted small", text: `“Fix this line” puts the suggested line into ${target} and keeps the old version, so you can compare or undo.` }),
    h("ul", { class: "revlist" }, C.fixes.map((f, i) => h("li", { class: f.status !== "open" ? "done" : "" },
      !f.original ? h("input", { type: "checkbox", id: "fx-" + i, "aria-label": "Done", checked: f.status === "done" ? "checked" : null, onchange: e => { f.status = e.target.checked ? "done" : "open"; render(); } })
        : h("span", { class: "fx-dot" + (f.status === "fixed" ? " on" : ""), "aria-hidden": "true", text: f.status === "fixed" ? "✓" : "" }),
      h("div", { class: "fx-body" },
        h("label", { for: f.original ? null : "fx-" + i, class: "rv-n", text: f.label }),
        f.original ? h("div", { class: "fx-diff" }, h("del", { text: f.original }), h("ins", { text: f.replacement })) : null,
        f.err ? h("p", { class: "small", style: "color:var(--danger)", text: f.err }) : null,
        f.original ? h("div", { class: "row" },
          f.status === "fixed"
            ? [h("button", { onclick: () => undoFix(i) }, "Undo"),
               h("button", { onclick: () => openCompare(f.applied.before, f.applied.after, "Before: " + f.label.slice(0, 40), "After the fix", "critique") }, icon(ICON_COMPARE), "Compare")]
            : h("button", { class: "primary", onclick: () => applyFix(i) }, "Fix this line")) : null)))));
}


// ---------- Version timeline ----------
const tl = { key: "", sel: [] };
function versionsOf(p) {
  const hs = p.history || [];
  const vs = hs.map((v, j) => ({ text: v.text, at: v.at, style: v.style,
    made: v.made || (j === 0 ? "First draft" : hs[j - 1].fix ? "Fix: " + hs[j - 1].fix : "Rewrite" + (v.style ? " · " + v.style : "")) }));
  vs.push({ text: p.text, at: p.at, style: p.style, current: true,
    made: p.made || (hs.length && hs[hs.length - 1].fix ? "Fix: " + hs[hs.length - 1].fix : hs.length ? "Rewrite" + (p.style ? " · " + p.style : "") : "First draft") });
  return vs;
}
const fmtWhen = at => at ? new Date(at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
function timeline(k) {
  const p = parts[k]; const vs = versionsOf(p);
  const key = story.id + ":" + k + ":" + vs.length;
  if (tl.key !== key) { tl.key = key; tl.sel = []; }
  const toggle = j => { tl.sel = tl.sel.includes(j) ? tl.sel.filter(x => x !== j) : [...tl.sel, j].slice(-2); render(); };
  const track = h("div", { class: "tl-track", role: "group", "aria-label": "Versions of this part" }, vs.map((v, j) =>
    h("button", { class: "tl-v" + (v.current ? " cur" : ""), "aria-pressed": tl.sel.includes(j) ? "true" : "false", title: `v${j + 1} · ${v.made} · ${fmtWhen(v.at)}`, onclick: () => toggle(j) },
      h("span", { class: "tl-dot" }), h("span", { class: "tl-n", text: v.current ? `v${j + 1} · now` : `v${j + 1}` }), h("span", { class: "tl-m", text: v.made }))));
  const words = t => (t.match(/\S+/g) || []).length;
  let info;
  if (!tl.sel.length) info = h("p", { class: "muted small", text: "Tap a dot to see that version, or tap two to compare them." });
  else if (tl.sel.length === 1) {
    const j = tl.sel[0], v = vs[j];
    info = h("div", { class: "tl-info" },
      h("div", {}, h("b", { text: `v${j + 1}${v.current ? " (current)" : ""}` }), h("span", { class: "muted small", text: ` · ${fmtWhen(v.at)} · ${words(v.text).toLocaleString("en-IN")} words` })),
      h("p", { class: "small", text: v.made }),
      h("p", { class: "muted small", text: "“" + v.text.replace(/\s+/g, " ").slice(0, 160) + (v.text.length > 160 ? "…" : "") + "”" }),
      h("div", { class: "row" },
        !v.current ? h("button", { onclick: () => openCompare(v.text, p.text, `v${j + 1} · ${v.made}`, `v${vs.length} · now`, "draft") }, icon(ICON_COMPARE), "Compare with now") : null,
        !v.current ? h("button", { class: "primary", onclick: () => restoreVersion(k, j) }, "Restore this version") : h("span", { class: "muted small", text: "Tap another dot to compare." })));
  } else {
    const [a, b] = [...tl.sel].sort((x, y) => x - y);
    info = h("div", { class: "tl-info" },
      h("p", { class: "small" }, h("b", { text: `v${a + 1}` }), ` ${vs[a].made}  →  `, h("b", { text: `v${b + 1}` }), ` ${vs[b].made}`),
      h("div", { class: "row" },
        h("button", { class: "primary", onclick: () => openCompare(vs[a].text, vs[b].text, `v${a + 1} · ${vs[a].made}`, `v${b + 1}${vs[b].current ? " · now" : ""} · ${vs[b].made}`, "draft") }, icon(ICON_COMPARE), `Compare v${a + 1} and v${b + 1}`),
        h("button", { class: "ghost", onclick: () => { tl.sel = []; render(); } }, "Clear")));
  }
  requestAnimationFrame(() => { const last = tl.sel.length ? track.children[Math.max(...tl.sel)] : track.lastElementChild; if (last) track.scrollLeft = Math.max(0, last.offsetLeft + last.offsetWidth - track.clientWidth); });
  return h("div", { class: "tl" }, h("span", { class: "label", text: `Versions (${vs.length})` }), track, info);
}
async function restoreVersion(k, j) {
  const p = parts[k]; const vs = versionsOf(p); const v = vs[j]; if (!v || v.current) return;
  p.history = [...(p.history || []), { text: p.text, at: p.at || Date.now(), style: p.style || "", made: vs[vs.length - 1].made }].slice(-8);
  p.text = v.text; p.style = v.style || ""; p.at = Date.now(); p.made = `Restored v${j + 1} (${v.made})`; p.truncated = false;
  try { await Store.savePart(story.id, p); toast(`Restored v${j + 1}. The text you had is kept in the timeline.`); }
  catch (e) { toast("Couldn't save: " + (e?.message || e?.code)); }
  tl.key = ""; render();
}


// ---------- Story dashboard ----------
const wc = t => ((t || "").match(/\S+/g) || []).length;
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function computeStats(s, ps) {
  const total = s.outline?.parts.length || 0;
  let written = 0, words = 0, open = 0;
  for (let k = 0; k < total; k++) {
    const p = ps[k]; if (p?.text) { written++; words += wc(p.text); }
    open += (p?.marks || []).filter(m => !m.done).length;
  }
  return { total, written, words, open };
}
function pruneDaily(d) { const cut = dayKey(new Date(Date.now() - 60 * 864e5)); for (const k of Object.keys(d)) if (k < cut) delete d[k]; return d; }
function backfillDaily(s, ps) {
  const d = {};
  for (const p of Object.values(ps || {})) if (p?.text && p.at) { const k = dayKey(new Date(p.at)); d[k] = (d[k] || 0) + wc(p.text); }
  return pruneDaily(d);
}
let statsTimer = 0;
function partsChanged(id) {
  if (story && story.id === id) { clearTimeout(statsTimer); statsTimer = setTimeout(refreshStats, 400); }
  else { const s = stories.find(x => x.id === id); if (s?.stats) s.stats.stale = true; }
}
function refreshStats() {
  if (!story?.outline) return;
  const st = computeStats(story, parts), prev = story.stats;
  let daily = { ...(prev?.daily || {}) };
  if (prev && prev.words != null && !prev.stale) { const d = st.words - prev.words; if (d > 0) { const k = dayKey(); daily[k] = (daily[k] || 0) + d; } }
  else if (!prev) daily = backfillDaily(story, parts);
  story.stats = { ...st, daily: pruneDaily(daily), at: Date.now() };
  const listed = stories.find(x => x.id === story.id); if (listed) listed.stats = story.stats;
  persist();
}
async function backfillStats() {
  let changed = false;
  for (const s of stories) {
    if (!s.outline || (s.stats && !s.stats.stale)) continue;
    try {
      const ps = await Store.parts(s.id);
      const st = computeStats(s, ps);
      s.stats = { ...st, daily: s.stats?.daily ? s.stats.daily : backfillDaily(s, ps), at: Date.now() };
      await Store.save(s, true); changed = true;
    } catch {}
  }
  if (changed && !story && tab === "stories") render();
}
function attention(s) {
  const st = s.stats; if (!st) return null;
  const days = Object.entries(st.daily || {}).filter(([, v]) => v > 0).map(([k]) => k).sort();
  const last = days.length ? new Date(days[days.length - 1] + "T12:00:00") : new Date(s.updatedAt);
  const idle = Math.floor((Date.now() - last.getTime()) / 864e5);
  if (st.open) return { warn: true, text: `${st.open} ${st.open === 1 ? "line" : "lines"} to revise` };
  if (st.total && st.written < st.total && idle >= 7) return { warn: true, text: `No new words for ${idle} days` };
  if (st.total && st.written === 0) return { warn: true, text: "No parts written yet" };
  if (st.total && st.written === st.total) return { warn: false, text: "All parts written" };
  return { warn: false, text: "On track" };
}
let sparkTip = null;
function sparkline(daily) {
  const N = 14, today = new Date(); const days = [];
  for (let i = N - 1; i >= 0; i--) { const d = new Date(today.getTime() - i * 864e5); days.push({ k: dayKey(d), d, v: daily?.[dayKey(d)] || 0 }); }
  const max = Math.max(...days.map(x => x.v), 1), sum = days.reduce((a, x) => a + x.v, 0);
  const W = 14 * 10, H = 34, bw = 7;
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Words added per day, last 14 days: ${sum.toLocaleString("en-IN")} in total, most on one day ${max === 1 && !sum ? 0 : max.toLocaleString("en-IN")}.`);
  const tipText = x => `${x.d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}: ${x.v.toLocaleString("en-IN")} words`;
  days.forEach((x, i) => {
    const g = document.createElementNS(NS, "g");
    const hgt = x.v ? Math.max(3, Math.round((x.v / max) * (H - 2))) : 2;
    const xPos = i * 10 + 1.5;
    const hit = document.createElementNS(NS, "rect"); hit.setAttribute("class", "hit"); hit.setAttribute("x", i * 10); hit.setAttribute("y", 0); hit.setAttribute("width", 10); hit.setAttribute("height", H);
    const bar = document.createElementNS(NS, "path"); bar.setAttribute("class", "bar" + (x.v ? "" : " zero"));
    const r = Math.min(2, bw / 2, hgt / 2), y = H - hgt;
    bar.setAttribute("d", `M${xPos},${H} V${y + r} Q${xPos},${y} ${xPos + r},${y} H${xPos + bw - r} Q${xPos + bw},${y} ${xPos + bw},${y + r} V${H} Z`);
    const title = document.createElementNS(NS, "title"); title.textContent = tipText(x); g.append(title);
    g.append(hit, bar);
    g.addEventListener("pointerenter", e => {
      sparkTip?.remove(); sparkTip = h("div", { class: "spark-tip", text: tipText(x) });
      const rc = bar.getBoundingClientRect(); sparkTip.style.left = (rc.left + rc.width / 2) + "px"; sparkTip.style.top = rc.top + "px"; document.body.append(sparkTip);
    });
    g.addEventListener("pointerleave", () => { sparkTip?.remove(); sparkTip = null; });
    svg.append(g);
  });
  return h("div", { class: "spark" }, svg,
    h("div", { class: "spark-cap" }, h("span", { text: "Words added, last 14 days" }), h("span", { text: sum.toLocaleString("en-IN") })));
}
function storyDash(s) {
  if (!s.outline) return h("p", { class: "muted small", text: "No outline yet." });
  const st = s.stats;
  if (!st) return h("p", { class: "muted small", text: "Counting words…" });
  const a = attention(s);
  const target = totalWords(s) || 0;
  return h("div", { class: "dash" },
    a ? h("span", { class: "attn" + (a.warn ? "" : " ok"), text: a.text }) : null,
    h("div", { class: "dash-stats" },
      h("div", { class: "dash-stat" }, h("b", { text: `${st.written}/${st.total}` }), h("span", { text: "parts written" })),
      h("div", { class: "dash-stat" }, h("b", { text: st.words >= 10000 ? (st.words / 1000).toFixed(1).replace(/\.0$/, "") + "k" : st.words.toLocaleString("en-IN") }),
        h("span", { text: target ? `of ~${target >= 10000 ? Math.round(target / 1000) + "k" : target.toLocaleString("en-IN")} words` : "words" })),
      h("div", { class: "dash-stat" + (st.open ? " warn" : "") }, h("b", { text: String(st.open) }), h("span", { text: "to revise" }))),
    h("div", { class: "dash-bar", role: "progressbar", "aria-label": "Parts written", "aria-valuemin": "0", "aria-valuemax": String(st.total), "aria-valuenow": String(st.written) },
      h("i", { style: `width:${st.total ? Math.round(100 * st.written / st.total) : 0}%` })),
    sparkline(st.daily));
}


// ---------- Daily writing goal ----------
const Goal = {
  words: 100, remindAt: "20:00", remindOn: true, loaded: false,
  async load() {
    try {
      let d = null;
      if (Store.mode === "db") { const snap = await Store.col().doc("_settings").get(); if (snap.exists) d = snap.data(); }
      else { d = Store.localGet("pd.settings", null); const old = Store.localGet("pd.goal", null); if (!d && old) d = { goal: old }; }
      if (d?.goal) this.words = d.goal;
      if (typeof d?.remindAt === "string" && /^\d{2}:\d{2}$/.test(d.remindAt)) this.remindAt = d.remindAt;
      if (typeof d?.remindOn === "boolean") this.remindOn = d.remindOn;
    } catch {}
    this.loaded = true;
  },
  async save() {
    const data = { goal: this.words, remindAt: this.remindAt, remindOn: this.remindOn };
    try {
      if (Store.mode === "db") await Store.col().doc("_settings").set(data);
      else Store.localSet("pd.settings", data);
    } catch { toast("Couldn't save your goal settings"); }
  },
  async set(n) { this.words = Math.max(50, Math.min(5000, Math.round(n / 50) * 50)); await this.save(); },
};
function dailyTotals() {
  const tot = {};
  for (const s of stories) for (const [k, v] of Object.entries(s.stats?.daily || {})) tot[k] = (tot[k] || 0) + v;
  if (story?.stats?.daily && !stories.some(s => s.id === story.id)) for (const [k, v] of Object.entries(story.stats.daily)) tot[k] = (tot[k] || 0) + v;
  return tot;
}
function streakOf(tot, goal) {
  let n = 0; const today = dayKey();
  let d = new Date();
  if ((tot[today] || 0) < goal) d = new Date(d.getTime() - 864e5); // today still counts once you reach it
  while ((tot[dayKey(d)] || 0) >= goal) { n++; d = new Date(d.getTime() - 864e5); }
  return n;
}
function goalCard() {
  const tot = dailyTotals(), g = Goal.words, today = tot[dayKey()] || 0;
  const pct = Math.min(1, today / g), streak = streakOf(tot, g), met = today >= g;
  const R = 36, C = 2 * Math.PI * R;
  const ring = h("div", { class: "ring", role: "img", "aria-label": `${today} of ${g} words written today` });
  ring.innerHTML = `<svg viewBox="0 0 84 84" aria-hidden="true"><circle class="track" cx="42" cy="42" r="${R}" fill="none" stroke-width="8"/><circle class="prog" cx="42" cy="42" r="${R}" fill="none" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"${pct === 0 ? ' opacity="0"' : ""}/></svg>`;
  ring.append(h("div", { class: "lbl" }, h("div", {}, h("b", { text: today.toLocaleString("en-IN") }), h("span", { text: `of ${g}` }))));
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5), v = tot[dayKey(d)] || 0;
    days.push(h("span", { class: "goal-day" + (v >= g ? " met" : v > 0 ? " part" : "") + (i === 0 ? " today" : ""),
      title: `${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}: ${v.toLocaleString("en-IN")} words${v >= g ? " · goal met" : ""}` }));
  }
  const headline = met ? (today >= g * 2 ? "Double your goal today" : "Goal met for today") : today ? `${(g - today).toLocaleString("en-IN")} words to go today` : `Write ${g} words today`;
  return h("section", { class: "sheet goal" }, ring,
    h("div", { class: "goal-main" },
      h("h3", { text: headline }),
      h("p", { class: "muted small", text: streak ? `${streak}-day streak${met ? "" : " · write today to keep it"}` : "Hit your goal on consecutive days to build a streak." }),
      h("div", { class: "goal-days", role: "img", "aria-label": `Last 14 days: goal met on ${Object.keys(tot).filter(k => tot[k] >= g && k >= dayKey(new Date(Date.now() - 13 * 864e5))).length} days` }, days),
      h("div", { class: "goal-set remind-row" }, h("label", { class: "remind" },
          h("input", { type: "checkbox", id: "remindon", checked: Goal.remindOn ? "checked" : null, onchange: async e => { Goal.remindOn = e.target.checked; await Goal.save(); render(); } }), "Remind me after"),
        h("input", { type: "time", id: "remindat", "aria-label": "Reminder time", value: Goal.remindAt, disabled: !Goal.remindOn,
          onchange: async e => { if (/^\d{2}:\d{2}$/.test(e.target.value)) { Goal.remindAt = e.target.value; await Goal.save(); toast("Reminder set for " + fmtClock(Goal.remindAt)); render(); } } })),
      h("div", { class: "goal-set" }, "Goal",
        h("button", { "aria-label": "Lower goal by 50 words", disabled: g <= 50, onclick: async () => { await Goal.set(g - 50); render(); } }, "−"),
        h("b", { text: `${g} words/day` }),
        h("button", { "aria-label": "Raise goal by 50 words", disabled: g >= 5000, onclick: async () => { await Goal.set(g + 50); render(); } }, "+"))));
}


// ---------- Evening reminder ----------
const fmtClock = hhmm => { const [H, M] = hhmm.split(":").map(Number); const d = new Date(); d.setHours(H, M, 0, 0); return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }); };
function nudgeDismissed() { try { return localStorage.getItem("pd.nudge") === dayKey(); } catch { return false; } }
function continueTarget() {
  const cands = stories.filter(s => s.outline && s.stats && (s.stats.written < s.stats.total || s.stats.open > 0));
  if (!cands.length) return null;
  const s = cands.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  return { s, part: Number.isInteger(s.lastPart) ? s.lastPart : null };
}
function nudgeCard() {
  if (!Goal.loaded || !Goal.remindOn || nudgeDismissed() || loading) return null;
  const [H, M] = Goal.remindAt.split(":").map(Number), now = new Date();
  if (now.getHours() * 60 + now.getMinutes() < H * 60 + M) return null;
  const today = dailyTotals()[dayKey()] || 0;
  if (today >= Goal.words) return null;
  const tgt = continueTarget();
  const short = Goal.words - today;
  return h("section", { class: "sheet nudge", role: "status" },
    h("div", { class: "nudge-text" },
      h("span", { class: "label", text: "It's after " + fmtClock(Goal.remindAt) }),
      h("h3", { text: today ? `${short.toLocaleString("en-IN")} more words to reach today's goal` : `Still time for today's ${Goal.words} words` }),
      tgt ? h("p", { class: "muted small", text: `Pick up “${tgt.s.outline.title}” where you left off: ${tgt.s.stats.written} of ${tgt.s.stats.total} parts written` + (tgt.s.stats.open ? `, ${tgt.s.stats.open} lines to revise.` : ".") }) : h("p", { class: "muted small", text: "Start a new story, or add a few lines anywhere." })),
    h("div", { class: "row" },
      tgt ? h("button", { class: "primary", onclick: () => continueWhereLeft(tgt) }, "Continue where I left off")
          : h("button", { class: "primary", onclick: () => { story = newStory(); parts = {}; render(); } }, "+ New story"),
      h("button", { class: "ghost", onclick: () => { try { localStorage.setItem("pd.nudge", dayKey()); } catch {} render(); } }, "Not today")));
}
async function continueWhereLeft(tgt) {
  await openStory(tgt.s);
  if (story.outline) {
    const n = story.outline.parts.length;
    let k = tgt.part != null && tgt.part < n ? tgt.part : firstUnwritten();
    // If the remembered part is already done and has nothing to revise, move to the first unwritten one.
    if (parts[k]?.text && !(parts[k].marks || []).some(m => !m.done) && !parts[k].truncated) k = firstUnwritten();
    story.stage = "draft"; curPart = k;
  }
  render(); window.scrollTo(0, 0);
}
