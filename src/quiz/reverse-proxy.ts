import {
	blocking,
	con,
	either,
	keepAll,
	pro,
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
	family: "caddy" | "traefik" | "nginx" | "tailscale" | "zoraxy";
	/**
	 * The ways the proxy can be told about a service, each a capability and never
	 * a commitment: Traefik and Caddy Docker Proxy read labels and a config file
	 * both. Between them they have to cover every option, or the question that
	 * offers them leaves someone with no answer to give.
	 */
	hasWebInterface: boolean;
	hasConfigFile: boolean;
	readsContainerLabels: boolean;
	isSetUpWithACommand: boolean;
	isDependentOnThirdParty: boolean;
	/** Ships as a container and nothing else, so Docker comes with it. */
	needsDocker: boolean;
	/** No bandwidth cap or terms of service getting in the way of video. */
	isHighBandwidthFriendly: boolean;
	needsDomain: boolean;
	/**
	 * Serves one machine name on three ports, so a second service goes on a path
	 * rather than an address of its own.
	 */
	servesOneAddress: boolean;
};

/**
 * Declaration order breaks ties, simplest first: a beginner with no habit of
 * any of them is better served by a Caddyfile than by a name they don't know.
 */
const reverseProxies = [
	{
		slug: "caddy",
		family: "caddy",
		hasWebInterface: false,
		hasConfigFile: true,
		readsContainerLabels: false,
		isSetUpWithACommand: false,
		isDependentOnThirdParty: false,
		needsDocker: false,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		servesOneAddress: false,
	},
	{
		slug: "traefik",
		family: "traefik",
		hasWebInterface: false,
		hasConfigFile: true,
		readsContainerLabels: true,
		isSetUpWithACommand: false,
		isDependentOnThirdParty: false,
		needsDocker: false,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		servesOneAddress: false,
	},
	{
		slug: "caddy-docker-proxy",
		family: "caddy",
		hasWebInterface: false,
		hasConfigFile: true,
		readsContainerLabels: true,
		isSetUpWithACommand: false,
		isDependentOnThirdParty: false,
		needsDocker: true,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		servesOneAddress: false,
	},
	{
		slug: "nginx-proxy-manager",
		family: "nginx",
		hasWebInterface: true,
		hasConfigFile: false,
		readsContainerLabels: false,
		isSetUpWithACommand: false,
		isDependentOnThirdParty: false,
		needsDocker: true,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		servesOneAddress: false,
	},
	{
		// The only web interface that is not a container, which is what a spare
		// Windows or Mac machine without Docker is otherwise left without
		slug: "zoraxy",
		family: "zoraxy",
		hasWebInterface: true,
		hasConfigFile: false,
		readsContainerLabels: false,
		isSetUpWithACommand: false,
		isDependentOnThirdParty: false,
		needsDocker: false,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		servesOneAddress: false,
	},
	{
		// For the nginx habit that wants a config file, which Nginx Proxy Manager
		// does not give
		slug: "nginx",
		family: "nginx",
		hasWebInterface: false,
		hasConfigFile: true,
		readsContainerLabels: false,
		isSetUpWithACommand: false,
		isDependentOnThirdParty: false,
		needsDocker: false,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		servesOneAddress: false,
	},
	{
		slug: "tailscale-funnel",
		family: "tailscale",
		hasWebInterface: false,
		hasConfigFile: false,
		readsContainerLabels: false,
		isSetUpWithACommand: true,
		isDependentOnThirdParty: true,
		needsDocker: false,
		isHighBandwidthFriendly: false,
		needsDomain: false,
		servesOneAddress: true,
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
		id: "docker",
		kind: "fact",
		question: "Do you run Docker?",
		answers: [
			{ label: "Yes", keep: keepAll },
			{ label: "No", keep: (p) => !p.needsDocker },
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
		id: "how-to-add-a-service",
		kind: "preference",
		question: "How do you want to add a service?",
		answers: [
			{ label: "In a web interface", keep: (p) => p.hasWebInterface },
			{ label: "In a config file", keep: (p) => p.hasConfigFile },
			{
				label: "On the container, as a label",
				keep: (p) => p.readsContainerLabels,
			},
			{ label: "With one command", keep: (p) => p.isSetUpWithACommand },
		],
	},
] as const satisfies readonly Question<ReverseProxy>[];

export const reverseProxyQuiz: Quiz<ReverseProxy> = {
	options: reverseProxies,
	questions,
};

/**
 * What the proxy is like, whatever the quiz happened to ask. Every con names the
 * predicate it was read from, which the dealbreaker button filters on.
 */
export const traits = (proxy: ReverseProxy): Trait<ReverseProxy>[] => {
	const list: Trait<ReverseProxy>[] = [
		blocking(
			either(
				proxy,
				(one) => one.isHighBandwidthFriendly,
				"Streams video without complaint",
				"Streaming video goes against its terms",
			),
		),
		either(
			proxy,
			(one) => !one.isDependentOnThirdParty,
			"Traffic goes straight from your server",
			"Your traffic goes through a company's servers",
		),
		either(
			proxy,
			(one) => !one.needsDomain,
			"No domain to buy",
			"A domain name of your own",
		),
	];

	if (proxy.hasWebInterface)
		list.push(pro("Services are added in a web interface"));
	if (proxy.hasConfigFile)
		list.push(
			con("Services are added in a config file", (one) => one.hasWebInterface),
		);
	if (proxy.readsContainerLabels)
		list.push(pro("Containers can declare their own routes"));
	if (proxy.needsDocker)
		list.push(blocking(con("Only runs in Docker", (one) => !one.needsDocker)));
	if (proxy.isSetUpWithACommand)
		list.push(pro("One command per service, nothing to edit"));

	if (proxy.servesOneAddress)
		list.push(
			con(
				"Services share one address, on a path",
				(one) => !one.servesOneAddress,
			),
		);

	return list;
};

/**
 * Cloudflare is deliberately absent. The orange cloud maps every proxied
 * hostname to one origin address, so something at home still dispatches by Host
 * header: it goes in front of a reverse proxy, it is not one. Tunnel does route
 * hostnames to local services and serves HTTPS itself, so it lives in the remote
 * access quiz and nobody who picks it is sent here. Zero Trust is an
 * authentication layer on top of either.
 */
