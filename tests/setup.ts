import { existsSync } from "node:fs";
import path from "node:path";

// Loads .env for local test runs so integration tests (and any code that
// touches @shared/config) have DATABASE_URL/S3_*/etc. available, matching
// what CI provides directly via job `env:`. Node's built-in loader is used
// instead of a `dotenv` dependency — no need for a third-party package for
// something this small.
const envPath = path.resolve(__dirname, "../.env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
