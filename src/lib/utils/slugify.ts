const DIACRITICS_START = 0x0300;
const DIACRITICS_END = 0x036f;

function stripDiacritics(input: string): string {
  let result = "";
  for (const char of input) {
    const code = char.codePointAt(0) ?? 0;
    if (code < DIACRITICS_START || code > DIACRITICS_END) {
      result += char;
    }
  }
  return result;
}

export function slugify(input: string): string {
  return stripDiacritics(input.normalize("NFD"))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
