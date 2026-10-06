// sessionStorage can hold anything (another script, an older app version), so
// the back link only follows values that point at the home page. This also
// rejects "//other-site" and "https://…" values.
export function isHomeUrl(value: string | null): value is string {
  return value === "/" || Boolean(value?.startsWith("/?"));
}
