/**
 * What the site shows for one quiz option: the name people read, the page that
 * documents it, and the icon it goes by. One record per family, so a new option
 * stops the build until it has all three.
 */

import type { Emblem, IconName } from "./icons/emblems";
import type { ExtraGuide, MethodSlug } from "./quiz/remote-access";
import type { ReverseProxySlug } from "./quiz/reverse-proxy";

/**
 * `page` is a file under the family's directory, not the option's own slug.
 * Options whose guides would say the same thing share one: between a free plan
 * and a paid plan of the same service, nothing you install or configure
 * changes, so writing it twice would only mean maintaining it twice. The
 * options stay apart, since what they cost still decides between them; their
 * page does not, and the bill is a line on the result card.
 */
type Listing = { title: string; page: string; emblem: Emblem };

/** A listing as the quiz hands it to the reader: the page, resolved. */
export type Guide = { title: string; href: string; emblem: Emblem };

const remoteAccessDirectory = "/guides/remote-access";
const reverseProxyDirectory = "/guides/reverse-proxy";
const referenceDirectory = "/reference";

const remoteAccess: Record<MethodSlug, Listing> = {
	// Nobody's product: a router, an address family and a rented box you wire up
	"port-forward": {
		title: "Port forwarding",
		page: "port-forward",
		emblem: { icon: "diy" },
	},
	ipv6: { title: "Direct IPv6", page: "ipv6", emblem: { icon: "diy" } },
	"vps-plus-tunnel": {
		title: "A VPS tunnelled back home",
		page: "vps-plus-tunnel",
		emblem: { icon: "diy" },
	},
	wireguard: {
		title: "WireGuard",
		page: "wireguard",
		emblem: { icon: "wireguard" },
	},
	"tailscale-free": {
		title: "Tailscale, free plan",
		page: "tailscale",
		emblem: { icon: "tailscale" },
	},
	"tailscale-standard": {
		title: "Tailscale, Standard plan",
		page: "tailscale",
		emblem: { icon: "tailscale", pips: ["paid"] },
	},
	headscale: {
		title: "Headscale",
		page: "headscale",
		emblem: { icon: "headscale" },
	},
	"netbird-cloud-free": {
		title: "NetBird Cloud, free plan",
		page: "netbird-cloud",
		emblem: { icon: "netbird", pips: ["cloud"] },
	},
	"netbird-cloud-team": {
		title: "NetBird Cloud, Team plan",
		page: "netbird-cloud",
		emblem: { icon: "netbird", pips: ["cloud", "paid"] },
	},
	"netbird-ce-on-vps": {
		title: "NetBird self-hosted",
		page: "netbird-ce-on-vps",
		emblem: { icon: "netbird", pips: ["vps"] },
	},
	"zerotier-free": {
		title: "ZeroTier, free plan",
		page: "zerotier",
		emblem: { icon: "zerotier" },
	},
	"zerotier-essential": {
		title: "ZeroTier, Essential plan",
		page: "zerotier",
		emblem: { icon: "zerotier", pips: ["paid"] },
	},
	"cloudflare-tunnel": {
		title: "Cloudflare Tunnel",
		page: "cloudflare-tunnel",
		emblem: { icon: "cloudflare" },
	},
	// The four Pangolins keep four pages: an edition and a place to run it both
	// change what you set up, which is the whole of the guide
	"pangolin-ce-on-vps": {
		title: "Pangolin CE on a VPS",
		page: "pangolin-ce-on-vps",
		emblem: { icon: "pangolin", pips: ["vps"] },
	},
	"pangolin-ce-at-home": {
		title: "Pangolin CE at home",
		page: "pangolin-ce-at-home",
		emblem: { icon: "pangolin", pips: ["home"] },
	},
	"pangolin-ee-on-vps": {
		title: "Pangolin EE on a VPS",
		page: "pangolin-ee-on-vps",
		emblem: { icon: "pangolin", pips: ["vps", "key"] },
	},
	"pangolin-ee-at-home": {
		title: "Pangolin EE at home",
		page: "pangolin-ee-at-home",
		emblem: { icon: "pangolin", pips: ["home", "key"] },
	},
};

/**
 * A tool run two ways is two options on one page: the guide covers both, and
 * where it runs is a line on the result card rather than a name of its own. The
 * pips only ever tell apart options sharing an icon, so the variants keep the
 * plain one they share with their page.
 */
const caddyListing: Listing = {
	title: "Caddy",
	page: "caddy",
	emblem: { icon: "caddy" },
};

const traefikListing: Listing = {
	title: "Traefik",
	page: "traefik",
	emblem: { icon: "traefik" },
};

const nginxListing: Listing = {
	title: "Nginx",
	page: "nginx",
	emblem: { icon: "nginx" },
};

const zoraxyListing: Listing = {
	title: "Zoraxy",
	page: "zoraxy",
	emblem: { icon: "zoraxy" },
};

/** None of these is sold by the plan, so no two tools share a page. */
const reverseProxy: Record<ReverseProxySlug, Listing> = {
	caddy: caddyListing,
	"caddy-in-docker": caddyListing,
	traefik: traefikListing,
	"traefik-in-docker": traefikListing,
	"caddy-docker-proxy": {
		title: "Caddy Docker Proxy",
		page: "caddy-docker-proxy",
		emblem: { icon: "caddy", pips: ["docker"] },
	},
	"nginx-proxy-manager": {
		title: "Nginx Proxy Manager",
		page: "nginx-proxy-manager",
		emblem: { icon: "nginx", pips: ["web-ui"] },
	},
	zoraxy: zoraxyListing,
	"zoraxy-in-docker": zoraxyListing,
	nginx: nginxListing,
	"nginx-in-docker": nginxListing,
	"tailscale-funnel": {
		title: "Tailscale Funnel",
		page: "tailscale-funnel",
		emblem: { icon: "tailscale", pips: ["funnel"] },
	},
};

const resolve = (directory: string, listing: Listing): Guide => ({
	title: listing.title,
	href: `${directory}/${listing.page}/`,
	emblem: listing.emblem,
});

export const remoteAccessGuide = (slug: MethodSlug) =>
	resolve(remoteAccessDirectory, remoteAccess[slug]);

export const reverseProxyGuide = (slug: ReverseProxySlug) =>
	resolve(reverseProxyDirectory, reverseProxy[slug]);

/** A page with no option behind it, so nothing to picture it by. */
export type Extra = { title: string; href: string };

/**
 * What is left to set up once the method is picked. The reverse proxy is a quiz
 * of its own, the rest are pages under the reference directory.
 */
export const extraPages: Record<ExtraGuide, Extra> = {
	"reverse-proxy": {
		title: "Pick a reverse proxy for HTTPS",
		href: "/quiz/reverse-proxy/",
	},
	"get-domain": {
		title: "Get a domain name",
		href: `${referenceDirectory}/get-domain/`,
	},
	"dynamic-dns": {
		title: "Keep a name pointing at your home",
		href: `${referenceDirectory}/dynamic-dns/`,
	},
	"restrict-vpn-access": {
		title: "Restrict what your users reach",
		href: `${referenceDirectory}/restrict-vpn-access/`,
	},
	"private-dns": {
		title: "Reach your machines by name",
		href: `${referenceDirectory}/private-dns/`,
	},
};

/**
 * The icon a page carries in the sidebar. Options sharing a page share their
 * icon by construction: nothing that changed the icon would leave the guide the
 * same. No pips, there being no second option on the page to tell it from.
 */
const pageIcons: Record<string, IconName> = Object.fromEntries([
	...Object.values(remoteAccess).map((listing) => [
		`${remoteAccessDirectory}/${listing.page}/`,
		listing.emblem.icon,
	]),
	...Object.values(reverseProxy).map((listing) => [
		`${reverseProxyDirectory}/${listing.page}/`,
		listing.emblem.icon,
	]),
]);

export const iconForPage = (href: string): IconName | undefined =>
	pageIcons[href];
