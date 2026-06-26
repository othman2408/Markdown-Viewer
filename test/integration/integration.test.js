const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcryptjs");
const request = require("supertest");

const hasDatabase = Boolean(process.env.DATABASE_URL);

if (!hasDatabase) {
  test("integration tests skipped without DATABASE_URL", { skip: "DATABASE_URL not set" }, () => {});
} else {
  process.env.NODE_ENV = "test";
  process.env.ADMIN_EMAIL = `owner-${Date.now()}@example.com`;
  process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("correct horse battery staple", 8);
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-session-secret-with-enough-entropy";
  process.env.COOKIE_SECURE = "false";

  const { runMigrations } = require("../../server/migrate");
  const { createApp } = require("../../server/app");
  const { closePool } = require("../../server/db");

  test("auth, workspace, csrf, and sharing work against Postgres", async (t) => {
    await runMigrations();
    t.after(closePool);

    const app = createApp();
    const agent = request.agent(app);

    const health = await request(app).get("/healthz").expect(200);
    assert.match(
      health.headers["content-security-policy"],
      /connect-src[^;]*https:\/\/cdnjs\.cloudflare\.com/
    );
    assert.match(
      health.headers["content-security-policy"],
      /connect-src[^;]*https:\/\/paulrosen\.github\.io/
    );
    assert.match(
      health.headers["content-security-policy"],
      /media-src[^;]*https:\/\/paulrosen\.github\.io/
    );

    const redirected = await agent.get("/").expect(302);
    assert.match(redirected.headers.location, /^\/login/);

    await agent
      .post("/api/login")
      .send({ email: process.env.ADMIN_EMAIL, password: "wrong" })
      .expect(401);

    const login = await agent
      .post("/api/login")
      .send({ email: process.env.ADMIN_EMAIL, password: "correct horse battery staple" })
      .expect(200);
    assert.equal(login.body.ok, true);
    assert.ok(login.body.csrfToken);

    const bootstrap = await agent.get("/api/bootstrap").expect(200);
    const csrf = bootstrap.body.csrfToken;
    assert.ok(csrf);

    await agent
      .put("/api/workspace")
      .send({ tabs: [] })
      .expect(403);

    const tabId = `tab_test_${Date.now()}`;
    await agent
      .put("/api/workspace")
      .set("x-csrf-token", csrf)
      .send({
        activeTabId: tabId,
        untitledCounter: 4,
        globalState: { theme: "dark" },
        findReplaceDocked: false,
        tabs: [{
          id: tabId,
          title: "Cloud test",
          content: "# Cloud\n\nSaved",
          scrollPos: 5,
          viewMode: "split",
          createdAt: Date.now()
        }]
      })
      .expect(200);

    const saved = await agent.get("/api/bootstrap").expect(200);
    assert.equal(saved.body.tabs.length, 1);
    assert.equal(saved.body.tabs[0].id, tabId);
    assert.equal(saved.body.tabs[0].content, "# Cloud\n\nSaved");
    assert.equal(Object.prototype.hasOwnProperty.call(saved.body, ["app", "Lang"].join("")), false);

    const share = await agent
      .post("/api/shares")
      .set("x-csrf-token", csrf)
      .send({ title: "Cloud test", mode: "view", content: "# Shared" })
      .expect(200);
    assert.ok(share.body.token);
    assert.match(share.body.url, /\/share\//);

    const publicShare = await request(app)
      .get(`/api/shares/${share.body.token}`)
      .expect(200);
    assert.equal(publicShare.body.content, "# Shared");
    assert.equal(publicShare.body.mode, "view");

    await agent
      .post("/api/logout")
      .set("x-csrf-token", csrf)
      .expect(200);

    await agent.get("/api/bootstrap").expect(401);
  });

  test("R2-backed image upload works when R2 env is configured", async (t) => {
    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET) {
      t.skip("R2 env not set");
      return;
    }

    await runMigrations();
    t.after(closePool);

    const app = createApp();
    const agent = request.agent(app);
    const login = await agent
      .post("/api/login")
      .send({ email: process.env.ADMIN_EMAIL, password: "correct horse battery staple" })
      .expect(200);

    const csrf = login.body.csrfToken;
    const pixelPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64"
    );

    const upload = await agent
      .post("/api/assets")
      .set("x-csrf-token", csrf)
      .attach("file", pixelPng, { filename: "pixel.png", contentType: "image/png" })
      .expect(200);

    assert.ok(upload.body.id);
    assert.match(upload.body.url, /^\/api\/assets\//);

    const image = await agent.get(upload.body.url).expect(200);
    assert.match(image.headers["content-type"], /^image\/png/);
  });
}
