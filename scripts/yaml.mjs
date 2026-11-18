// A small YAML reader for spec/openapi.yaml, so the build keeps no dependencies. It covers the
// subset the spec uses: block mappings and sequences (including "- key: value" items), flow
// collections on one line, plain, single- and double-quoted scalars (multi-line plain scalars
// fold), block scalars (| and >, with - / + chomping), comments, and anchors with aliases.
// test/docs.test.mjs checks it reads the spec to the same value as the reference `yaml` package
// when that package is installed nearby, and the build fails loudly on anything it does not know.

export function parseYaml(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const anchors = new Map();
  let i = 0;

  const indentOf = (l) => l.match(/^ */)[0].length;
  const isBlank = (l) => /^\s*(#.*)?$/.test(l);
  const fail = (msg) => { throw new Error(`yaml line ${i + 1}: ${msg}`); };
  const skipBlank = () => { while (i < lines.length && isBlank(lines[i])) i++; };

  // Strip a trailing comment outside quotes.
  function stripComment(s) {
    let q = null;
    for (let k = 0; k < s.length; k++) {
      const ch = s[k];
      if (q) {
        if (q === '"' && ch === "\\") { k++; continue; }
        if (ch === q) q = null;
      } else if (ch === '"' || ch === "'") {
        if (k === 0 || /[\s[{,:]/.test(s[k - 1])) q = ch;
      } else if (ch === "#" && (k === 0 || /\s/.test(s[k - 1]))) return s.slice(0, k).trimEnd();
    }
    return s.trimEnd();
  }

  function plainScalar(s) {
    s = s.trim();
    if (s === "" || s === "~" || s === "null" || s === "Null" || s === "NULL") return null;
    if (/^(true|True|TRUE)$/.test(s)) return true;
    if (/^(false|False|FALSE)$/.test(s)) return false;
    if (/^[-+]?(0|[1-9][0-9_]*)$/.test(s)) return Number(s.replace(/_/g, ""));
    if (/^0x[0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);
    if (/^[-+]?(\d[\d_]*)?\.\d+([eE][-+]?\d+)?$|^[-+]?\d[\d_]*(\.\d*)?[eE][-+]?\d+$|^[-+]?\d[\d_]*\.$/.test(s)) return Number(s.replace(/_/g, ""));
    if (/^[-+]?\.(inf|Inf|INF)$/.test(s)) return s.startsWith("-") ? -Infinity : Infinity;
    if (/^\.(nan|NaN|NAN)$/.test(s)) return NaN;
    return s;
  }

  function doubleQuoted(s) {
    return s.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/g, (_, e) => {
      const map = { n: "\n", t: "\t", r: "\r", "0": "\0", '"': '"', "\\": "\\", "/": "/", " ": " ", b: "\b", f: "\f", e: "\x1b", N: "\u0085", _: "\u00a0" };
      if (e.length > 1) return String.fromCodePoint(parseInt(e.slice(1), 16));
      if (e in map) return map[e];
      fail(`unknown escape \\${e}`);
    });
  }

  // Flow collections and quoted scalars on one line: a tiny recursive-descent parser.
  function flow(src) {
    let p = 0;
    const ws = () => { while (p < src.length && /\s/.test(src[p])) p++; };
    function value(stop) {
      ws();
      const ch = src[p];
      if (ch === "[") {
        p++; const arr = [];
        for (;;) {
          ws();
          if (src[p] === "]") { p++; return arr; }
          arr.push(value(",]"));
          ws();
          if (src[p] === ",") { p++; continue; }
          if (src[p] === "]") { p++; return arr; }
          fail(`bad flow sequence: ${src}`);
        }
      }
      if (ch === "{") {
        p++; const obj = {};
        for (;;) {
          ws();
          if (src[p] === "}") { p++; return obj; }
          const k = value(":,}");
          ws();
          let v = null;
          if (src[p] === ":") { p++; v = value(",}"); ws(); }
          obj[String(k)] = v;
          if (src[p] === ",") { p++; continue; }
          if (src[p] === "}") { p++; return obj; }
          fail(`bad flow mapping: ${src}`);
        }
      }
      if (ch === '"') {
        let k = p + 1, out = "";
        for (; k < src.length && src[k] !== '"'; k++) { if (src[k] === "\\") { out += src[k] + src[k + 1]; k++; } else out += src[k]; }
        if (src[k] !== '"') fail(`unterminated string: ${src}`);
        p = k + 1;
        return doubleQuoted(out);
      }
      if (ch === "'") {
        let k = p + 1, out = "";
        for (; k < src.length; k++) {
          if (src[k] === "'") { if (src[k + 1] === "'") { out += "'"; k++; continue; } break; }
          out += src[k];
        }
        if (src[k] !== "'") fail(`unterminated string: ${src}`);
        p = k + 1;
        return out;
      }
      if (ch === "*") {
        const m = src.slice(p).match(/^\*([^\s,\]}]+)/);
        p += m[0].length;
        if (!anchors.has(m[1])) fail(`unknown alias *${m[1]}`);
        return anchors.get(m[1]);
      }
      // Plain scalar inside flow: up to a stop character (": " counts as a stop for keys).
      let k = p;
      while (k < src.length) {
        const c = src[k];
        if (stop.includes(c) && (c !== ":" || k + 1 >= src.length || /[\s,\]}]/.test(src[k + 1]))) break;
        k++;
      }
      const raw = src.slice(p, k);
      p = k;
      return plainScalar(raw);
    }
    const v = value("");
    ws();
    if (p !== src.length) fail(`trailing characters after value: ${src}`);
    return v;
  }

  // Block scalar (| or >) whose header has been read; lines follow, more indented than `parent`.
  function blockScalar(header, parent) {
    const m = header.match(/^([|>])([-+]?)(\d?)([-+]?)$/);
    if (!m) fail(`bad block scalar header ${header}`);
    const folded = m[1] === ">";
    const chomp = m[2] || m[4];
    const body = [];
    let indent = m[3] ? parent + Number(m[3]) : null;
    while (i < lines.length) {
      const l = lines[i];
      if (/^\s*$/.test(l)) { body.push(""); i++; continue; }
      const ind = indentOf(l);
      if (indent === null) { if (ind <= parent) break; indent = ind; }
      if (ind < indent) break;
      body.push(l.slice(indent));
      i++;
    }
    // Trailing blank lines belong to chomping.
    let trail = 0;
    while (body.length && body[body.length - 1] === "") { body.pop(); trail++; }
    let out;
    if (!folded) out = body.join("\n");
    else {
      out = "";
      for (let k = 0; k < body.length; k++) {
        const cur = body[k];
        if (k === 0) { out = cur; continue; }
        const prev = body[k - 1];
        const moreIndented = (s) => /^\s/.test(s);
        if (cur === "") { out += "\n"; continue; }
        if (prev === "" ) { out += (moreIndented(cur) ? "" : ""); out += cur; continue; }
        if (moreIndented(cur) || moreIndented(prev)) out += "\n" + cur;
        else out += " " + cur;
      }
      // A run of n blank lines between text lines folds to n newlines (handled above as "\n" each,
      // and the line break before them is dropped); fix: blank runs above already add one "\n" per blank.
    }
    if (chomp === "+") return out + "\n".repeat(trail + 1);
    if (chomp === "-" || body.length === 0) return out;
    return out + "\n";
  }

  // Read a scalar that starts on this line (after "key:" or "- ") and may continue on following
  // lines indented more than `parent`.
  function inlineValue(rest, parent) {
    let anchor = null;
    const am = rest.match(/^&(\S+)\s*(.*)$/);
    if (am) { anchor = am[1]; rest = am[2]; }
    let v;
    if (rest === "") {
      skipBlank();
      if (i < lines.length && indentOf(lines[i]) > parent) v = node(indentOf(lines[i]));
      else if (i < lines.length && indentOf(lines[i]) === parent && /^ *- /.test(lines[i]) ) v = node(parent);
      else v = null;
    } else if (/^[|>]/.test(rest)) {
      v = blockScalar(rest, parent);
    } else if (rest.startsWith("*")) {
      const name = rest.slice(1).trim();
      if (!anchors.has(name)) fail(`unknown alias *${name}`);
      v = anchors.get(name);
    } else if (/^["'[{]/.test(rest)) {
      // Quoted scalars may continue on following lines.
      let src = rest;
      const balanced = (s) => {
        try { flow(s); return true; } catch { return false; }
      };
      while (!balanced(src) && i < lines.length && indentOf(lines[i]) > parent) src += " " + stripComment(lines[i++]).trim();
      v = flow(src);
    } else {
      const parts = [rest.trim()];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && indentOf(lines[i]) > parent && !/^\s*#/.test(lines[i])) {
        parts.push(stripComment(lines[i]).trim());
        i++;
      }
      v = parts.length > 1 ? parts.join(" ") : plainScalar(parts[0]);
    }
    if (anchor) anchors.set(anchor, v);
    return v;
  }

  const KEY = /^((?:"(?:[^"\\]|\\.)*")|(?:'(?:[^']|'')*')|(?:[^\s"'#\-?:,[\]{}][^#]*?|-[^\s#][^#]*?))\s*:(?:\s+|$)(.*)$/;
  const unquoteKey = (k) => k.startsWith('"') ? doubleQuoted(k.slice(1, -1)) : k.startsWith("'") ? k.slice(1, -1).replace(/''/g, "'") : k;

  function node(indent) {
    skipBlank();
    const l = lines[i];
    if (/^ *- |^ *-$/.test(l)) return sequence(indent);
    return mapping(indent);
  }

  function sequence(indent) {
    const arr = [];
    for (;;) {
      skipBlank();
      if (i >= lines.length) break;
      const l = lines[i];
      const ind = indentOf(l);
      if (ind < indent) break;
      if (ind > indent) fail("unexpected indent in sequence");
      const m = l.match(/^ *-(?: (.*))?$/);
      if (!m) break;
      const rest = stripComment(m[1] ?? "").trim();
      i++;
      if (rest === "") { arr.push(inlineValue("", indent)); continue; }
      // "- key: value" starts a mapping whose keys sit at indent + 2.
      if (KEY.test(rest) && !/^["'[{]/.test(rest.replace(/^&\S+\s*/, "")) || (KEY.test(rest) && /^["']/.test(rest) && /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*')\s*:/.test(rest))) {
        i--;
        lines[i] = " ".repeat(indent + 2) + rest;
        arr.push(mapping(indent + 2));
        continue;
      }
      arr.push(inlineValue(rest, indent));
    }
    return arr;
  }

  function mapping(indent) {
    const obj = {};
    for (;;) {
      skipBlank();
      if (i >= lines.length) break;
      const l = lines[i];
      const ind = indentOf(l);
      if (ind < indent) break;
      if (ind > indent) fail(`unexpected indent (${ind} > ${indent})`);
      if (/^ *- /.test(l)) break;
      const body = stripComment(l.slice(ind));
      const m = body.match(KEY);
      if (!m) fail(`expected "key: value", got: ${body}`);
      const key = unquoteKey(m[1].trim());
      i++;
      if (Object.prototype.hasOwnProperty.call(obj, key)) fail(`duplicate key ${key}`);
      obj[key] = inlineValue(m[2].trim(), indent);
    }
    return obj;
  }

  skipBlank();
  if (i < lines.length && /^---\s*$/.test(lines[i])) { i++; skipBlank(); }
  const doc = node(indentOf(lines[i] ?? ""));
  skipBlank();
  if (i < lines.length) fail(`unparsed content: ${lines[i]}`);
  return doc;
}
