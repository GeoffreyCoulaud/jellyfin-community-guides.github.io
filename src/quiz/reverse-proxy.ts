import {
	describe,
	keepAll,
	type Axis,
	type Question,
	type Quiz,
} from "./engine";

type Authentication =
	/** Forward auth to Authelia and the like: one login page for all of them. */
	| "sso"
	/** A password of its own, and nothing to hand a login page over to. */
	| "password";

type DnsChallenge =
	/** A line of configuration: every provider is already in there. */
	| "included"
	/** One command, the module joining the binary it ships with. */
	| "extra-package"
	/** An image of your own to build, and to build again at every update. */
	| "custom-build"
	/** Certbot beside it, a second tool with a configuration of its own. */
	| "external";

type Websockets =
	/** Upgraded on their own, with nothing to say about it anywhere. */
	| "automatic"
	/** A box to tick on the route, in the interface that declared it. */
	| "a-setting"
	/** Headers to write into the route by hand. */
	| "directives";

/**
 * What it takes to shut out the scanners that find any address published for
 * long enough. Two things behind one field: banning whoever keeps failing,
 * which takes something reading the log, and refusing a list of addresses and
 * countries, which does not. Not "directives" like the websockets above: the
 * banning half has no directive in any of these, it is a second daemon.
 */
type AbuseBlocking =
	/** Fail2ban in the image, jails already watching when you start it. */
	| "included"
	/** Addresses, countries and rates, filled in from its own interface. */
	| "a-setting"
	/** Nothing of its own: rules you write, and fail2ban is a tool beside it. */
	| "your-own-rules";

export type ReverseProxy = {
	slug: string;
	/**
	 * The ways the proxy can be told about a service, each a capability and never
	 * a commitment. Between them they have to cover every option, or the question
	 * offering them leaves someone with no answer to give.
	 */
	hasWebInterface: boolean;
	hasConfigFile: boolean;
	readsContainerLabels: boolean;
	/** A capability like the ways above: most ship as a package and as an image. */
	runsNatively: boolean;
	runsInDocker: boolean;
	dnsChallenge: DnsChallenge;
	authentication: Authentication;
	websockets: Websockets;
	abuseBlocking: AbuseBlocking;
};

/** What Caddy is wherever it runs, the DNS module being the one thing that moves. */
const caddy = {
	hasWebInterface: false,
	hasConfigFile: true,
	readsContainerLabels: false,
	authentication: "sso",
	websockets: "automatic",
	abuseBlocking: "your-own-rules",
} as const;

/**
 * Declaration order breaks ties, simplest first: a beginner is better served by
 * a Caddyfile than by a package they don't know, and by a package than by an
 * image to keep building.
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
		// Nothing to swap inside an image: xcaddy, in a Dockerfile of your own
		dnsChallenge: "custom-build",
	},
	{
		slug: "traefik",
		hasWebInterface: false,
		hasConfigFile: true,
		readsContainerLabels: true,
		runsNatively: true,
		runsInDocker: true,
		// lego is compiled in, and every provider it knows with it
		dnsChallenge: "included",
		authentication: "sso",
		websockets: "automatic",
		// RateLimit and IPAllowList are core middlewares, CrowdSec is a plugin
		abuseBlocking: "your-own-rules",
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
		hasWebInterface: true,
		hasConfigFile: false,
		readsContainerLabels: false,
		runsNatively: false,
		runsInDocker: true,
		// certbot and its DNS plugins ride along in the image, the provider being
		// picked from a list in the interface
		dnsChallenge: "included",
		authentication: "password",
		// Unticked by default, and SyncPlay is what breaks until it is ticked
		websockets: "a-setting",
		// Its access lists allow and deny addresses, and nothing reads the log
		abuseBlocking: "your-own-rules",
	},
	{
		slug: "zoraxy",
		hasWebInterface: true,
		hasConfigFile: false,
		readsContainerLabels: false,
		runsNatively: true,
		runsInDocker: true,
		// The provider and its credentials are fields in the certificate form
		dnsChallenge: "included",
		authentication: "sso",
		websockets: "automatic",
		// Addresses, countries and rate limits, all under Access Control
		abuseBlocking: "a-setting",
	},
	{
		slug: "swag",
		hasWebInterface: false,
		hasConfigFile: true,
		readsContainerLabels: false,
		runsNatively: false,
		runsInDocker: true,
		// Certbot and 40-odd DNS plugins ride along in the image
		dnsChallenge: "included",
		// Authelia and Authentik have sample configs, which you still wire up
		authentication: "sso",
		// Its shared proxy.conf carries the headers, so its samples come with them
		websockets: "automatic",
		// Four jails watching the log from the moment it starts
		abuseBlocking: "included",
	},
	{
		// Nginx itself, for a config file with nothing wrapped around it: the
		// certificate is certbot's job, and so is anything watching the logs
		slug: "nginx",
		hasWebInterface: false,
		hasConfigFile: true,
		readsContainerLabels: false,
		runsNatively: true,
		runsInDocker: true,
		// Its own ACME module answers over HTTP only, so DNS-01 is certbot's job
		dnsChallenge: "external",
		authentication: "sso",
		// proxy_http_version, Upgrade and Connection, on every route you write
		websockets: "directives",
		// limit_req and deny are built in, fail2ban is a daemon beside it
		abuseBlocking: "your-own-rules",
	},
] as const satisfies readonly ReverseProxy[];

export type ReverseProxySlug = (typeof reverseProxies)[number]["slug"];

/** Within reach: nothing to build, and no second tool to run beside it. */
const hasDnsChallenge = (one: ReverseProxy) =>
	one.dnsChallenge === "included" || one.dnsChallenge === "extra-package";

/** Written without knowing what was asked: a description, not a summary. */
const axes: readonly Axis<ReverseProxy>[] = [
	{
		id: "dns-challenge",
		// Named by the way it proves a name rather than by one of the two things
		// that buys, since it buys both: a certificate for a name the internet
		// cannot reach, and one covering every subdomain at once. The questions
		// ask after each of those; the card has room for neither spelled out.
		holds: hasDnsChallenge,
		pro: "Certificates through your DNS provider",
		con: (one) =>
			one.dnsChallenge === "custom-build"
				? "DNS certificates need a Docker image you build yourself"
				: "DNS certificates need certbot set up beside it",
	},
	{
		// What it answers for: handing a service to a login page, never the
		// service behind taking that page's word for who is there
		id: "single-sign-on",
		holds: (one) => one.authentication === "sso",
		pro: "Can hand any service to one login page",
		con: "Only a password of its own, service by service",
	},
	{
		id: "websockets",
		holds: (one) => one.websockets === "automatic",
		pro: "Jellyfin sessions work with nothing added",
		con: (one) =>
			one.websockets === "a-setting"
				? "Jellyfin sessions need a box ticked for websockets"
				: "Jellyfin sessions need websocket headers written in",
	},
	{
		// No question asks after this one. Asked cold it landed second every time,
		// on a choice nobody can weigh before there is a result to weigh it
		// against, so it is a con to refuse off a card instead.
		id: "abuse-blocking",
		holds: (one) => one.abuseBlocking !== "your-own-rules",
		pro: (one) =>
			one.abuseBlocking === "included"
				? "Bans anyone who keeps getting the password wrong"
				: "Blocks addresses and countries from its interface",
		con: "Blocking bad clients takes rules of your own, or another tool",
	},
	{
		id: "web-interface",
		holds: (one) => one.hasWebInterface,
		pro: "Has a visual interface",
		con: "No visual interface",
	},
	{
		id: "versionable",
		// A web interface is not the better way of the two, only the other one:
		// what a file and a label have over it is being text of yours. Worded as
		// the question about it is worded, rather than as "declarative".
		applies: (one) => one.hasWebInterface,
		holds: (one) => one.hasConfigFile || one.readsContainerLabels,
		con: "Its setup lives in a database, not in files you keep",
	},
	{
		id: "config-file",
		holds: (one) => one.hasConfigFile,
		pro: "Routes can be declared in a config file",
	},
	{
		id: "container-labels",
		holds: (one) => one.readsContainerLabels,
		pro: "Routes can be declared with container labels",
	},
	{
		id: "needs-docker",
		holds: (one) => one.runsNatively,
		con: "Only runs in Docker",
	},
];

export const traits = (proxy: ReverseProxy) => describe(proxy, axes);

const dontKnow = "I don't know";
const dontMind = "I don't mind";

const questions = [
	{
		id: "deployment",
		kind: "preference",
		question: "How do you want to run your reverse proxy?",
		answers: [
			{ id: "docker", label: "In Docker", keep: (p) => p.runsInDocker },
			{ id: "native", label: "Straight on the machine", keep: (p) => p.runsNatively },
			{ id: "no-preference", label: dontMind, keep: keepAll },
		],
	},
	{
		id: "exposure",
		kind: "fact",
		asksFirst: true,
		question: "Will you expose services to the open internet?",
		help: "Exposed: anyone with the link reaches it, without joining your network first.",
		answers: [
			{ id: "all", label: "Yes, all of them", keep: keepAll },
			{ id: "some", label: "Yes, some of them", keep: hasDnsChallenge },
			{ id: "none", label: "No, only people I let in reach them", keep: hasDnsChallenge },
			{ id: "unknown", label: dontKnow, keep: hasDnsChallenge },
		],
	},
	{
		id: "public-names",
		kind: "preference",
		question: "Should the names of your services stay out of public records?",
		help: "Every certificate is listed in a public register, so one per service publishes each name. One certificate for the whole domain publishes none.",
		answers: [
			{ id: "yes", label: "Yes", keep: hasDnsChallenge },
			{ id: "no", label: "No, I'm fine exposing which services I host", keep: keepAll },
		],
	},
	{
		id: "extra-authentication",
		kind: "preference",
		question: "Do you want to be able to add a login in front of your services?",
		help: "One shared login means a tool like Authelia in front. A services still shows its own login page unless it explicitly integrates with the tool.",
		answers: [
			{
				id: "shared-login",
				label: "Yes, a single login to access any service",
				keep: (p) => p.authentication === "sso",
			},
			{
				id: "per-service",
				label: "Yes, a password per service is enough",
				keep: keepAll,
			},
			{ id: "no", label: "No", keep: keepAll },
			{ id: "unknown", label: dontKnow, keep: (p) => p.authentication === "sso" },
		],
	},
	{
		id: "declarative",
		kind: "preference",
		question: "Should your setup be files you can keep and copy?",
		help: "A file is text: you can back it up, keep its history, and rebuild it elsewhere.",
		answers: [
			{
				id: "yes",
				label: "Yes",
				keep: (p) => p.hasConfigFile || p.readsContainerLabels,
			},
			{
				id: "no",
				label: "No, clicking through an interface is fine",
				keep: keepAll,
			},
		],
	},
	{
		id: "how-to-add-a-service",
		kind: "preference",
		question: "How do you want to add routes to services?",
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
				label: "On the service container, as a label",
				keep: (p) => p.readsContainerLabels,
			},
			{ id: "no-preference", label: dontMind, keep: keepAll },
		],
	},
] as const satisfies readonly Question<ReverseProxy>[];

export const reverseProxyQuiz: Quiz<ReverseProxy> = {
	options: reverseProxies,
	questions,
};

export type ExtraGuide = "harden-reverse-proxy";

export const extraGuides = (proxy: ReverseProxy): ExtraGuide[] =>
	proxy.abuseBlocking !== "included" ? ["harden-reverse-proxy"] : [];

/**
 * Cloudflare is deliberately absent. The orange cloud maps every proxied
 * hostname to one origin address, so something at home still dispatches by Host
 * header: it goes in front of a reverse proxy, it is not one. Tunnel is in the
 * remote access quiz, and Zero Trust is an authentication layer on top of either.
 */
