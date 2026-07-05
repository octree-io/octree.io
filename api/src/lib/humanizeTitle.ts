// Insert spaces at camelCase / PascalCase boundaries so a stored name like
// "DisgruntledTeammates" reads as "Disgruntled Teammates". Titles that already
// contain spaces are left effectively unchanged.
export function humanizeTitle(name: string): string {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // ACRONYMWord → ACRONYM Word
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase → camel Case
    .replace(/\s+/g, " ")
    .trim();
}
