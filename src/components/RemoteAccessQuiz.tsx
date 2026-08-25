import {
  extraGuides,
  remoteAccessQuiz,
  traits,
  type ExtraGuide,
  type RemoteAccessMethod,
  type MethodSlug,
} from "../quiz/remote-access";
import { QuizRunner, type Doc } from "./QuizRunner";

/** Slugs are what the guide pages are named after, these are what people read. */
const titles: Record<MethodSlug, string> = {
	"port-forward": "Port forwarding",
	ipv6: "Direct IPv6",
	"vps-plus-tunnel": "A VPS tunnelled back home",
	wireguard: "WireGuard",
	"tailscale-free": "Tailscale, free plan",
	"tailscale-standard": "Tailscale, Standard plan",
	headscale: "Headscale",
	"netbird-cloud-free": "NetBird Cloud, free plan",
	"netbird-cloud-team": "NetBird Cloud, Team plan",
	"netbird-ce-on-vps": "NetBird self-hosted",
	"zerotier-free": "ZeroTier, free plan",
	"zerotier-essential": "ZeroTier, Essential plan",
	"cloudflare-tunnel": "Cloudflare Tunnel",
	"pangolin-ce-on-vps": "Pangolin CE on a VPS",
	"pangolin-ce-at-home": "Pangolin CE at home",
	"pangolin-ee-on-vps": "Pangolin EE on a VPS",
	"pangolin-ee-at-home": "Pangolin EE at home",
};

/** The reverse proxy is a quiz of its own, the rest are pages under /guides. */
const extras: Record<ExtraGuide, Doc> = {
	"reverse-proxy": {
		title: "Pick a reverse proxy for HTTPS",
		href: "/quiz/reverse-proxy/",
	},
	"get-domain": { title: "Get a domain name", href: "/guides/get-domain/" },
	"dynamic-dns": {
		title: "Keep a name pointing at your home",
		href: "/guides/dynamic-dns/",
	},
	"restrict-vpn-access": {
		title: "Restrict what your users reach",
		href: "/guides/restrict-vpn-access/",
	},
	"private-dns": {
		title: "Reach your machines by name",
		href: "/guides/private-dns/",
	},
};

const doc = (method: RemoteAccessMethod): Doc => ({
  title: titles[method.slug as MethodSlug],
  href: `/guides/remote-access/${method.slug}/`,
});

const guides = (method: RemoteAccessMethod): Doc[] =>
  extraGuides(method).map((guide) => extras[guide]);

export const RemoteAccessQuiz = () => (
	<QuizRunner
		quiz={remoteAccessQuiz}
		doc={doc}
		guides={guides}
		traits={traits}
	/>
);
