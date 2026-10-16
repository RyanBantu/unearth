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
<p class="meta">Last updated: 15 October 2026</p>
<p>Unearth (“we”) helps people share little-known public places on a map. This policy covers the Unearth iOS app, Android app, and website.</p>
<p>The short version: we collect only what Unearth needs to work. We don’t sell your data, we don’t show ads, and we don’t track you across other apps or websites.</p>
<h2>What we collect</h2>
<ul>
  <li><strong>Account (iPhone):</strong> Sign in with Apple identifier, and optional name/email Apple provides. Hide My Email gives us an Apple relay address.</li>
  <li><strong>Account (Android):</strong> Google sign-in identifier, verified email, and the name on your Google account.</li>
  <li><strong>Account linking:</strong> if you use Apple on iPhone and Google on Android with the same verified email, we link those sign-ins to one Unearth account. We do not auto-link Apple Hide My Email addresses.</li>
  <li><strong>Handle:</strong> the username you choose, and the date you agreed to the Terms of Use.</li>
  <li><strong>Location (when you allow it):</strong> your device location while you use the app, so nearby gems and distances can be shown. We request When In Use / while-using access only — we do not track you in the background. We don’t store location history; the only locations we keep are gems you post.</li>
  <li><strong>Maps:</strong> iPhone uses Apple Maps; Android uses Google Maps and Places, which may process map use and approximate location under Google’s policies.</li>
  <li><strong>Content you post:</strong> gem names, categories, map pins, descriptions, liked/didn’t-like notes, tags, optional Google Maps links, stash saves, votes, reports, and blocks.</li>
  <li><strong>Technical:</strong> authentication tokens on the device, and short-lived server logs (IP, device/app version, errors).</li>
</ul>
<p>We don’t collect photos, contacts, payment information, or advertising identifiers.</p>
<h2>How we use it</h2>
<ul>
  <li>To run Dig, Unearth, Stash, Activity, and Profile.</li>
  <li>To show your finds and Prospectors level (and public handle/finds where the product exposes them).</li>
  <li>To detect duplicate places and keep Unearth safe (reports, Terms, spam).</li>
  <li>To revoke Apple or Google sign-in access if you delete your account, where possible.</li>
</ul>
<h2>Sharing</h2>
<p>We do not sell your personal data. Your handle and posted gems/finds are public to other Unearth users (Stash, reports, and blocks are private). We use providers solely to operate the service: Apple (Sign in with Apple, Maps), Google (sign-in, Maps, Places), Render (API hosting), Neon (database), and Vercel (website). Providers may store data outside India, including in Singapore.</p>
<h2>Retention &amp; deletion</h2>
<p>You can delete your account in Profile → Settings → Delete account, or request deletion at <a href="https://unearth.vercel.app/delete-account">unearth.vercel.app/delete-account</a>. That removes your user record and associated content we store, and revokes Apple or Google token access where possible. Gems that other people also found remain, without your write-up.</p>
<h2>Contact</h2>
<p>Questions: <a href="mailto:bantu.ryan@gmail.com">bantu.ryan@gmail.com</a>, the developer listed on the App Store or Play Store listing, or an issue on <a href="https://github.com/RyanBantu/unearth">github.com/RyanBantu/unearth</a>.</p>
<p>This policy is also at <a href="https://unearth.vercel.app/privacy">unearth.vercel.app/privacy</a>.</p>
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

const deleteAccountBody = `
<p class="meta">For the Unearth app on Google Play, the App Store, and the website.</p>
<p>You can delete your Unearth account and the data we store with it. Deletion is permanent.</p>
<h2>Delete in the app</h2>
<ol>
  <li>Open Unearth and sign in.</li>
  <li>Go to <strong>Profile → Settings → Delete account</strong>.</li>
  <li>Confirm. This cannot be undone.</li>
</ol>
<h2>Request deletion by email</h2>
<p>If you uninstalled the app or cannot sign in, email <a href="mailto:bantu.ryan@gmail.com?subject=Delete%20my%20Unearth%20account">bantu.ryan@gmail.com</a> from the address on your account (Google or Apple). Include your Unearth handle if you remember it.</p>
<p>We delete the account after we can match the request to you, and aim to complete this within 30 days.</p>
<h2>What we delete</h2>
<ul>
  <li>Your account, handle, and sign-in identifiers (Apple and/or Google)</li>
  <li>Your finds, stash, votes, reports, blocks, and session tokens</li>
  <li>Gems that nobody else found</li>
</ul>
<p>We also revoke Unearth’s access to your Apple ID or Google account where possible.</p>
<h2>What may remain</h2>
<ul>
  <li>Gems that other people also found stay on the map, without your write-up</li>
  <li>Backups are cleared within 30 days</li>
  <li>A limited record if the account was banned for abuse, or if the law requires it</li>
</ul>
<p><a href="/privacy">Privacy Policy</a> · <a href="https://unearth.vercel.app/delete-account">unearth.vercel.app/delete-account</a></p>
`;

export async function legalRoutes(app: FastifyInstance): Promise<void> {
  app.get("/privacy", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(htmlPage("Privacy Policy", privacyBody));
  });

  app.get("/delete-account", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(htmlPage("Delete your account", deleteAccountBody));
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
