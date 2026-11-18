import { Prose } from "./Typography.tsx";
import type { ProseProps } from "./Typography.tsx";
import metadata from "./Prose.meta.ts";

export const controls = metadata.props;
export default function ProseDemo(props: ProseProps) {
  return <Prose {...props}>
    <h2>Rotate an API key</h2>
    <p>Create the new key before revoking the old one so running jobs keep working. Keys are shown <strong>once</strong>; store them in your secret manager.</p>
    <ol><li>Open <a href="#settings">Settings → API keys</a>.</li><li>Choose <em>Rotate</em> and copy the new value.</li><li>Deploy, then revoke the old key.</li></ol>
    <blockquote>Revoked keys stop working within one minute.</blockquote>
    <pre><code>curl -H "Authorization: Bearer $SHEEN_KEY" https://api.example.test/v1/me</code></pre>
  </Prose>;
}
