import * as bcrypt from "bcryptjs";

async function main() {
  const passwordArg = process.argv.find((arg) => arg.startsWith("--password="));
  const password = passwordArg
    ? passwordArg.slice("--password=".length)
    : process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error("Provide --password=... or ADMIN_PASSWORD.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  process.stdout.write(`${hash}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
