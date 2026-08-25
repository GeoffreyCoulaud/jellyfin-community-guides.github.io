import {
	describe,
	keepAll,
	type Axis,
	type Question,
	type Quiz,
} from "./engine";

/** A password of its own, a login page it delegates to, or nothing at all. */
type Authentication = "sso" | "password" | "none";

/**
 * Only worth running when the resolved remote access method serves no HTTPS of
 * its own, which is what earns it the "reverse-proxy" guide over there.
 */
export type ReverseProxy = {
	slug: string;
	/** Which tool it is, for people who already know one of them. */
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
	 * Gets a certificate by proving the name in DNS, the only challenge open to a
	 * service the internet cannot reach. Caddy has the providers as modules to
	 * compile in, and the nginx ACME module answers over HTTP only.
	 */
	hasDnsChallenge: boolean;
	/** How far it goes in front of a service, before the request reaches it. */
	authentication: Authentication;
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
		hasDnsChallenge: false,
		authentication: "sso",
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
		hasDnsChallenge: true,
		authentication: "sso",
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
		hasDnsChallenge: false,
		authentication: "sso",
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
		hasDnsChallenge: true,
		authentication: "password",
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
		hasDnsChallenge: true,
		authentication: "sso",
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
		hasDnsChallenge: false,
		authentication: "sso",
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
		hasDnsChallenge: false,
		authentication: "none",
		servesOneAddress: true,
	},
] as const satisfies readonly ReverseProxy[];

export type ReverseProxySlug = (typeof reverseProxies)[number]["slug"];

/**
 * What the proxy is like, whatever the quiz happened to ask, so the result reads
 * as a description rather than a summary of the answers.
 */
const axes: readonly Axis<ReverseProxy>[] = [
	{
		holds: (one) => one.isHighBandwidthFriendly,
		pro: "Streams video without complaint",
		con: "Streaming video goes against its terms",
	},
	{
		holds: (one) => !one.isDependentOnThirdParty,
		pro: "Traffic goes straight from your server",
		con: "Your traffic goes through a company's servers",
	},
	{
		holds: (one) => !one.needsDomain,
		pro: "No domain to buy",
		con: "A domain name of your own",
	},
	{
		// HTTP-01 needs the name to answer on the open internet, which a service
		// behind a VPN never does
		applies: (one) => one.needsDomain,
		holds: (one) => one.hasDnsChallenge,
		pro: "A DNS challenge, so even an unpublished service gets HTTPS",
		con: "No DNS challenge: HTTPS only for what the internet can reach",
	},
	{
		// Funnel publishes, full stop: there is no gate to put in front of it
		applies: (one) => one.authentication !== "none",
		holds: (one) => one.authentication === "sso",
		pro: "One login in front of every service, with Authelia or the like",
		con: "A password per service, and no single login for all of them",
	},
	{
		// Not open to everyone, the service still has its own accounts: the con is
		// that they are the only gate, and few services treat that as their job
		holds: (one) => one.authentication !== "none",
		con: "Nothing in front: each service is left to guard itself",
	},
	{
		holds: (one) => one.hasWebInterface,
		pro: "Services are added in a web interface",
	},
	{
		// A web interface is not the better way of the two, only the other one:
		// what a file and a label have over it is being text of yours
		applies: (one) => one.hasWebInterface,
		holds: (one) => one.hasConfigFile || one.readsContainerLabels,
		con: "Its routes live in a store of its own, nothing to keep in git",
	},
	{
		holds: (one) => one.hasConfigFile,
		pro: "Services are added in a config file, which you can version",
	},
	{
		holds: (one) => one.readsContainerLabels,
		pro: "A container carries its own route, next to the service itself",
	},
	{
		holds: (one) => !one.needsDocker,
		con: "Only runs in Docker",
	},
	{
		holds: (one) => one.isSetUpWithACommand,
		pro: "One command per service, nothing to edit",
	},
	{
		holds: (one) => !one.servesOneAddress,
		con: "Services share one address, on a path",
	},
];

export const traits = (proxy: ReverseProxy) => describe(proxy, axes);

const questions = [
	{
		id: "already-used",
		kind: "fact",
		// Knowing one is what counts, not running one today: the syntax and the
		// habits are what carry over. Every family needs an answer of its own.
		question: "Do you already know one of these?",
		answers: [
			{ label: "None, or I'd rather start fresh", keep: keepAll },
			{ label: "Caddy", keep: (p) => p.family === "caddy" },
			{ label: "Traefik", keep: (p) => p.family === "traefik" },
			{ label: "Nginx", keep: (p) => p.family === "nginx" },
			{ label: "Zoraxy", keep: (p) => p.family === "zoraxy" },
			{ label: "Tailscale", keep: (p) => p.family === "tailscale" },
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
		question: "Where should your traffic go?",
		answers: [
			{
				label: "Through a company's servers, one less thing to run",
				keep: (p) => p.isDependentOnThirdParty,
			},
			{
				label: "Straight from my server to my users",
				keep: (p) => !p.isDependentOnThirdParty,
			},
			{ label: "I don't mind", keep: keepAll },
		],
	},
	{
		id: "own-domain",
		kind: "preference",
		question: "What address should your services answer on?",
		answers: [
			{ label: "A domain name of my own", keep: (p) => p.needsDomain },
			{ label: "Whatever address I am given", keep: (p) => !p.needsDomain },
			{ label: "I don't mind", keep: keepAll },
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
			{ label: "I don't mind", keep: keepAll },
		],
	},
] as const satisfies readonly Question<ReverseProxy>[];

export const reverseProxyQuiz: Quiz<ReverseProxy> = {
	options: reverseProxies,
	questions,
};

/**
 * Cloudflare is deliberately absent. The orange cloud maps every proxied
 * hostname to one origin address, so something at home still dispatches by Host
 * header: it goes in front of a reverse proxy, it is not one. Tunnel does route
 * hostnames to local services and serves HTTPS itself, so it lives in the remote
 * access quiz and nobody who picks it is sent here. Zero Trust is an
 * authentication layer on top of either.
 */
