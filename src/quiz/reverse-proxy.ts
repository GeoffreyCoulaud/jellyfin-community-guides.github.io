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
	 * Where it can run, a capability like the ways above and not a commitment:
	 * most of these ship as a package and as an image both, and one option
	 * covers the two.
	 */
	runsNatively: boolean;
	runsInDocker: boolean;
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

/**
 * Declaration order breaks ties, simplest first: a beginner with no habit of
 * any of them is better served by a Caddyfile than by a name they don't know,
 * and by a package than by an image to keep building.
 */
const reverseProxies = [
	{
		...caddy,
		slug: "caddy",
		runsNatively: true,
		runsInDocker: false,
		// caddy add-package swaps the binary for one carrying the provider module
		dnsChallenge: "extra-package",
	},
	{
		// The one tool where running it in Docker changes what you get: the DNS
		// module is compiled in, and no official image carries one
		...caddy,
		slug: "caddy-in-docker",
		runsNatively: false,
		runsInDocker: true,
		// Nothing to swap inside an image: the module goes in through xcaddy, in
		// a Dockerfile of your own
		dnsChallenge: "custom-build",
	},
	{
		slug: "traefik",
		family: "traefik",
		hasWebInterface: false,
		hasConfigFile: true,
		readsContainerLabels: true,
		isSetUpWithACommand: false,
		isDependentOnThirdParty: false,
		runsNatively: true,
		runsInDocker: true,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		// lego is compiled in, and every provider it knows with it
		dnsChallenge: "included",
		authentication: "sso",
		servesOneAddress: false,
	},
	{
		...caddy,
		slug: "caddy-docker-proxy",
		readsContainerLabels: true,
		runsNatively: false,
		runsInDocker: true,
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
		runsNatively: false,
		runsInDocker: true,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		// certbot and its DNS plugins ride along in the image, the provider being
		// picked from a list in the interface
		dnsChallenge: "included",
		authentication: "password",
		servesOneAddress: false,
	},
	{
		// The only web interface that can run outside a container, which is what
		// a spare Windows or Mac machine without Docker is otherwise left without
		slug: "zoraxy",
		family: "zoraxy",
		hasWebInterface: true,
		hasConfigFile: false,
		readsContainerLabels: false,
		isSetUpWithACommand: false,
		isDependentOnThirdParty: false,
		runsNatively: true,
		runsInDocker: true,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		// The provider and its credentials are fields in the certificate form
		dnsChallenge: "included",
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
		runsNatively: true,
		runsInDocker: true,
		isHighBandwidthFriendly: true,
		needsDomain: true,
		// Its own ACME module answers over HTTP only, so DNS-01 is certbot's job
		dnsChallenge: "external",
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
		// The guide installs the daemon on the machine, funnel being a command
		runsNatively: true,
		runsInDocker: false,
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
		id: "high-bandwidth",
		holds: (one) => one.isHighBandwidthFriendly,
		pro: "Streams video without complaint",
		con: "Streaming video goes against its terms",
	},
	{
		id: "third-party",
		holds: (one) => !one.isDependentOnThirdParty,
		pro: "Traffic goes straight from your server",
		con: "Your traffic goes through a company's servers",
	},
	{
		id: "own-domain",
		holds: (one) => !one.needsDomain,
		pro: "No domain to buy",
		con: "A domain name of your own",
	},
	{
		id: "dns-challenge",
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
		id: "single-sign-on",
		// Funnel publishes, full stop: there is no gate to put in front of it
		applies: (one) => one.authentication !== "none",
		holds: (one) => one.authentication === "sso",
		pro: "One login in front of every service, with Authelia or the like",
		con: "A password per service, and no single login for all of them",
	},
	{
		id: "authentication",
		// Not open to everyone, the service still has its own accounts: the con is
		// that they are the only gate, and few services treat that as their job
		holds: (one) => one.authentication !== "none",
		con: "Nothing in front: each service is left to guard itself",
	},
	{
		id: "web-interface",
		holds: (one) => one.hasWebInterface,
		pro: "Services are added in a web interface",
	},
	{
		id: "versionable",
		// A web interface is not the better way of the two, only the other one:
		// what a file and a label have over it is being text of yours
		applies: (one) => one.hasWebInterface,
		holds: (one) => one.hasConfigFile || one.readsContainerLabels,
		con: "Its routes live in a store of its own, nothing to keep in git",
	},
	{
		id: "config-file",
		holds: (one) => one.hasConfigFile,
		pro: "Services are added in a config file, which you can version",
	},
	{
		id: "container-labels",
		holds: (one) => one.readsContainerLabels,
		pro: "A container carries its own route, next to the service itself",
	},
	{
		id: "needs-docker",
		holds: (one) => one.runsNatively,
		con: "Docker has to be there to run it",
	},
	{
		id: "one-command",
		holds: (one) => one.isSetUpWithACommand,
		pro: "One command per service, nothing to edit",
	},
	{
		id: "own-address",
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
			{
				id: "none",
				label: "None, or I'd rather start fresh",
				keep: keepAll,
			},
			{ id: "caddy", label: "Caddy", keep: (p) => p.family === "caddy" },
			{
				id: "traefik",
				label: "Traefik",
				keep: (p) => p.family === "traefik",
			},
			{ id: "nginx", label: "Nginx", keep: (p) => p.family === "nginx" },
			{
				id: "zoraxy",
				label: "Zoraxy",
				keep: (p) => p.family === "zoraxy",
			},
			{
				id: "tailscale",
				label: "Tailscale",
				keep: (p) => p.family === "tailscale",
			},
		],
	},
	{
		id: "deployment",
		kind: "preference",
		// Rules out only the ones that ship one way: the tools running either
		// way stay on the table whichever answer comes back
		question: "How will you run it?",
		answers: [
			{
				id: "docker",
				label: "In Docker",
				keep: (p) => p.runsInDocker,
			},
			{
				id: "native",
				label: "Straight on the machine",
				keep: (p) => p.runsNatively,
			},
			{ id: "no-preference", label: dontMind, keep: keepAll },
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
			{ id: "yes", label: "Yes", keep: (p) => p.isHighBandwidthFriendly },
			{ id: "no", label: "No", keep: keepAll },
			{
				id: "unknown",
				label: dontKnow,
				keep: (p) => p.isHighBandwidthFriendly,
			},
		],
	},
	{
		id: "open-internet",
		kind: "fact",
		// Asked only where it decides something: a pool where every option has
		// the DNS challenge to hand is one the engine never brings this to
		question: "Will all your services be reachable from the open internet?",
		help: "Reachable means anyone can open its address in a browser, with nothing to install first. One that only answers at home, or once a VPN app is running, is not.",
		answers: [
			// HTTP-01 answers on the name itself, which is enough for all of them
			{ id: "yes", label: "Yes", keep: keepAll },
			{ id: "no", label: "No", keep: hasDnsChallenge },
			{ id: "unknown", label: dontKnow, keep: hasDnsChallenge },
		],
	},
	{
		id: "third-party",
		kind: "preference",
		question: "Where should your traffic go?",
		answers: [
			{
				id: "third-party",
				label: "Through a company's servers, one less thing to run",
				keep: (p) => p.isDependentOnThirdParty,
			},
			{
				id: "direct",
				label: "Straight from my server to my users",
				keep: (p) => !p.isDependentOnThirdParty,
			},
			{ id: "no-preference", label: dontMind, keep: keepAll },
		],
	},
	{
		id: "own-domain",
		kind: "preference",
		question: "What address should your services answer on?",
		answers: [
			{
				id: "own-domain",
				label: "A domain name of my own",
				keep: (p) => p.needsDomain,
			},
			{
				id: "given-address",
				label: "Whatever address I am given",
				keep: (p) => !p.needsDomain,
			},
			{ id: "no-preference", label: dontMind, keep: keepAll },
		],
	},
	{
		id: "how-to-add-a-service",
		kind: "preference",
		question: "How do you want to add a service?",
		answers: [
			{
				id: "web-interface",
				label: "In a web interface",
				keep: (p) => p.hasWebInterface,
			},
			{
				id: "config-file",
				label: "In a config file",
				keep: (p) => p.hasConfigFile,
			},
			{
				id: "container-label",
				label: "On the container, as a label",
				keep: (p) => p.readsContainerLabels,
			},
			{
				id: "one-command",
				label: "With one command",
				keep: (p) => p.isSetUpWithACommand,
			},
			{ id: "no-preference", label: dontMind, keep: keepAll },
		],
	},
] as const satisfies readonly Question<ReverseProxy>[];

/**
 * No `worseThan` here. What an image of your own costs is only worth anything
 * against a service the internet cannot reach, and whether the reader has one
 * is a question, not a guess: ruling the option out before asking sends home
 * whoever opened a port and never needed the DNS challenge at all.
 */
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
