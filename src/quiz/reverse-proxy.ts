import {
	describe,
	keepAll,
	type Axis,
	type Question,
	type Quiz,
} from "./engine";

/** A password of its own, a login page it delegates to, or nothing at all. */
type Authentication = "sso" | "password" | "none";

/** Where it runs. An option is one tool run one way, never the tool alone. */
type Deployment = "native" | "docker";

/**
 * What a certificate proved in DNS costs to set up, the DNS challenge being the
 * only one open to a service the internet cannot reach.
 */
type DnsChallenge =
	/** A line of configuration: every provider is already in there. */
	| "included"
	/** One command, the module joining the binary it ships with. */
	| "extra-package"
	/** An image of your own to build, and to build again at every update. */
	| "custom-build"
	/** Certbot beside it, a second tool with a configuration of its own. */
	| "external";

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
	/**
	 * A tool running both ways is two options, one each: a plugin does not cost
	 * the same on a package as in an image, and one option cannot hold both
	 * answers at once.
	 */
	deployment: Deployment;
	/** No bandwidth cap or terms of service getting in the way of video. */
	isHighBandwidthFriendly: boolean;
	needsDomain: boolean;
	dnsChallenge: DnsChallenge;
	/** How far it goes in front of a service, before the request reaches it. */
	authentication: Authentication;
	/**
	 * Serves one machine name on three ports, so a second service goes on a path
	 * rather than an address of its own.
	 */
	servesOneAddress: boolean;
};

/** What Caddy is wherever it runs, the DNS module being the one thing that moves. */
const caddy = {
	family: "caddy",
	hasWebInterface: false,
	hasConfigFile: true,
	readsContainerLabels: false,
	isSetUpWithACommand: false,
	isDependentOnThirdParty: false,
	isHighBandwidthFriendly: true,
	needsDomain: true,
	authentication: "sso",
	servesOneAddress: false,
} as const;

const traefik = {
	family: "traefik",
	hasWebInterface: false,
	hasConfigFile: true,
	readsContainerLabels: true,
	isSetUpWithACommand: false,
	isDependentOnThirdParty: false,
	isHighBandwidthFriendly: true,
	needsDomain: true,
	// lego is compiled in, and every provider it knows with it
	dnsChallenge: "included",
	authentication: "sso",
	servesOneAddress: false,
} as const;

const nginx = {
	family: "nginx",
	hasWebInterface: false,
	hasConfigFile: true,
	readsContainerLabels: false,
	isSetUpWithACommand: false,
	isDependentOnThirdParty: false,
	isHighBandwidthFriendly: true,
	needsDomain: true,
	// Its own ACME module answers over HTTP only, so DNS-01 is certbot's job
	dnsChallenge: "external",
	authentication: "sso",
	servesOneAddress: false,
} as const;

const zoraxy = {
	family: "zoraxy",
	hasWebInterface: true,
	hasConfigFile: false,
	readsContainerLabels: false,
	isSetUpWithACommand: false,
	isDependentOnThirdParty: false,
	isHighBandwidthFriendly: true,
	needsDomain: true,
	// The provider and its credentials are fields in the certificate form
	dnsChallenge: "included",
	authentication: "sso",
	servesOneAddress: false,
} as const;

/**
 * Declaration order breaks ties, simplest first: a beginner with no habit of
 * any of them is better served by a Caddyfile than by a name they don't know,
 * and by a package than by an image to keep building.
 */
const reverseProxies = [
	{
		...caddy,
		slug: "caddy",
		deployment: "native",
		// caddy add-package swaps the binary for one carrying the provider module
		dnsChallenge: "extra-package",
	},
	{
		...caddy,
		slug: "caddy-in-docker",
		deployment: "docker",
		// Nothing to swap inside an image: the module goes in through xcaddy, in
		// a Dockerfile of your own
		dnsChallenge: "custom-build",
	},
	{ ...traefik, slug: "traefik", deployment: "native" },
	{ ...traefik, slug: "traefik-in-docker", deployment: "docker" },
	{
		...caddy,
		slug: "caddy-docker-proxy",
		readsContainerLabels: true,
		deployment: "docker",
		dnsChallenge: "custom-build",
	},
	{
		slug: "nginx-proxy-manager",
		family: "nginx",
		hasWebInterface: true,
		hasConfigFile: false,
		readsContainerLabels: false,
		isSetUpWithACommand: false,
		isDependentOnThirdParty: false,
		deployment: "docker",
		isHighBandwidthFriendly: true,
		needsDomain: true,
		// certbot and its DNS plugins ride along in the image, the provider being
		// picked from a list in the interface
		dnsChallenge: "included",
		authentication: "password",
		servesOneAddress: false,
	},
	{
		// The only web interface that runs outside a container, which is what a
		// spare Windows or Mac machine without Docker is otherwise left without
		...zoraxy,
		slug: "zoraxy",
		deployment: "native",
	},
	{ ...zoraxy, slug: "zoraxy-in-docker", deployment: "docker" },
	{
		// For the nginx habit that wants a config file, which Nginx Proxy Manager
		// does not give
		...nginx,
		slug: "nginx",
		deployment: "native",
	},
	{ ...nginx, slug: "nginx-in-docker", deployment: "docker" },
	{
		slug: "tailscale-funnel",
		family: "tailscale",
		hasWebInterface: false,
		hasConfigFile: false,
		readsContainerLabels: false,
		isSetUpWithACommand: true,
		isDependentOnThirdParty: true,
		// The guide installs the daemon on the machine, funnel being a command
		deployment: "native",
		isHighBandwidthFriendly: false,
		needsDomain: false,
		// The name is Tailscale's to prove, certificate included
		dnsChallenge: "included",
		authentication: "none",
		servesOneAddress: true,
	},
] as const satisfies readonly ReverseProxy[];

export type ReverseProxySlug = (typeof reverseProxies)[number]["slug"];

/** Within reach: nothing to build, and no second tool to run beside it. */
const hasDnsChallenge = (one: ReverseProxy) =>
	one.dnsChallenge === "included" || one.dnsChallenge === "extra-package";

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
		holds: hasDnsChallenge,
		pro: (one) =>
			one.dnsChallenge === "included"
				? "A DNS challenge, so even an unpublished service gets HTTPS"
				: "A DNS challenge, once a command adds your DNS provider's module",
		con: (one) =>
			one.dnsChallenge === "custom-build"
				? "A DNS challenge only from an image of your own, rebuilt at each update"
				: "A DNS challenge only through certbot, a second tool to set up",
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
		holds: (one) => one.deployment === "native",
		con: "Docker has to be there to run it",
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

/** The way out of a fact, kept to the safe side: a guess rules nothing out. */
const dontKnow = "I don't know";

/** The way out of a preference, which takes no side and so rules nothing out. */
const dontMind = "I don't mind";

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
		id: "deployment",
		kind: "preference",
		// Not the same tool twice: where it runs decides what a plugin costs, and
		// half of these only ever ship as a container
		question: "How will you run it?",
		answers: [
			{ label: "In Docker", keep: (p) => p.deployment === "docker" },
			{
				label: "Straight on the machine",
				keep: (p) => p.deployment === "native",
			},
			{ label: dontMind, keep: keepAll },
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
			{ label: dontKnow, keep: (p) => p.isHighBandwidthFriendly },
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
			{ label: dontMind, keep: keepAll },
		],
	},
	{
		id: "own-domain",
		kind: "preference",
		question: "What address should your services answer on?",
		answers: [
			{ label: "A domain name of my own", keep: (p) => p.needsDomain },
			{
				label: "Whatever address I am given",
				keep: (p) => !p.needsDomain,
			},
			{ label: dontMind, keep: keepAll },
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
			{ label: dontMind, keep: keepAll },
		],
	},
] as const satisfies readonly Question<ReverseProxy>[];

/**
 * Nothing left to ask tells these two apart, yet one is plainly worse: it wants
 * an image of your own, or a second tool, where the other has the challenge to
 * hand. Only ever between options serving a domain of yours, the rest getting
 * their certificate from somewhere else entirely.
 */
const worseThan = (candidate: ReverseProxy, other: ReverseProxy) =>
	candidate.needsDomain &&
	other.needsDomain &&
	!hasDnsChallenge(candidate) &&
	hasDnsChallenge(other);

export const reverseProxyQuiz: Quiz<ReverseProxy> = {
	options: reverseProxies,
	questions,
	worseThan,
};

/**
 * Cloudflare is deliberately absent. The orange cloud maps every proxied
 * hostname to one origin address, so something at home still dispatches by Host
 * header: it goes in front of a reverse proxy, it is not one. Tunnel does route
 * hostnames to local services and serves HTTPS itself, so it lives in the remote
 * access quiz and nobody who picks it is sent here. Zero Trust is an
 * authentication layer on top of either.
 */
