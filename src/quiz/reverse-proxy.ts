import {
	con,
	either,
	keepAll,
	pro,
	type Choice,
	type Question,
	type Quiz,
	type Trait,
} from "./engine";

/**
 * Only worth running when the resolved remote access method does not serve the
 * services over HTTPS itself, see its handlesTlsForPublicServices property.
 */
export type ReverseProxy = {
	slug: string;
	/** Which tool it is, for people who already run one of them. */
	family: "caddy" | "traefik" | "nginx" | "tailscale" | "cloudflare";
	/** Routes are added by clicking around, with no config file to write. */
	hasWebInterface: boolean;
	/** Routes are declared with container labels instead of a config file. */
	isDockerNative: boolean;
	isDependentOnThirdParty: boolean;
	/** No bandwidth cap or terms of service getting in the way of video. */
	isHighBandwidthFriendly: boolean;
	needsDomain: boolean;
	/** How many services stay pleasant to declare by hand. null: no limit. */
	maxHandWrittenServices: number | null;
};

/**
 * Declaration order breaks ties, simplest first: several of these are alike
 * once the user has no habit of any of them, and a beginner is better served
 * by a Caddyfile than by asking which of two unknown names they prefer.
 */
const reverseProxies = [
	{
		slug: "caddy",
		family: "caddy",
		hasWebInterface: false,
		isDockerNative: false,
		isDependentOnThirdParty: false,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		maxHandWrittenServices: 5,
	},
	{
		slug: "traefik",
		family: "traefik",
		hasWebInterface: false,
		isDockerNative: true,
		isDependentOnThirdParty: false,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		maxHandWrittenServices: null,
	},
	{
		slug: "caddy-docker-proxy",
		family: "caddy",
		hasWebInterface: false,
		isDockerNative: true,
		isDependentOnThirdParty: false,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		maxHandWrittenServices: null,
	},
	{
		slug: "nginx-proxy-manager",
		family: "nginx",
		hasWebInterface: true,
		isDockerNative: false,
		isDependentOnThirdParty: false,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		maxHandWrittenServices: null,
	},
	{
		// Nginx Proxy Manager was the whole nginx family, which left anyone who
		// already runs nginx and wants a config file with nothing at all.
		slug: "nginx",
		family: "nginx",
		hasWebInterface: false,
		isDockerNative: false,
		isDependentOnThirdParty: false,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		maxHandWrittenServices: 5,
	},
	{
		slug: "tailscale-funnel",
		family: "tailscale",
		hasWebInterface: false,
		isDockerNative: false,
		isDependentOnThirdParty: true,
		isHighBandwidthFriendly: false,
		needsDomain: false,
		maxHandWrittenServices: 1,
	},
	{
		slug: "cloudflare-proxy",
		family: "cloudflare",
		hasWebInterface: true,
		isDockerNative: false,
		isDependentOnThirdParty: true,
		isHighBandwidthFriendly: false,
		needsDomain: true,
		maxHandWrittenServices: null,
	},
] as const satisfies readonly ReverseProxy[];

export type ReverseProxySlug = (typeof reverseProxies)[number]["slug"];

const questions = [
	{
		id: "already-used",
		kind: "fact",
		question: "Do you already use one of these?",
		answers: [
			{ label: "None of them", keep: keepAll },
			{ label: "Caddy", keep: (p) => p.family === "caddy" },
			{ label: "Traefik", keep: (p) => p.family === "traefik" },
			{ label: "Nginx", keep: (p) => p.family === "nginx" },
		],
	},
	{
		id: "how-many-services",
		kind: "fact",
		question: "How many services will you expose?",
		answers: [
			{ label: "Just one", keep: keepAll },
			{
				label: "2 to 5",
				keep: (p) =>
					p.maxHandWrittenServices === null || p.maxHandWrittenServices >= 5,
			},
			{ label: "More than 5", keep: (p) => p.maxHandWrittenServices === null },
		],
	},
	{
		id: "high-bandwidth",
		kind: "fact",
		// Streaming is what this site is about: never let a capped option through
		asksFirst: true,
		question: "Will one of your services stream video?",
		help: "Jellyfin, for instance: video is what some proxies meter or forbid outright.",
		answers: [
			{ label: "Yes", keep: (p) => p.isHighBandwidthFriendly },
			{ label: "No", keep: keepAll },
			{ label: "I don't know", keep: (p) => p.isHighBandwidthFriendly },
		],
	},
	{
		id: "docker",
		kind: "fact",
		question: "Do your services run in Docker?",
		answers: [
			{ label: "Yes", keep: keepAll },
			{ label: "No", keep: (p) => !p.isDockerNative },
		],
	},
	{
		id: "third-party",
		kind: "preference",
		question: "Should your traffic go through a company's servers?",
		answers: [
			{
				label: "Yes, one less thing to run",
				keep: (p) => p.isDependentOnThirdParty,
			},
			{
				label: "No, straight from my server",
				keep: (p) => !p.isDependentOnThirdParty,
			},
		],
	},
	{
		id: "own-domain",
		kind: "preference",
		question: "Do you want your own domain name?",
		answers: [
			{ label: "Yes, my own", keep: (p) => p.needsDomain },
			{ label: "No, whatever address I am given", keep: (p) => !p.needsDomain },
		],
	},
	{
		id: "web-interface-or-config-file",
		kind: "preference",
		question: "How do you want to add a service?",
		answers: [
			{ label: "In a web interface", keep: (p) => p.hasWebInterface },
			{ label: "In a config file", keep: (p) => !p.hasWebInterface },
		],
	},
] as const satisfies readonly Question<ReverseProxy>[];

export const reverseProxyQuiz: Quiz<ReverseProxy> = {
	options: reverseProxies,
	questions,
};

/** The answer that rules an option out, to hang a dealbreaker button on. */
const rulesOut = (id: string, label: string): Choice<ReverseProxy> => {
	const question = questions.find((one) => one.id === id);
	const answer = question?.answers.find((one) => one.label === label);
	if (!question || !answer) throw new Error(`no "${label}" in "${id}"`);
	return { question, answer };
};

/** What the proxy is like, whatever the quiz happened to ask. */
export const traits = (proxy: ReverseProxy): Trait<ReverseProxy>[] => {
	const list: Trait<ReverseProxy>[] = [
		either(
			proxy.isHighBandwidthFriendly,
			"Streams video without complaint",
			"Streaming video goes against its terms",
			rulesOut("high-bandwidth", "Yes"),
		),
		either(
			!proxy.isDependentOnThirdParty,
			"Traffic goes straight from your server",
			"Your traffic goes through a company's servers",
			rulesOut("third-party", "No, straight from my server"),
		),
		either(
			proxy.hasWebInterface,
			"Services are added in a web interface",
			"Services are added in a config file",
			rulesOut("web-interface-or-config-file", "In a web interface"),
		),
		either(
			!proxy.needsDomain,
			"No domain to buy",
			"A domain name of your own",
			rulesOut("own-domain", "No, whatever address I am given"),
		),
	];

	if (proxy.isDockerNative) list.push(pro("Containers declare their own routes"));

	if (proxy.maxHandWrittenServices === null)
		list.push(pro("As many services as you like"));
	else
		list.push(
			con(
				`Pleasant up to ${proxy.maxHandWrittenServices} service${proxy.maxHandWrittenServices > 1 ? "s" : ""}`,
				rulesOut("how-many-services", "More than 5"),
			),
		);

	return list;
};

/**
 * Cloudflare Zero Trust is deliberately absent: Access is an authentication
 * layer bolted on top of the tunnel or the proxy, not another reverse proxy to
 * choose between.
 */
