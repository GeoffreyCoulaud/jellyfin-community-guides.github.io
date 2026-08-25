import {
	defineRouteMiddleware,
	type StarlightRouteData,
} from "@astrojs/starlight/route-data";
import { iconForPage } from "./guides";
import { iconUrl } from "./icons/emblems";

type Entry = StarlightRouteData["sidebar"][number];

/**
 * The icon rides on the link as a custom property the stylesheet draws, rather
 * than as markup: the sidebar stays Starlight's to render, and nothing here has
 * to know how it does it. No pips either, there being nothing to tell apart in
 * a list that spells every option out.
 */
const decorate = (entries: Entry[], sort: boolean) => {
	if (sort) entries.sort((a, b) => a.label.localeCompare(b.label));
	for (const entry of entries) {
		if (entry.type === "group") {
			decorate(entry.entries, true);
			continue;
		}
		const icon = iconForPage(entry.href);
		if (icon === undefined) continue;
		entry.attrs["data-emblem"] = "";
		entry.attrs.style = `--sidebar-icon: url("${iconUrl(icon)}")`;
	}
};

/** The top level keeps the order the config lists it in, only its groups sort. */
export const onRequest = defineRouteMiddleware((context) => {
	decorate(context.locals.starlightRoute.sidebar, false);
});
