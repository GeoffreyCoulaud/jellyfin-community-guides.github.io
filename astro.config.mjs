// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
    integrations: [starlight({
        title: "(WIP!) Jellyfin Community Guides",
        social: [
            {
                icon: "github",
                label: "GitHub",
                href: "https://github.com/jellyfin-community-guides/jellyfin-community-guides.github.io",
            },
        ],
        sidebar: [
            {
                label: "Quiz",
                items: [{ autogenerate: { directory: "quiz" } }],
            },
            {
                label: "Guides",
                items: [
                    // Each item here is one entry in the navigation menu.
                    { autogenerate: { directory: "guides" } },
                ],
            },
            {
                label: "Reference",
                items: [{ autogenerate: { directory: "reference" } }],
            },
        ],
		}), mermaid(), react()],
});