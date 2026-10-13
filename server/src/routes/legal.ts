import type { FastifyInstance } from "fastify";

function htmlPage(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · Unearth</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.55;
      color: #15201b;
      background: #f6f7f5;
    }
    main {
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 20px 64px;
    }
    h1 { font-size: 1.75rem; margin: 0 0 8px; }
    h2 { font-size: 1.15rem; margin: 28px 0 10px; }
    p, li { color: #3e4a44; }
    .meta { color: #56635c; margin-bottom: 28px; }
    a { color: #1f6b4f; }
    ul { padding-left: 1.2rem; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    ${bodyHtml}
  </main>
</body>
</html>`;
}

const privacyBody = `
<p class="meta">Last updated: 13 October 2026</p>
<p>Unearth (“we”, “the app”) helps people share little-known public places on a map. This policy explains what we collect and why.</p>
<h2>What we collect</h2>
<ul>
  <li><strong>Account:</strong> Sign in with Apple identity (Apple user id), optional email/name Apple provides, and the handle you choose.</li>
  <li><strong>Location (when you allow it):</strong> Your device location while you use Dig, so nearby gems and distances can be shown. We request When In Use access only — we do not track you in the background.</li>
  <li><strong>Content you post:</strong> Gem names, categories, map pins, descriptions, liked/didn’t-like notes, tags, optional Google Maps links, and stash saves.</li>
  <li><strong>Reports:</strong> If you report a gem or find, we store the report reason and related ids so we can review it.</li>
  <li><strong>Technical:</strong> Authentication tokens needed to keep you signed in.</li>
</ul>
<h2>How we use it</h2>
<ul>
  <li>To run Dig, Unearth, Stash, Activity, and Profile.</li>
  <li>To show your finds and Prospectors level to you (and public handle/finds where the product exposes them).</li>
  <li>To enforce posting guidelines and handle abuse reports.</li>
  <li>To revoke Sign in with Apple access if you delete your account.</li>
</ul>
<h2>Sharing</h2>
<p>We do not sell your personal data. Content you Unearth is shared with other Unearth users as part of the product. We use infrastructure providers (e.g. hosting and database) solely to operate the service.</p>
<h2>Retention &amp; deletion</h2>
<p>You can delete your account in Profile → Delete account. That removes your user record and associated content we store, and revokes Apple token access where possible.</p>
<h2>Contact</h2>
<p>Questions about privacy: contact the developer listed on the App Store listing, or open an issue on <a href="https://github.com/RyanBantu/unearth">github.com/RyanBantu/unearth</a>.</p>
`;

const guidelinesBody = `
<p class="meta"><strong>Public places only.</strong></p>
<p>Unearth is for little-known spots other people can actually visit. Keep finds helpful, respectful, and real.</p>
<h2>Allowed</h2>
<ul>
  <li>Public parks, trails, viewpoints, cafés, shops, street-food spots, and similar places open to the public</li>
  <li>Honest notes about what you liked or didn’t like</li>
  <li>Clear pins so someone else can find the place</li>
</ul>
<h2>Not allowed</h2>
<ul>
  <li><strong>Private property</strong> — homes, apartments, private gardens, gated communities, or anywhere guests are not welcome</li>
  <li>Unsafe or restricted sites (active construction, trespassing, dangerous cliffs without public access)</li>
  <li>Spam, scams, harassment, or misleading locations</li>
  <li>Personal data about other people</li>
  <li>Illegal activity</li>
</ul>
<p>Use <strong>Report</strong> on a gem or find if something breaks these guidelines.</p>
<p><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Use</a></p>
`;

const termsBody = `
<p class="meta">Last updated: 13 October 2026</p>
<p>By using Unearth you agree to these Terms of Use.</p>
<h2>Community rules</h2>
<ul>
  <li><strong>Public places only</strong> — no private homes, apartments, or places guests are not welcome.</li>
  <li><strong>No abusive, hateful or sexual content</strong>, spam, scams, or illegal activity.</li>
  <li>Be honest about locations so other people can actually visit them.</li>
</ul>
<h2>Moderation</h2>
<p>We review reports and remove content that breaks these rules, typically within <strong>24 hours</strong>. We may ban accounts that repeatedly violate the Terms. You can report gems or finds in the app, and block other users so you no longer see their content.</p>
<h2>Your content</h2>
<p>You keep ownership of what you post. You grant Unearth a license to show it to other users as part of the service. You can delete your finds or account at any time.</p>
<h2>Contact</h2>
<p>Questions: contact the developer on the App Store listing, or open an issue on <a href="https://github.com/RyanBantu/unearth">github.com/RyanBantu/unearth</a>.</p>
<p><a href="/privacy">Privacy Policy</a> · <a href="/guidelines">Posting Guidelines</a></p>
`;

export async function legalRoutes(app: FastifyInstance): Promise<void> {
  app.get("/privacy", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(htmlPage("Privacy Policy", privacyBody));
  });

  app.get("/guidelines", async (_request, reply) => {
    return reply
      .type("text/html; charset=utf-8")
      .send(htmlPage("Posting Guidelines", guidelinesBody));
  });

  app.get("/terms", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(htmlPage("Terms of Use", termsBody));
  });
}
