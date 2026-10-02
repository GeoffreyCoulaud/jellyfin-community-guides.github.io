import {
	type Axis,
	type Link,
	matchesAll,
	type Question,
	type Quiz,
} from "./engine";
import { logo } from "./icons";

/** "sso": can hand requests to a login page such as Authelia (forward auth). */
type Authentication = "sso" | "password";

type DnsChallenge =
	/** Every provider is already in there: one line of configuration. */
	| "included"
	/** One command adds the provider module to the binary. */
	| "extra-package"
	/** An image of your own to build, again at every update. */
	| "custom-build"
	/** Certbot beside it, a second tool to configure. */
	| "external";

type Websockets =
	| "automatic"
	/** A box to tick on the route. */
	| "a-setting"
	/** Headers to write into the route by hand. */
	| "directives";

type AutomaticBans =
	/** Fail2ban in the image, jails already watching. */
	| "included"
	/** Fail2ban or CrowdSec beside it. */
	| "external";

type Geoblocking =
	/** Countries ticked in its interface. */
	| "a-setting"
	/** A line of configuration. */
	| "included"
	/** A plugin or package to add first. */
	| "extra-module"
	/** An image of your own to build, again at every update. */
	| "custom-build"
	/** Only addresses, no countries. */
	| "none";

/** One tool in one deployment, since the deployment changes what it can do. */
export type ReverseProxy = {
	slug: string;
	title: string;
	href: string;
	icon: string;
	// The ways routes can be declared: between them they cover every option
	hasWebInterface: boolean;
	hasConfigFile: boolean;
	readsContainerLabels: boolean;
	runsNatively: boolean;
	runsInDocker: boolean;
	dnsChallenge: DnsChallenge;
	authentication: Authentication;
	websockets: Websockets;
	automaticBans: AutomaticBans;
	geoblocking: Geoblocking;
};

const caddy = {
	icon: logo("caddy"),
	hasWebInterface: false,
	hasConfigFile: true,
	readsContainerLabels: false,
	authentication: "sso",
	websockets: "automatic",
	automaticBans: "external",
} as const;

const nginx = {
	title: "Nginx",
	icon: logo("nginx"),
	hasWebInterface: false,
	hasConfigFile: true,
	readsContainerLabels: false,
	// Its own ACME module only does HTTP-01, so DNS-01 is certbot's job
	dnsChallenge: "external",
	authentication: "sso",
	// proxy_http_version, Upgrade and Connection, on every route
	websockets: "directives",
	// limit_req and deny are built in, but nothing reads the logs
	automaticBans: "external",
} as const;

/** Declaration order breaks ties, simplest first. */
const reverseProxies = [
	{
		...caddy,
		slug: "caddy",
		title: "Caddy",
		href: "/guides/reverse-proxy/caddy/#native",
		runsNatively: true,
		runsInDocker: false,
		// caddy add-package swaps in a binary with the provider module
		dnsChallenge: "extra-package",
		// caddy-maxmind-geolocation, added the same way
		geoblocking: "extra-module",
	},
	{
		// No official image carries the DNS modules
		...caddy,
		slug: "caddy-in-docker",
		title: "Caddy in Docker",
		href: "/guides/reverse-proxy/caddy/#in-docker",
		runsNatively: false,
		runsInDocker: true,
		// xcaddy, in a Dockerfile of your own
		dnsChallenge: "custom-build",
		geoblocking: "custom-build",
	},
	{
		slug: "traefik",
		title: "Traefik",
		href: "/guides/reverse-proxy/traefik/",
		icon: logo("traefik"),
		hasWebInterface: false,
		hasConfigFile: true,
		readsContainerLabels: true,
		runsNatively: true,
		runsInDocker: true,
		// lego is compiled in, with every provider it knows
		dnsChallenge: "included",
		authentication: "sso",
		websockets: "automatic",
		// CrowdSec is a plugin, but its engine still runs beside it
		automaticBans: "external",
		// A plugin, named in the static configuration
		geoblocking: "extra-module",
	},
	{
		...caddy,
		slug: "caddy-docker-proxy",
		title: "Caddy Docker Proxy",
		href: "/guides/reverse-proxy/caddy-docker-proxy/",
		readsContainerLabels: true,
		runsNatively: false,
		runsInDocker: true,
		dnsChallenge: "custom-build",
		geoblocking: "custom-build",
	},
	{
		slug: "nginx-proxy-manager",
		title: "Nginx Proxy Manager",
		href: "/guides/reverse-proxy/nginx-proxy-manager/",
		icon: logo("nginx-proxy-manager"),
		hasWebInterface: true,
		hasConfigFile: false,
		readsContainerLabels: false,
		runsNatively: false,
		runsInDocker: true,
		// Certbot and its DNS plugins are in the image, the provider a dropdown
		dnsChallenge: "included",
		authentication: "password",
		// Unticked by default, which breaks SyncPlay
		websockets: "a-setting",
		automaticBans: "external",
		geoblocking: "none",
	},
	{
		slug: "zoraxy",
		title: "Zoraxy",
		href: "/guides/reverse-proxy/zoraxy/",
		icon: logo("zoraxy"),
		hasWebInterface: true,
		hasConfigFile: false,
		readsContainerLabels: false,
		runsNatively: true,
		runsInDocker: true,
		dnsChallenge: "included",
		authentication: "sso",
		websockets: "automatic",
		// Its access control blocks and rate limits, but reads no log
		automaticBans: "external",
		// Off a database it ships with
		geoblocking: "a-setting",
	},
	{
		slug: "swag",
		title: "SWAG",
		href: "/guides/reverse-proxy/swag/",
		// SWAG has no logo of its own, LinuxServer.io publishes it
		icon: logo("linuxserver-io"),
		hasWebInterface: false,
		hasConfigFile: true,
		readsContainerLabels: false,
		runsNatively: false,
		runsInDocker: true,
		// Certbot and 40-odd DNS plugins are in the image
		dnsChallenge: "included",
		// Authelia and Authentik have sample configs to wire up
		authentication: "sso",
		// Its shared proxy.conf carries the headers
		websockets: "automatic",
		// Four jails watching the logs from the start
		automaticBans: "included",
		// The geoip2 module is in the image too
		geoblocking: "included",
	},
	{
		...nginx,
		slug: "nginx",
		href: "/guides/reverse-proxy/nginx/#native",
		runsNatively: true,
		runsInDocker: false,
		// Distributions package the geoip2 module
		geoblocking: "extra-module",
	},
	{
		...nginx,
		slug: "nginx-in-docker",
		title: "Nginx in Docker",
		href: "/guides/reverse-proxy/nginx/#in-docker",
		runsNatively: false,
		runsInDocker: true,
		// A module must be compiled against the exact build it loads into
		geoblocking: "custom-build",
	},
] as const satisfies readonly ReverseProxy[];

/** Within reach: nothing to build, no second tool beside it. */
const hasDnsChallenge = (proxy: ReverseProxy) =>
	proxy.dnsChallenge === "included" || proxy.dnsChallenge === "extra-package";

const hasGeoblocking = (proxy: ReverseProxy) =>
	proxy.geoblocking !== "custom-build" && proxy.geoblocking !== "none";

const hasSingleSignOn = (proxy: ReverseProxy) => proxy.authentication === "sso";

const axes: readonly Axis<ReverseProxy>[] = [
	{
		// Buys both a certificate for a private name and one for every subdomain
		id: "dns-challenge",
		holds: hasDnsChallenge,
		pro: "Certificates through your DNS provider",
		con: (proxy) =>
			proxy.dnsChallenge === "custom-build"
				? "DNS certificates need a Docker image you build yourself"
				: "DNS certificates need certbot set up beside it",
	},
	{
		id: "single-sign-on",
		holds: hasSingleSignOn,
		pro: "Can hand any service to one login page",
		con: "Only a password of its own, service by service",
	},
	{
		id: "websockets",
		holds: (proxy) => proxy.websockets === "automatic",
		pro: "Jellyfin sessions work with nothing added",
		con: (proxy) =>
			proxy.websockets === "a-setting"
				? "Jellyfin sessions need a box ticked for websockets"
				: "Jellyfin sessions need websocket headers written in",
	},
	{
		// No question for this one or the next: nobody can weigh them before a result
		id: "automatic-bans",
		holds: (proxy) => proxy.automaticBans === "included",
		pro: "Can ban anyone who keeps getting the password wrong",
		con: "Banning repeat offenders takes fail2ban run beside it",
	},
	{
		id: "geoblocking",
		holds: hasGeoblocking,
		pro: "Can block whole countries, not just addresses",
		con: (proxy) =>
			proxy.geoblocking === "custom-build"
				? "Blocking countries needs a Docker image you build yourself"
				: "No way to block a country, only addresses",
	},
	{
		id: "web-interface",
		holds: (proxy) => proxy.hasWebInterface,
		pro: "Has a visual interface",
		con: "No visual interface",
	},
	{
		id: "versionable",
		applies: (proxy) => proxy.hasWebInterface,
		holds: (proxy) => proxy.hasConfigFile || proxy.readsContainerLabels,
		con: "Its setup lives in a database, not in files you keep",
	},
	{
		id: "config-file",
		holds: (proxy) => proxy.hasConfigFile,
		pro: "Routes can be declared in a config file",
	},
	{
		id: "container-labels",
		holds: (proxy) => proxy.readsContainerLabels,
		pro: "Routes can be declared with container labels",
	},
	{
		id: "needs-docker",
		holds: (proxy) => proxy.runsNatively,
		con: "Only runs in Docker",
	},
];

const dontMind = "I don't mind";

const questions = [
	{
		id: "deployment",
		kind: "preference",
		question: "How do you want to run your reverse proxy?",
		answers: [
			{
				id: "docker",
				label: "In Docker",
				matches: (proxy) => proxy.runsInDocker,
			},
			{
				id: "native",
				label: "Straight on the machine",
				matches: (proxy) => proxy.runsNatively,
			},
			{ id: "no-preference", label: dontMind, matches: matchesAll },
		],
	},
	{
		id: "exposure",
		kind: "fact",
		asksFirst: true,
		question: "Will all your services be reachable from the open internet?",
		help: "Reachable: anyone with the link gets there, without joining your network first.",
		answers: [
			{ id: "all", label: "Yes, all of them", matches: matchesAll },
			// A private name only gets a certificate through the DNS challenge
			{
				id: "not-all",
				label: "No, or I'm not sure",
				matches: hasDnsChallenge,
			},
		],
	},
	{
		id: "public-names",
		kind: "preference",
		question: "Should the names of your services stay out of public records?",
		help: "Every certificate is listed in a public register, so one per service publishes each name. One certificate for the whole domain publishes none.",
		answers: [
			{ id: "yes", label: "Yes", matches: hasDnsChallenge },
			{
				id: "no",
				label: "No, I'm fine exposing which services I host",
				matches: matchesAll,
			},
		],
	},
	{
		id: "extra-authentication",
		kind: "preference",
		question:
			"Do you want to be able to add a login in front of your services?",
		help: "One shared login means a tool like Authelia in front. A service still shows its own login page unless it integrates with that tool.",
		answers: [
			{
				id: "shared-login",
				label: "Yes, a single login for every service / I don't know",
				matches: hasSingleSignOn,
			},
			{
				id: "no",
				label: "No / a password per service is enough",
				matches: matchesAll,
			},
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
				matches: (proxy) => proxy.hasConfigFile || proxy.readsContainerLabels,
			},
			{
				id: "no",
				label: "No, clicking through an interface is fine",
				matches: matchesAll,
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
				matches: (proxy) => proxy.hasWebInterface,
			},
			{
				id: "config-file",
				label: "In a config file",
				matches: (proxy) => proxy.hasConfigFile,
			},
			{
				id: "container-label",
				label: "On the service container, as a label",
				matches: (proxy) => proxy.readsContainerLabels,
			},
			{ id: "no-preference", label: dontMind, matches: matchesAll },
		],
	},
] as const satisfies readonly Question<ReverseProxy>[];

const nextReads = (proxy: ReverseProxy): Link[] =>
	proxy.automaticBans === "included"
		? []
		: [
				{
					title: "Harden your reverse proxy",
					href: "/reference/harden-reverse-proxy/",
				},
			];

// No Cloudflare: its proxy still needs something at home dispatching by Host header
export const reverseProxyQuiz: Quiz<ReverseProxy> = {
	options: reverseProxies,
	questions,
	axes,
	nextReads,
};
