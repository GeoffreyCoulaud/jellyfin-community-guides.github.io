/**
 * The icon vocabulary, and where the files for it are. Which option wears what
 * lives in `guides.ts`, next to the page it points at.
 *
 * An icon names the tool, not the option: the plans of one tool, and the places
 * one tool can run, all share it. What tells them apart rides along as pips, so
 * the icon stays the thing people recognise and the pips carry the difference.
 * Only that difference: a pip nobody needs to read is noise on a 20px square.
 *
 * Tools only. A page about getting a domain or restricting what your users
 * reach documents a task, not a product: there is no logo anyone would place,
 * and a drawing invented for it would say less than its title already does.
 */

export type IconName =
	| "caddy"
	| "cloudflare"
	| "diy"
	| "headscale"
	| "netbird"
	| "nginx"
	| "npm"
	| "pangolin"
	| "swag"
	| "tailscale"
	| "traefik"
	| "wg-easy"
	| "wireguard"
	| "zerotier"
	| "zoraxy";

export type PipName =
	"cloud" | "docker" | "home" | "key" | "labels" | "paid" | "public" | "vps";

export type Emblem = { icon: IconName; pips?: readonly PipName[] };

/** Read as a sentence after the option's own name, which is always next to it. */
const pipLabels: Record<PipName, string> = {
	cloud: "hosted for you",
	docker: "runs as a container",
	home: "runs at home",
	key: "needs a licence key",
	labels: "routed by container labels",
	paid: "costs money every month",
	public: "published on a public address",
	vps: "runs on a server you rent",
};

/** Whatever a project publishes its mark as: not every one of them draws one. */
const logoFiles = import.meta.glob<string>("./logos/*.{svg,png}", {
	eager: true,
	query: "?url",
	import: "default",
});

/** Drawn here, and masked to the page's text colour, so these stay vector. */
const pipFiles = import.meta.glob<string>("./pips/*.svg", {
	eager: true,
	query: "?url",
	import: "default",
});

/** Keyed by the file name without its extension, which is the name we cite. */
const byName = (files: Record<string, string>) =>
	Object.fromEntries(
		Object.entries(files).map(([path, url]) => [
			path.replace(/^.*\//, "").replace(/\.\w+$/, ""),
			url,
		]),
	);

/** A name with no file behind it is a build error, never a blank square. */
const fileIn = <Name extends string>(
	files: Record<string, string>,
	directory: string,
) => {
	const urls = byName(files);
	return (name: Name) => {
		const url = urls[name];
		if (url === undefined)
			throw new Error(`Missing file src/icons/${directory}/${name}.*`);
		return url;
	};
};

export const iconUrl = fileIn<IconName>(logoFiles, "logos");
export const pipUrl = fileIn<PipName>(pipFiles, "pips");

export const pipLabel = (name: PipName) => pipLabels[name];
