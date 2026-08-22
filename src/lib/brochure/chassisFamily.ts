/**
 * Derives a short product-family label from the chassis value for the
 * brochure card header, e.g. "AFTERSHOCK Zeal-M RGB Black Chassis" ->
 * "ZEAL-M RGB". Falls back to the section name.
 */
const COLOR_WORDS = new Set([
  "black",
  "white",
  "grey",
  "gray",
  "silver",
  "red",
  "blue",
  "green",
  "gold",
  "matt",
  "matte",
  "midnight",
]);

export function chassisFamilyLabel(chassis: string | undefined): string {
  if (!chassis) return "";
  let tokens = chassis.trim().split(/\s+/);
  if (tokens.length > 1 && /^aftershock$/i.test(tokens[0])) {
    tokens = tokens.slice(1);
  }
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1].replace(/[^a-z0-9-]/gi, "");
    if (/^chassis(es)?$/i.test(last) || COLOR_WORDS.has(last.toLowerCase())) {
      tokens = tokens.slice(0, -1);
      continue;
    }
    break;
  }
  return tokens.join(" ").trim();
}
