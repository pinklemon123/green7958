import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectMongo } from "./db.js";
import SiteState from "./models/SiteState.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = process.argv[2] || path.join(__dirname, "db.json");

async function run() {
  if (!fs.existsSync(source)) {
    throw new Error(`Cannot find source db file: ${source}`);
  }

  const data = JSON.parse(fs.readFileSync(source, "utf8"));
  await connectMongo();
  await SiteState.findOneAndUpdate(
    { key: "main" },
    { key: "main", data },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`Imported ${source} into MongoDB SiteState/main`);
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
