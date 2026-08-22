const methods = [
	"port-forward",
	"ipv6",
	"vps-plus-tunnel",
	"tailscale",
	"headscale",
	"zerotier",
	"no-remote-access",
	"wireguard",
	"netbird-cloud",
] as const;

type OptionSpace = {
	/**
	 * get-domain: DuckDNS or buy domain
	 */
	extraGuides: ("get-domain" | "dynamic-dns")[];
	methods: (typeof methods)[number][];
	reverseProxy?: (
		| "caddy"
		| "caddy-docker-proxy"
		| "traefik"
		| "tailscale-funnel"
		| "cloudflare-proxy"
	)[];
	environment: {
		cgnat: boolean;
		maxUsers: number | "many";
	};
};

type Answer = {
	label: string;
} & (
	| {
			operation: (optionSpace: OptionSpace) => OptionSpace;
	  }
	| {
			nextQuestion: Question;
	  }
	| {
			operation: (optionSpace: OptionSpace) => OptionSpace;
			nextQuestion: Question;
	  }
);

interface Question {
	id: string;
	question: string;
	answers: Answer[];
	condition?: (optionSpace: OptionSpace) => boolean;
}

const openSource = {
	id: "open-source",
	condition: (space) =>
		(space.methods.length === 2 && space.methods.includes("tailscale")) ||
		space.methods.includes("netbird-cloud"),
	question: "Tailscale (comfortable) or Netbird Cloud (fully open-source)?",
	answers: [
		{
			label: "Tailscale",
			operation: (space) => ({ ...space, methods: ["tailscale"] }),
		},
		{
			label: "Netbird Cloud",
			operation: (space) => ({ ...space, methods: ["netbird-cloud"] }),
		},
	],
} as const satisfies Question;

const comfortVsIndependence = {
	id: "comfort-vs-independence",
	condition: (space) =>
		space.methods.some(
			(m) =>
				m === "headscale" ||
				m === "port-forward" ||
				m === "ipv6" ||
				m === "vps-plus-tunnel" ||
				m === "wireguard",
		) &&
		space.methods.some(
			(m) => m === "tailscale" || m === "netbird-cloud" || m === "zerotier",
		),
	question: "Do you prefer comfort or independence?",
	answers: [
		{
			label: "Comfort",
			operation: (space) => ({
				...space,
				methods: space.methods.filter(
					(m) =>
						m !== "headscale" &&
						m !== "port-forward" &&
						m !== "ipv6" &&
						m !== "vps-plus-tunnel" &&
						m !== "wireguard",
				),
			}),
			nextQuestion: openSource,
		},
		{
			label: "Independence",
			operation: (space) => ({
				...space,
				methods: space.methods.filter(
					(m) => m !== "tailscale" && m !== "netbird-cloud" && m !== "zerotier",
				),
			}),
		},
	],
} as const satisfies Question;

const paranoia = {
	id: "paranoia",
	question: "How paranoid are you about security?",
	answers: [
		{
			label: "I'm willing to put in the effort to do it right",
			nextQuestion: todo,
		},
		{
			label: "Somewhat",
			operation: (space) => ({
				...space,
				methods: space.methods.filter(
					(m) =>
						m !== "port-forward" && m !== "ipv6" && m !== "vps-plus-tunnel",
				),
			}),
		},
		{
			label: "I'm scared that I'll get hacked and don't know much about tech",
			operation: (space) => ({
				...space,
				methods: ["no-remote-access"],
			}),
		},
	],
} as const satisfies Question;

const extraAppAcceptable = {
	id: "extra-app-acceptable",
	question:
		"Is it acceptable that your users will need to install an additional app (like Tailscale) to use your services remotely?",
	condition: (space) =>
		space.methods.includes("tailscale") ||
		space.methods.includes("netbird-cloud") ||
		space.methods.includes("headscale") ||
		space.methods.includes("zerotier"),
	answers: [
		{
			label: "Absolutely not",
			operation: (space) => ({
				...space,
				methods: space.methods.filter(
					(m) =>
						m !== "tailscale" &&
						m !== "netbird-cloud" &&
						m !== "headscale" &&
						m !== "zerotier",
				),
			}),
		},
		{
			label: "Yes",
			operation: (space) => todo,
		},
	],
} as const satisfies Question;

// TODO for the extra app and other users, should we maybe ask if the user doing the quiz something like "would you let all users on your private network / Wifi?" but then again, depending on the e.g. tailscale config this isn't the same unless a node is used as an exit node i think. but we should probably make sure that the interviewee is sure that they want to give their users this type of access to their server/network.

const haveVPS = {
	id: "have-vps",
	question: "Do you have a VPS or plan to rent one?",
	condition: (space) => space.methods.includes("vps-plus-tunnel"),
	answers: [
		{
			label: "No",
			operation: (space) => ({
				...space,
				methods: space.methods.filter((m) => m !== "vps-plus-tunnel"),
			}),
		},
		{
			label: "Yes",
			operation: (space) => space,
		},
	],
} as const satisfies Question;

const payForTunnelService = {
	id: "pay-for-tunnel-service",
	question:
		"Do you feel like paying a monthly fee per user to avoid port-forwarding?",
	condition: (space) =>
		space.methods.includes("tailscale") ||
		space.methods.includes("netbird-cloud"),
	answers: [
		{
			label: "Yes",
		},
		{
			label: "No",
			nextQuestion: haveVPS,
		},
	],
} as const satisfies Question;

const howManyUsers = {
	id: "how-many-users",
	question:
		"How many users, including yourself, do you want to serve? Prefer lower if unsure.",
	condition: (space) =>
		space.methods.includes("tailscale") ||
		space.methods.includes("netbird-cloud"),
	answers: [
		{
			label: "1-5",
			operation: (space) => ({
				...space,
				environment: {
					...space.environment,
					maxUsers: 5,
				},
			}), // TODO lean towards tailscale/netbird
		},
		{
			label: "6",
			operation: (space) => ({
				...space,
				environment: {
					...space.environment,
					maxUsers: 6,
				},
			}),
		},
		{
			label: "More than 6",
			operation: (space) => ({
				...space,
				environment: {
					...space.environment,
					maxUsers: "many",
				},
			}),
			nextQuestion: payForTunnelService,
		},
	],
} as const satisfies Question;

const routerAccessForPortForwarding = {
	id: "router-access-for-port-forwarding",
	question: "Can you set up port-forwarding on your router?",
	condition: (space) =>
		space.environment.cgnat === false && space.methods.includes("port-forward"),
	answers: [
		{
			label: "No",
			operation: (space) => ({
				...space,
				methods: space.methods.filter((m) => m !== "port-forward"),
			}),
		},
		{
			label: "Yes",
			operation: (space) => space,
		},
	],
} as const satisfies Question;

export const headscaleVsWireguard = {
	id: "headscale-vs-wireguard",
	question: "Do you have a VPS or plan to rent one?",
	condition: (space) =>
		space.methods.length === 2 &&
		space.methods.includes("headscale") &&
		space.methods.includes("wireguard"),
	answers: [
		{
			label: "No",
			operation: (space) => ({
				...space,
				methods: space.methods.filter((m) => m !== "headscale"),
			}),
		},
		{
			label: "Yes",
			operation: (space) => ({
				...space,
				methods: space.methods.filter((m) => m !== "wireguard"),
			}),
		},
	],
} as const satisfies Question;

export const dynamicDNS = {
	id: "dynamic-dns",
	question: "Do you have dynamic DNS already set up?",
	answers: [
		{
			label: "No",
			operation: (space) => ({
				...space,
				extraGuides: [...space.extraGuides, "dynamic-dns"],
			}),
		},
		{
			label: "Yes",
			operation: (space) => space,
		},
	],
} as const satisfies Question;

export const staticIPv4 = {
	id: "static-ipv4",
	question: "Do you have a static IPv4 address?",
	condition: (space) =>
		space.methods.includes("port-forward") ||
		space.methods.includes("wireguard"),
	answers: [
		{
			label: "No",
			nextQuestion: dynamicDNS,
		},
		{
			label: "Yes",
			operation: (space) => space,
		},
	],
} as const satisfies Question;

export const domain = {
	id: "domain",
	question: "Do you have a domain?",
	condition: (space) =>
		!(
			space.reverseProxy?.length === 1 &&
			space.reverseProxy[0] === "tailscale-funnel"
		),
	answers: [
		{
			label: "No",
			operation: (space) => ({
				...space,
				extraGuides: [...space.extraGuides, "get-domain"],
			}),
		},
		{
			label: "Yes",
			operation: (space) => space,
		},
	],
} as const satisfies Question;

export const cgnat = {
	id: "cgnat",
	question: "Do you have CGNAT?", // TODO: URL/link for explaining CGNAT and how to figure it out
	condition: (space) => space.methods.includes("port-forward"),
	answers: [
		{
			label: "No",
			operation: (space) => space,
		},
		{
			label: "Yes",
			operation: (space) => ({
				...space,
				methods: space.methods.filter((m) => m !== "port-forward"),
			}),
		},
	],
} as const satisfies Question;

const highBandwidthSingleService = {
	id: "high-bandwidth-single-service",
	question:
		"Is this single service something like Jellyfin, Plex, or another high-bandwidth service like video streaming?",
	answers: [
		{
			label: "Yes",
			operation: (space) => ({
				...space,
				reverseProxy: space.reverseProxy?.filter(
					(m) => m !== "tailscale-funnel" && m !== "cloudflare-proxy",
				),
			}),
		},
		{
			label: "No, lower bandwidth",
			// TODO unsure what to do here, but lean towards cloudflare-proxy or tailscale-funnel
			nextQuestion: todo,
		},
	],
} as const satisfies Question;

const caddyVsTraefik = {
	id: "caddy-vs-traefik",
	question:
		"Do you want to use Caddy (with Docker labels) even though setting up Traefik might be simpler?",
	condition: (space) =>
		space.reverseProxy?.length === 2 &&
		space.reverseProxy.includes("caddy") &&
		space.reverseProxy.includes("traefik"),
	answers: [
		{
			label: "I really want to use Caddy",
			operation: (space) => ({
				...space,
				reverseProxy: ["caddy-docker-proxy"],
			}),
		},
		{
			label: "I prefer Traefik / I don't care",
			operation: (space) => ({ ...space, reverseProxy: ["traefik"] }),
		},
	],
} as const satisfies Question;

const howManyServices = {
	id: "how-many-services",
	question: "How many services do you want to serve remotely?",
	answers: [
		{
			label: "5 or less",
			operation: (space) => ({ ...space, reverseProxy: ["caddy"] }),
		},
		{
			label: "More than 5",
			nextQuestion: caddyVsTraefik,
		},
	],
} as const satisfies Question;

const mostlyDocker = {
	id: "mostly-docker",
	question: "Do you run most of your services using Docker?",
	answers: [
		{
			label: "No",
			operation: (space) => ({ ...space, reverseProxy: ["caddy"] }),
		},
		{
			label: "Yes",
			nextQuestion: howManyServices,
		},
	],
} as const satisfies Question;

const singleService = {
	id: "single-service",
	question:
		"Do you only need to remotely access a single service (and you only need HTTPS for it)?",
	answers: [
		{
			label: "Yes",
			nextQuestion: highBandwidthSingleService,
		},
		{
			label: "No",
			nextQuestion: mostlyDocker,
		},
	],
} as const satisfies Question;

const reverseProxy = {
	id: "reverse-proxy",
	question: "Do you already have a reverse proxy?",
	answers: [
		{
			label: "Yes",
			nextQuestion: todo,
		},
		{
			label: "No",
			nextQuestion: singleService,
		},
	],
} as const satisfies Question;

/**
 * TODO options that haven't been considered so far:
- ZeroTier
- Cloudflare Proxy or tunnel or maybe their zero trust solution if that's any different? (what would users gain vs other solutions?)
 */
