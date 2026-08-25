/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// getViteConfig: the tests read the same aliases and settings as the site does
export default getViteConfig({
	test: {
		// One folder per kind of test, integration and end to end to come
		include: ["test/**/*.test.ts"],
		environment: "node",
	},
});
