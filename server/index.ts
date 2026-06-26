import { createApp } from "./app";
import { loadAppEnv } from "./env";
import { runMigrations } from "./migrate";

loadAppEnv();

const port = Number(process.env.PORT || 8080);

async function main() {
  await runMigrations();
  const app = createApp();
  app.listen(port, () => {
    console.log(`Markdown Viewer listening on ${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
