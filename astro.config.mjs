// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: "(WIP!) Jellyfin Community Guides",
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/jellyfin-community-guides/jellyfin-community-guides.github.io",
				},
			],
			sidebar: [
				"get-started",
				{
					label: "Quiz",
					items: [{ autogenerate: { directory: "quiz" } }],
				},
				{
					label: "Remote access",
					items: [
						{ autogenerate: { directory: "guides/remote-access" } },
					],
				},
				{
					label: "Reverse proxy",
					items: [
						{ autogenerate: { directory: "guides/reverse-proxy" } },
					],
				},
				{
					label: "Reference",
					items: [{ autogenerate: { directory: "reference" } }],
				},
			],
			// Sorts each group and hands its links the icon of what they document
			routeMiddleware: "./src/starlightRouteData.ts",
			customCss: ["./src/styles/sidebar.css"],
		}),
		mermaid(),
		react(),
	],
});
