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
	| "pangolin"
	| "tailscale"
	| "traefik"
	| "wireguard"
	| "zerotier"
	| "zoraxy";

export type PipName =
	| "cloud"
	| "docker"
	| "funnel"
	| "home"
	| "key"
	| "labels"
	| "paid"
	| "vps"
	| "web-ui";

export type Emblem = { icon: IconName; pips?: readonly PipName[] };

/** Read as a sentence after the option's own name, which is always next to it. */
const pipLabels: Record<PipName, string> = {
	cloud: "hosted for you",
	docker: "runs as a container",
	funnel: "published with Funnel",
	home: "runs at home",
	key: "needs a licence key",
	labels: "routed by container labels",
	paid: "costs money every month",
	vps: "runs on a server you rent",
	"web-ui": "managed in a browser",
};

const iconFiles = import.meta.glob<string>("./svg/*.svg", {
	eager: true,
	query: "?url",
	import: "default",
});

const pipFiles = import.meta.glob<string>("./pips/*.svg", {
	eager: true,
	query: "?url",
	import: "default",
});

/** A name with no file behind it is a build error, never a blank square. */
const fileIn =
	<Name extends string>(files: Record<string, string>, directory: string) =>
	(name: Name) => {
		const url = files[`./${directory}/${name}.svg`];
		if (url === undefined)
			throw new Error(
				`Missing icon file src/icons/${directory}/${name}.svg`,
			);
		return url;
	};

export const iconUrl = fileIn<IconName>(iconFiles, "svg");
export const pipUrl = fileIn<PipName>(pipFiles, "pips");

export const pipLabel = (name: PipName) => pipLabels[name];
