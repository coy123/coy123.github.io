/**
 * Serialises a JSON-LD schema for a `<script type="application/ld+json">`.
 *
 * `JSON.stringify` escapes quotes and backslashes but leaves `<` alone, and an
 * HTML parser does not know it is looking at JSON — it scans for the literal
 * `</script` and ends the block there. So a single `</script>` anywhere in
 * `data/data.json`, `data/faq.json` or `locales/it.json` would close the tag
 * early and turn everything after it into live markup.
 *
 * This is not a live bug and is not expected to become one. Every row in
 * `data/data.json` is entered by hand — the crawler only produces candidates
 * for a person to check — so nothing here arrives unreviewed, and no such
 * string exists in any data file today.
 *
 * It is kept because it costs one `replace` at the single point where every
 * schema is serialised, and because the alternative is relying on every future
 * curator noticing that a comune name containing `</script>` would end the tag.
 * A guard that holds by construction beats one that holds by attention.
 *
 * `<` is a plain JSON string escape, so the output still parses to the
 * identical object — search engines see no difference.
 */
export const jsonLd = (schema: unknown): string =>
  JSON.stringify(schema).replace(/</g, '\\u003c')
