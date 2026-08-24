// The email templates are imported as strings. A Worker has no filesystem, so
// `newsletter/*.html` is bundled in at build time by the `[[rules]] type =
// "Text"` entry in wrangler.toml; this declaration is what tells TypeScript the
// same thing.
declare module '*.html' {
  const content: string
  export default content
}
