import {
	extraGuides,
	remoteAccessQuiz,
	traits,
	type ExtraGuide,
	type Method,
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

const guideTitles: Record<ExtraGuide, string> = {
	"get-domain": "Get a domain name",
	"dynamic-dns": "Keep a name pointing at your home",
	"restrict-vpn-access": "Restrict what your users reach",
	"private-dns": "Reach your machines by name",
};

const doc = (method: Method): Doc => ({
	title: titles[method.slug as MethodSlug],
	href: `/guides/remote-access/${method.slug}/`,
});

const guides = (method: Method): Doc[] =>
	extraGuides(method).map((guide) => ({
		title: guideTitles[guide],
		href: `/guides/${guide}/`,
	}));

export const RemoteAccessQuiz = () => (
	<QuizRunner
		quiz={remoteAccessQuiz}
		doc={doc}
		guides={guides}
		traits={traits}
	/>
);
