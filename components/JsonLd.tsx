// Renders a JSON-LD <script> block. Server component — schema ships in the
// static HTML, which is what both Google's rich-results parser and LLM
// crawlers read.
//
// The escaping below matters: JSON.stringify does not escape "<", so a prompt
// or title containing "</script>" would terminate the script element early and
// inject raw markup into the page. Prompt text is authored in-repo today, but
// this is one line of defence against a future CMS/user-contributed source.
function safeJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJson(data) }}
    />
  );
}
