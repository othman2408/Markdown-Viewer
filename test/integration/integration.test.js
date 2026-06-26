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
  const { closeDb, getDb } = require("../../server/db");

  test("auth, workspace, csrf, and sharing work against Postgres", async (t) => {
    await runMigrations();
    t.after(closeDb);

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

    const firstHistory = await agent.get(`/api/files/${tabId}/history`).expect(200);
    assert.equal(firstHistory.body.versions.length, 1);

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

    const repeatedHistory = await agent.get(`/api/files/${tabId}/history`).expect(200);
    assert.equal(repeatedHistory.body.versions.length, 1);

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
          title: "Cloud test updated",
          content: "# Cloud\n\nUpdated body",
          scrollPos: 7,
          viewMode: "preview",
          createdAt: Date.now()
        }]
      })
      .expect(200);

    const files = await agent.get("/api/files?query=updated%20body").expect(200);
    assert.equal(files.body.files.length >= 1, true);
    assert.equal(files.body.files[0].id, tabId);
    assert.equal(files.body.files[0].versionCount, 2);

    const fileDetail = await agent.get(`/api/files/${tabId}`).expect(200);
    assert.equal(fileDetail.body.title, "Cloud test updated");
    assert.equal(fileDetail.body.content, "# Cloud\n\nUpdated body");
    assert.equal(fileDetail.body.viewMode, "preview");

    await agent
      .put("/api/workspace")
      .set("x-csrf-token", csrf)
      .send({
        activeTabId: null,
        untitledCounter: 4,
        globalState: { theme: "dark" },
        findReplaceDocked: false,
        tabs: []
      })
      .expect(200);

    const closedWorkspace = await agent.get("/api/bootstrap").expect(200);
    assert.equal(closedWorkspace.body.tabs.length, 0);
    const closedButSaved = await agent.get("/api/files?query=updated%20body").expect(200);
    assert.equal(closedButSaved.body.files.some((file) => file.id === tabId), true);

    const updatedHistory = await agent.get(`/api/files/${tabId}/history`).expect(200);
    assert.equal(updatedHistory.body.versions.length, 2);
    assert.equal(updatedHistory.body.versions[0].title, "Cloud test updated");
    const originalVersionId = updatedHistory.body.versions[1].id;

    const originalVersionDetail = await agent
      .get(`/api/files/${tabId}/history/${originalVersionId}`)
      .expect(200);
    assert.equal(originalVersionDetail.body.title, "Cloud test");
    assert.equal(originalVersionDetail.body.content, "# Cloud\n\nSaved");
    assert.equal(Object.prototype.hasOwnProperty.call(updatedHistory.body.versions[1], "content"), false);

    const restored = await agent
      .post(`/api/files/${tabId}/restore`)
      .set("x-csrf-token", csrf)
      .send({ versionId: originalVersionId })
      .expect(200);
    assert.equal(restored.body.title, "Cloud test");
    assert.equal(restored.body.content, "# Cloud\n\nSaved");

    const restoredHistory = await agent.get(`/api/files/${tabId}/history`).expect(200);
    assert.equal(restoredHistory.body.versions.length, 3);
    assert.equal(restoredHistory.body.versions[0].source, "restore");

    const copied = await agent
      .post(`/api/files/${tabId}/copy-version`)
      .set("x-csrf-token", csrf)
      .send({ versionId: originalVersionId })
      .expect(200);
    assert.notEqual(copied.body.id, tabId);
    assert.equal(copied.body.title, "Cloud test (copy)");
    assert.equal(copied.body.content, "# Cloud\n\nSaved");

    const otherUserId = `other_${Date.now()}`;
    await getDb()`INSERT INTO users (id, email) VALUES (${otherUserId}, ${`${otherUserId}@example.com`})`;
    await getDb()`
      INSERT INTO documents (id, user_id, title, content)
      VALUES (${`foreign_${Date.now()}`}, ${otherUserId}, 'Foreign doc', 'private')
    `;
    const scopedFiles = await agent.get("/api/files?query=Foreign").expect(200);
    assert.equal(scopedFiles.body.files.length, 0);

    await agent.delete(`/api/files/${tabId}`).expect(403);
    await agent
      .delete(`/api/files/${tabId}`)
      .set("x-csrf-token", csrf)
      .expect(200);
    await agent.get(`/api/files/${tabId}`).expect(404);

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
    t.after(closeDb);

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
