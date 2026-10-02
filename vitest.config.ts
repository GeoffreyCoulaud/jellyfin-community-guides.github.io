/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Same aliases and settings as the site
export default getViteConfig({
	test: {
		include: ["test/**/*.test.ts"],
		environment: "node",
	},
});
