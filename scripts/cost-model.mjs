// Writes the cost_model: block at the end of greenhouse.yaml from costs/model.mjs.
// `node scripts/cost-model.mjs --check` exits 1 when greenhouse.yaml is out of date instead.
import { readFileSync, writeFileSync } from "node:fs";
import { costModelYaml } from "../costs/model.mjs";

export const MARKER = "# Cost model (pricing gate)";
const file = new URL("../greenhouse.yaml", import.meta.url);

export function withCostModel(text) {
  const i = text.indexOf(MARKER);
  const head = (i < 0 ? text : text.slice(0, i)).replace(/\n*$/, "\n\n");
  return head + costModelYaml();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const text = readFileSync(file, "utf8");
  const next = withCostModel(text);
  if (process.argv.includes("--check")) {
    if (next !== text) {
      console.error("greenhouse.yaml cost_model is out of date: run npm run cost-model");
      process.exit(1);
    }
    console.log("greenhouse.yaml cost_model is current");
  } else {
    writeFileSync(file, next);
    console.log("wrote cost_model to greenhouse.yaml");
  }
}
