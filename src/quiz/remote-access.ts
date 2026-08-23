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

type Money = { amount: number; currency: "EUR" | "USD" };

/**
 * What the method needs from your home network to let connections in.
 * "nothing" covers tunnels and overlay networks: your server dials out, so
 * nothing at home has to be reachable from the outside.
 */
type HomeNetworkRequirement = "nothing" | "forwarded-port" | "public-ipv6";

/** Concrete work on your machines, so the effort question isn't a judgement call. */
type SetupStep =
	| "install-package"
	| "docker-compose"
	| "edit-config-file"
	| "per-user-key-exchange";

/**
 * One plan of one method: a provider selling several is several options, so
 * that limits and price are plain numbers instead of tiers to unfold.
 */
export type Method = {
	slug: string;
	/** Reachable from the internet: a link, a browser, nothing to install. */
	servesPublicServices: boolean;
	/** Reachable only once the device joined your network with a client. */
	servesPrivateServices: boolean;
	/** Serves the public ones over HTTPS itself, so no reverse proxy to pick. */
	handlesTlsForPublicServices: boolean;
	/**
	 * Services that never leave the private network still get a real HTTPS name.
	 * Rare: NetBird has it as an open request, headscale would need Tailscale's
	 * own certificate infrastructure, and Pangolin keeps it for its EE build.
	 */
	handlesTlsForPrivateServices: boolean;
	/**
	 * Every service at home is reachable, even the ones you never published.
	 * Not pruned on: read off the resolved method to pick extra guides. What the
	 * guide sets up by default, since routes and ACLs can narrow it down.
	 */
	reachesEveryLocalService: boolean;
	/** Coordination or traffic goes through a service you don't run. */
	isDependentOnThirdParty: boolean;
	/** A VPS you have to rent and run, on top of the server at home. */
	needsYourOwnRemoteMachine: boolean;
	homeNetworkRequirement: HomeNetworkRequirement;
	/** No bandwidth cap or terms of service getting in the way of video. */
	isHighBandwidthFriendly: boolean;
	hasProprietaryComponent: boolean;
	/**
	 * Users reach the services by name, with no raw IP address to remember.
	 * Not pruned on: a DNS zone gets any method there, so it picks up a guide
	 * instead of ruling anything out.
	 */
	hasBuiltInNameResolution: boolean;
	/** Users, devices and routes are managed in a browser, not on a terminal. */
	hasWebInterface: boolean;
	/** How many people this plan serves. null: no limit. */
	maxUsers: number | null;
	/** How many connected devices this plan serves. null: no limit. */
	maxDevices: number | null;
	/** What it costs every month. null: free. */
	price: (Money & { per: "user" | "device" }) | null;
	setupSteps: readonly SetupStep[];
	/** Not pruned on, read off the resolved method to pick extra guides. */
	needsDomain: boolean;
};

/** Self hosted: no seat to buy, no cap to hit. */
const unlimitedAndFree = {
	maxUsers: null,
	maxDevices: null,
	price: null,
} as const;

/** Shared by every plan of a provider, so its variants only carry the numbers. */
const tailscale = {
	servesPublicServices: false,
	servesPrivateServices: true,
	reachesEveryLocalService: true,
	// Funnel could publish one, but the guide sets up the tailnet, not a website
	handlesTlsForPublicServices: false,
	// tailscale serve, on the tailnet name, certificate included
	handlesTlsForPrivateServices: true,
	isDependentOnThirdParty: true,
	needsYourOwnRemoteMachine: false,
	homeNetworkRequirement: "nothing",
	isHighBandwidthFriendly: true,
	hasProprietaryComponent: true,
	hasBuiltInNameResolution: true,
	hasWebInterface: true,
	setupSteps: ["install-package"],
	needsDomain: false,
} as const;

const netbirdCloud = {
	servesPublicServices: false,
	servesPrivateServices: true,
	reachesEveryLocalService: true,
	// The reverse proxy that would publish one is a separate, beta feature
	handlesTlsForPublicServices: false,
	handlesTlsForPrivateServices: false,
	isDependentOnThirdParty: true,
	needsYourOwnRemoteMachine: false,
	homeNetworkRequirement: "nothing",
	isHighBandwidthFriendly: true,
	hasProprietaryComponent: false,
	hasBuiltInNameResolution: true,
	hasWebInterface: true,
	setupSteps: ["install-package"],
	needsDomain: false,
} as const;

const zerotier = {
	servesPublicServices: false,
	servesPrivateServices: true,
	reachesEveryLocalService: true,
	handlesTlsForPublicServices: false,
	handlesTlsForPrivateServices: false,
	isDependentOnThirdParty: true,
	needsYourOwnRemoteMachine: false,
	homeNetworkRequirement: "nothing",
	isHighBandwidthFriendly: true,
	hasProprietaryComponent: true,
	hasBuiltInNameResolution: false,
	hasWebInterface: true,
	setupSteps: ["install-package"],
	needsDomain: false,
} as const;

/**
 * Reverse proxy for the services you publish, VPN for the ones you don't, so
 * both editions answer the "how do users connect" question with "either way".
 */
const pangolin = {
	...unlimitedAndFree,
	servesPublicServices: true,
	servesPrivateServices: true,
	// Access is declared resource by resource, so nothing comes for free
	reachesEveryLocalService: false,
	handlesTlsForPublicServices: true,
	isHighBandwidthFriendly: true,
	hasBuiltInNameResolution: true,
	hasWebInterface: true,
	setupSteps: ["docker-compose"],
	needsDomain: true,
} as const;

/** AGPL, no key to activate, but private resources stay on plain HTTP. */
const pangolinCe = {
	...pangolin,
	isDependentOnThirdParty: false,
	hasProprietaryComponent: false,
	handlesTlsForPrivateServices: false,
} as const;

/** Free under a revenue threshold, at the price of a key checked against Fossorial. */
const pangolinEe = {
	...pangolin,
	isDependentOnThirdParty: true,
	hasProprietaryComponent: true,
	handlesTlsForPrivateServices: true,
} as const;

const onAVps = {
	needsYourOwnRemoteMachine: true,
	homeNetworkRequirement: "nothing",
} as const;

/** Without a VPS to tunnel out to, clients have to reach your router. */
const atHome = {
	needsYourOwnRemoteMachine: false,
	homeNetworkRequirement: "forwarded-port",
} as const;

/** Declaration order breaks ties: the first one is the safer default. */
const methods = [
	{
		...unlimitedAndFree,
		slug: "port-forward",
		servesPublicServices: true,
		servesPrivateServices: false,
		reachesEveryLocalService: false,
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: false,
		homeNetworkRequirement: "forwarded-port",
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: true,
		hasWebInterface: false,
		// Serving the services themselves is the reverse proxy quiz's job
		setupSteps: [],
		needsDomain: true,
	},
	{
		...unlimitedAndFree,
		// Declared after port-forward on purpose: half of the internet still
		// reaches servers over IPv4, so it never wins a tie against it.
		slug: "ipv6",
		servesPublicServices: true,
		servesPrivateServices: false,
		reachesEveryLocalService: false,
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: false,
		// CGNAT is an IPv4 problem, a public IPv6 goes around it entirely
		homeNetworkRequirement: "public-ipv6",
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: true,
		hasWebInterface: false,
		setupSteps: [],
		needsDomain: true,
	},
	{
		...unlimitedAndFree,
		slug: "vps-plus-tunnel",
		servesPublicServices: true,
		servesPrivateServices: false,
		reachesEveryLocalService: false,
		// The VPS terminates TLS, but which reverse proxy runs there is your call
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: true,
		homeNetworkRequirement: "nothing",
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: true,
		hasWebInterface: false,
		setupSteps: ["install-package", "edit-config-file"],
		needsDomain: true,
	},
	{
		...unlimitedAndFree,
		slug: "wireguard",
		servesPublicServices: false,
		servesPrivateServices: true,
		reachesEveryLocalService: true,
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: false,
		homeNetworkRequirement: "forwarded-port",
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: false,
		hasWebInterface: false,
		setupSteps: ["install-package", "edit-config-file", "per-user-key-exchange"],
		needsDomain: false,
	},
	{
		...tailscale,
		slug: "tailscale-free",
		maxUsers: 6,
		// User devices are unlimited, only tagged resources are capped
		maxDevices: null,
		price: null,
	},
	{
		...tailscale,
		slug: "tailscale-standard",
		maxUsers: null,
		maxDevices: null,
		price: { amount: 8, currency: "USD", per: "user" },
	},
	{
		...unlimitedAndFree,
		slug: "headscale",
		servesPublicServices: false,
		servesPrivateServices: true,
		reachesEveryLocalService: true,
		// No serve or funnel: both need the ACME and relay infrastructure that
		// Tailscale runs, which headscale has no way to stand in for.
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: true,
		homeNetworkRequirement: "nothing",
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: true,
		// Third party ones exist, the project itself is a command line
		hasWebInterface: false,
		setupSteps: ["docker-compose", "edit-config-file"],
		needsDomain: true,
	},
	{
		...netbirdCloud,
		slug: "netbird-cloud-free",
		maxUsers: 5,
		maxDevices: 100,
		price: null,
	},
	{
		...netbirdCloud,
		slug: "netbird-cloud-team",
		maxUsers: null,
		// 100 machines plus 10 per user are included, extra ones are 0.50 EUR
		maxDevices: null,
		price: { amount: 6, currency: "EUR", per: "user" },
	},
	{
		...unlimitedAndFree,
		slug: "netbird-ce-on-vps",
		servesPublicServices: false,
		servesPrivateServices: true,
		reachesEveryLocalService: true,
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: true,
		homeNetworkRequirement: "nothing",
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: true,
		hasWebInterface: true,
		setupSteps: ["docker-compose", "edit-config-file"],
		needsDomain: true,
	},
	{
		...zerotier,
		slug: "zerotier-free",
		// ZeroTier sells devices, not seats: anyone may join the network
		maxUsers: null,
		maxDevices: 10,
		price: null,
	},
	{
		...zerotier,
		slug: "zerotier-essential",
		maxUsers: null,
		maxDevices: null,
		// Essential opens at 18 USD for ten devices, then charges for each one
		// on top: only that marginal price is modelled here.
		price: { amount: 2, currency: "USD", per: "device" },
	},
	{
		...unlimitedAndFree,
		slug: "cloudflare-tunnel",
		servesPublicServices: true,
		servesPrivateServices: false,
		reachesEveryLocalService: false,
		handlesTlsForPublicServices: true,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: true,
		needsYourOwnRemoteMachine: false,
		homeNetworkRequirement: "nothing",
		// Their terms of service rule out streaming video through the proxy
		isHighBandwidthFriendly: false,
		hasProprietaryComponent: true,
		hasBuiltInNameResolution: true,
		hasWebInterface: true,
		setupSteps: ["install-package"],
		needsDomain: true,
	},
	{ ...pangolinCe, slug: "pangolin-ce-on-vps", ...onAVps },
	{ ...pangolinCe, slug: "pangolin-ce-at-home", ...atHome },
	{ ...pangolinEe, slug: "pangolin-ee-on-vps", ...onAVps },
	{ ...pangolinEe, slug: "pangolin-ee-at-home", ...atHome },
] as const satisfies readonly Method[];

export type MethodSlug = (typeof methods)[number]["slug"];

/** CGNAT and a router you cannot touch both leave you without a port to forward. */
const worksWithoutForwardedPort = (method: Method) =>
	method.homeNetworkRequirement !== "forwarded-port";

const worksWithoutPublicIpv6 = (method: Method) =>
	method.homeNetworkRequirement !== "public-ipv6";

/**
 * Public or private, the point is having no reverse proxy to pick and run. An
 * or, not an and: serving both kinds is a capability, not a commitment, so a
 * tool is not marked down for the half its user may never set up.
 */
const handlesTlsItself = (method: Method) =>
	method.handlesTlsForPublicServices || method.handlesTlsForPrivateServices;

/** Clients aim at your home address, which your ISP can change under you. */
const isReachedAtHome = (method: Method) =>
	method.homeNetworkRequirement !== "nothing";

/**
 * Where a connection from outside lands first. Renting nothing does not put it
 * at home: a tunnel or an overlay network lands it on machines the vendor runs,
 * which is what needing nothing from your home network really means.
 */
const entryPoint = (method: Method) =>
	isReachedAtHome(method)
		? "home"
		: method.needsYourOwnRemoteMachine
			? "rented"
			: "hosted";

const servesUsers = (users: number) => (method: Method) =>
	method.maxUsers === null || method.maxUsers >= users;

const servesDevices = (devices: number) => (method: Method) =>
	method.maxDevices === null || method.maxDevices >= devices;

/** Answers read yes, then no, then "I don't know": the safe side of a fact,
 * nothing at all on a preference. */
const questions = [
	{
		id: "port-forwarding",
		kind: "fact",
		// Gates the "at home" entry point, and CGNAT is nobody's choice
		asksFirst: true,
		question: "Can you set up port forwarding on your router?",
		help: "Port forwarding tells your router to send connections arriving on a given port to your server. It lives in your router's admin page, sometimes under NAT or virtual servers. It also takes a public IPv4 address: under CGNAT your ISP shares one between several homes, and no port can be opened. Compare the address your router shows with the one a what-is-my-ip website reports, different means CGNAT. https://en.wikipedia.org/wiki/Carrier-grade_NAT",
		answers: [
			{ label: "Yes", keep: keepAll },
			{ label: "No, or I'd rather not", keep: worksWithoutForwardedPort },
			{ label: "I don't know", keep: worksWithoutForwardedPort },
		],
	},
	{
		id: "public-ipv6",
		kind: "fact",
		// The other way home stays reachable, same reason
		asksFirst: true,
		question: "Will every one of your users have public IPv6?",
		answers: [
			{ label: "Yes", keep: keepAll },
			{ label: "No", keep: worksWithoutPublicIpv6 },
			{ label: "I don't know", keep: worksWithoutPublicIpv6 },
		],
	},
	{
		id: "how-many-users",
		kind: "fact",
		question: "How many people will you serve, including yourself?",
		help: "Pick the lower answer if you are unsure.",
		answers: [
			{ label: "Up to 5", keep: servesUsers(5) },
			// An open ended count only fits a plan with no cap at all
			{ label: "More than 5", keep: (m) => m.maxUsers === null },
		],
	},
	{
		id: "how-many-devices",
		kind: "fact",
		question: "How many devices will connect in total?",
		help: "Phones, TVs, laptops and tablets all count, yours included.",
		answers: [
			{ label: "Up to 10", keep: servesDevices(10) },
			{ label: "11 to 100", keep: servesDevices(100) },
			{ label: "More than 100", keep: servesDevices(101) },
		],
	},
	{
		id: "high-bandwidth",
		kind: "fact",
		// Streaming is what this site is about: never let a capped option through
		asksFirst: true,
		question: "Will you stream video through it?",
		help: "Jellyfin, for instance: video is what some tools meter or forbid outright.",
		answers: [
			{ label: "Yes", keep: (m) => m.isHighBandwidthFriendly },
			{ label: "No", keep: keepAll },
			{ label: "I don't know", keep: (m) => m.isHighBandwidthFriendly },
		],
	},
	{
		id: "budget",
		kind: "preference",
		question: "Is a monthly subscription an option?",
		answers: [
			{ label: "Yes, if it buys something", keep: keepAll },
			{ label: "No, free only", keep: (m) => m.price === null },
		],
	},
	{
		id: "third-party",
		kind: "preference",
		question: "Should remote access keep working if its provider went away?",
		help: "Some of these need an account, a coordination server or a licence check that you do not run, and stop the day it stops. A server you rent does not count: what runs on it is yours.",
		answers: [
			{ label: "Yes", keep: (m) => !m.isDependentOnThirdParty },
			{ label: "No, depending on their service is fine", keep: keepAll },
		],
	},
	{
		id: "open-source",
		kind: "preference",
		question: "Does every part have to be open source?",
		answers: [
			{ label: "Yes", keep: (m) => !m.hasProprietaryComponent },
			{ label: "No, a closed source piece is fine", keep: keepAll },
		],
	},
	{
		id: "effort",
		kind: "fact",
		question: "How much do you want to set up yourself?",
		answers: [
			{
				label: "As little as possible",
				keep: (m) => m.setupSteps.length <= 1,
			},
			{
				label: "A couple of pieces is fine",
				keep: (m) => m.setupSteps.length <= 2,
			},
			{ label: "Whatever it takes", keep: keepAll },
		],
	},
	{
		id: "client-application",
		kind: "preference",
		question: "How should your users connect?",
		help: "An app on their device puts it on your network, so nothing of yours has to answer the internet. A web address is the other way around.",
		answers: [
			{
				label: "With an app, and nothing exposed to the internet",
				keep: (m) => m.servesPrivateServices,
			},
			{
				label: "With a web address, nothing to install",
				keep: (m) => m.servesPublicServices,
			},
		],
	},
	{
		id: "entry-point",
		kind: "preference",
		question: "Where should connections from outside arrive?",
		help: "A hosted service is theirs to run: an account instead of a server.",
		answers: [
			{ label: "At home, on my own line", keep: (m) => entryPoint(m) === "home" },
			{
				label: "On an internet-facing server, rented by me",
				keep: (m) => entryPoint(m) === "rented",
			},
			{ label: "On a hosted service", keep: (m) => entryPoint(m) === "hosted" },
		],
	},
	{
		id: "tls",
		kind: "preference",
		question: "What should take care of HTTPS?",
		help: "A separate reverse proxy is a second tool to set up, which the reverse proxy quiz picks for you.",
		answers: [
			{ label: "The remote access tool", keep: handlesTlsItself },
			{ label: "A separate reverse proxy", keep: (m) => !handlesTlsItself(m) },
			// A preference nobody holds yet decides nothing: unlike the network
			// facts, there is no unsafe side here, only a second tool or not
			{ label: "I don't know", keep: keepAll },
		],
	},
	{
		id: "web-interface",
		kind: "preference",
		question: "How do you want to manage remote access?",
		answers: [
			{ label: "In a web interface", keep: (m) => m.hasWebInterface },
			{
				label: "In config files, on the command line",
				keep: (m) => !m.hasWebInterface,
			},
		],
	},
] as const satisfies readonly Question<Method>[];

/** Same on everything the quiz asks, so the bill is the only difference left. */
const worseThan = (candidate: Method, other: Method) =>
	candidate.price !== null && other.price === null;

export const remoteAccessQuiz: Quiz<Method> = {
	options: methods,
	questions,
	worseThan,
};

/** The answer that rules an option out, to hang a dealbreaker button on. */
const rulesOut = (id: string, label: string): Choice<Method> => {
	const question = questions.find((one) => one.id === id);
	const answer = question?.answers.find((one) => one.label === label);
	if (!question || !answer) throw new Error(`no "${label}" in "${id}"`);
	return { question, answer };
};

/**
 * Same, for an objection no single answer covers: not renting a server leaves
 * two of the three entry points open, so the dealbreaker is the complement.
 */
const rulesOutWhen = (
	id: string,
	label: string,
	keep: (method: Method) => boolean,
): Choice<Method> => {
	const question = questions.find((one) => one.id === id);
	if (!question) throw new Error(`no question "${id}"`);
	return { question, answer: { label, keep } };
};

/**
 * What the method is like, written without knowing what the user answered, so
 * the result reads as a description rather than a summary of the quiz. The cons
 * with no dealbreaker are the ones no question covers: they earn a guide
 * instead, see `extraGuides`.
 */
export const traits = (method: Method): Trait<Method>[] => {
	const list: Trait<Method>[] = [];

	if (method.price === null) list.push(pro("Free"));
	else
		list.push(
			con(
				`${method.price.amount} ${method.price.currency} per ${method.price.per}, every month`,
				rulesOut("budget", "No, free only"),
			),
		);

	if (method.maxUsers !== null)
		list.push(
			con(
				`Up to ${method.maxUsers} people`,
				rulesOut("how-many-users", "More than 5"),
			),
		);

	if (method.maxDevices !== null)
		list.push(
			con(
				`Up to ${method.maxDevices} devices`,
				rulesOut("how-many-devices", "More than 100"),
			),
		);

	list.push(
		either(
			method.isHighBandwidthFriendly,
			"Streams video without complaint",
			"Streaming video goes against its terms",
			rulesOut("high-bandwidth", "Yes"),
		),
	);

	if (method.homeNetworkRequirement === "nothing")
		list.push(pro("Nothing to open on your router"));
	if (method.homeNetworkRequirement === "forwarded-port")
		list.push(
			con(
				"A port to open on your router",
				rulesOut("port-forwarding", "No, or I'd rather not"),
			),
		);
	if (method.homeNetworkRequirement === "public-ipv6")
		list.push(
			con("Every user needs public IPv6", rulesOut("public-ipv6", "No")),
		);

	list.push(
		either(
			method.servesPublicServices,
			"A link is enough, nothing to install",
			"Every user installs a client",
			rulesOut("client-application", "With a web address, nothing to install"),
		),
		either(
			method.servesPrivateServices,
			"Can stay off the open internet",
			"Whatever you publish faces the internet",
			rulesOut(
				"client-application",
				"With an app, and nothing exposed to the internet",
			),
		),
		either(
			handlesTlsItself(method),
			"HTTPS handled for you",
			"A reverse proxy to add for HTTPS",
			rulesOut("tls", "The remote access tool"),
		),
		either(
			!method.isDependentOnThirdParty,
			"Nobody else in the loop",
			"Leans on a service you do not run",
			rulesOut("third-party", "Yes"),
		),
		either(
			!method.hasProprietaryComponent,
			"Open source all the way",
			"A closed source piece",
			rulesOut("open-source", "Yes"),
		),
		either(
			method.hasBuiltInNameResolution,
			"Machines answer to a name",
			"Names take a DNS zone of your own",
		),
	);

	if (method.needsYourOwnRemoteMachine)
		list.push(
			con(
				"A server to rent and keep running",
				rulesOutWhen(
					"entry-point",
					"Not a server I rent",
					(one) => entryPoint(one) !== "rented",
				),
			),
		);

	if (method.reachesEveryLocalService)
		list.push(con("Opens the whole home network by default"));

	// Nothing installed of its own means nothing to administer either
	if (method.setupSteps.length > 0)
		list.push(
			either(
				method.hasWebInterface,
				"Managed from a web interface",
				"Managed from a terminal",
				rulesOut("web-interface", "In a web interface"),
			),
		);

	if (method.setupSteps.length === 0)
		list.push(pro("Nothing of its own to install"));
	else if (method.setupSteps.length === 1) list.push(pro("One thing to install"));
	else
		list.push(
			con("Several pieces to set up", rulesOut("effort", "As little as possible")),
		);

	return list;
};

export type ExtraGuide =
	| "get-domain"
	| "dynamic-dns"
	| "restrict-vpn-access"
	| "private-dns";

/**
 * Dynamic DNS keeps a name pointing at a home address that moves, so it is only
 * needed when the address isn't static, which is asked outside of the quiz.
 * Restricting access is never asked either: joining the network is what buys
 * the client application, and the guide is where the user gets told that it
 * hands out the whole house by default, then how to lock it down.
 * Names are not asked about at all: any method reaches them with a DNS zone, so
 * a method that has none built in earns the guide rather than a bad mark.
 */
export const extraGuides = (method: Method): ExtraGuide[] => [
	...(method.needsDomain ? (["get-domain"] as const) : []),
	...(isReachedAtHome(method) ? (["dynamic-dns"] as const) : []),
	...(method.reachesEveryLocalService ? (["restrict-vpn-access"] as const) : []),
	...(!method.hasBuiltInNameResolution ? (["private-dns"] as const) : []),
];
