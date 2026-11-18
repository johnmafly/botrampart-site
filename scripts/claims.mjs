// Reads claims.yaml. The file is kept in one strict shape (a list under `claims:`, each value a
// double-quoted string), so this reader needs no YAML library:
//
//   claims:
//     - id: "thales-automated"
//       claim: "..."
//       source_url: "https://..."
//       ...
import { readFileSync } from "node:fs";

export function readClaims(path) {
  const claims = [];
  let current = null;
  for (const [i, raw] of readFileSync(path, "utf8").split("\n").entries()) {
    const line = raw.replace(/\s+$/, "");
    if (!line || line.trimStart().startsWith("#") || line === "claims:") continue;
    const m = line.match(/^  (- |  )([a-z_]+): (".*")$/);
    if (!m) throw new Error(`claims.yaml line ${i + 1}: unexpected shape: ${line}`);
    if (m[1] === "- ") claims.push((current = {}));
    if (!current) throw new Error(`claims.yaml line ${i + 1}: field before first item`);
    current[m[2]] = JSON.parse(m[3]);
  }
  return claims;
}
