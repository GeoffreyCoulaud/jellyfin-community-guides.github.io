import type { Emblem, IconName } from "./icons/emblems";
import type {
	ExtraGuide as RemoteAccessExtra,
	MethodSlug,
} from "./quiz/remote-access";
import type {
	ExtraGuide as ReverseProxyExtra,
	ReverseProxySlug,
} from "./quiz/reverse-proxy";

/**
 * `page` is a file under the family's directory, not the option's own slug:
 * options whose guides would say the same thing share one, a free plan and a
 * paid plan of one service installing and configuring exactly the same thing.
 */
type Listing = { title: string; page: string; emblem: Emblem };

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
	"wg-easy": {
		title: "wg-easy",
		page: "wg-easy",
		emblem: { icon: "wg-easy" },
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
	// A page of its own: publishing a service is not what the tailnet guide does
	"tailscale-funnel": {
		title: "Tailscale Funnel",
		page: "tailscale-funnel",
		emblem: { icon: "tailscale", pips: ["public"] },
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
	// Four pages: the edition and the place it runs both change what you set up
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
 * A tool that runs either way is one option. Caddy is named twice for one page:
 * its DNS module is compiled in, which one command does to a package and a
 * Dockerfile of your own does to an image.
 */
const reverseProxy: Record<ReverseProxySlug, Listing> = {
	caddy: { title: "Caddy", page: "caddy", emblem: { icon: "caddy" } },
	"caddy-in-docker": {
		title: "Caddy in Docker",
		page: "caddy",
		emblem: { icon: "caddy", pips: ["docker"] },
	},
	traefik: {
		title: "Traefik",
		page: "traefik",
		emblem: { icon: "traefik" },
	},
	// A container too, so the pip carries what actually tells it from the others
	"caddy-docker-proxy": {
		title: "Caddy Docker Proxy",
		page: "caddy-docker-proxy",
		emblem: { icon: "caddy", pips: ["labels"] },
	},
	"nginx-proxy-manager": {
		title: "Nginx Proxy Manager",
		page: "nginx-proxy-manager",
		emblem: { icon: "npm" },
	},
	zoraxy: { title: "Zoraxy", page: "zoraxy", emblem: { icon: "zoraxy" } },
	nginx: { title: "Nginx", page: "nginx", emblem: { icon: "nginx" } },
	"nginx-in-docker": {
		title: "Nginx in Docker",
		page: "nginx",
		emblem: { icon: "nginx", pips: ["docker"] },
	},
	// SWAG draws no mark of its own, so it wears the one of the people who build
	// it, which is what its page and its image are published under anyway
	swag: { title: "SWAG", page: "swag", emblem: { icon: "swag" } },
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

/** The reverse proxy is a quiz of its own, the rest are reference pages. */
export const remoteAccessExtras: Record<RemoteAccessExtra, Extra> = {
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

export const reverseProxyExtras: Record<ReverseProxyExtra, Extra> = {
	"harden-reverse-proxy": {
		title: "Harden your reverse proxy",
		href: `${referenceDirectory}/harden-reverse-proxy/`,
	},
};

/**
 * The icon a page carries in the sidebar. No pips: there is no second option on
 * the page to tell it from.
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
