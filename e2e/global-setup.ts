import { startStack } from "./stack";

export default async function globalSetup() {
  const stack = await startStack();
  // Visible to the test workers, which start after global setup.
  process.env.E2E_SITE_URL = stack.siteUrl;
  process.env.E2E_API_URL = stack.apiUrl;
  process.env.E2E_DATABASE_URL = stack.databaseUrl;
  return async () => {
    await stack.stop();
  };
}
