/**
 * Serialises a JSON-LD schema for a `<script type="application/ld+json">`.
 *
 * `JSON.stringify` escapes quotes and backslashes but leaves `<` alone, and an
 * HTML parser does not know it is looking at JSON — it scans for the literal
 * `</script` and ends the block there. So a single `</script>` anywhere in
 * `data/data.json`, `data/faq.json` or `locales/it.json` would close the tag
 * early and turn everything after it into live markup.
 *
 * No such string exists today and the data is curator-reviewed, but
 * `data/data.json` is fed from a crawler, which is the one path by which an
 * untrusted comune name or bid title can arrive. Escaping `<` at the point of
 * serialisation is the fix that does not depend on anybody remembering.
 *
 * `<` is a plain JSON string escape, so the output still parses to the
 * identical object — search engines see no difference.
 */
export const jsonLd = (schema: unknown): string =>
  JSON.stringify(schema).replace(/</g, '\\u003c')
