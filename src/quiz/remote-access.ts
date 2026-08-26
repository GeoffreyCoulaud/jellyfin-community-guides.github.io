import {
	describe,
	keepAll,
	type Axis,
	type Question,
	type Quiz,
} from "./engine";

type Money = { amount: number; currency: "EUR" | "USD" };

type Seat = Money & { per: "user" | "device" };

/**
 * Not one number: a flat fee covering a handful of seats and charging for the
 * rest is a real shape, ZeroTier asking 18 USD before the eleventh device.
 */
type Price =
	| { perSeat: Seat; fixed?: undefined }
	| { fixed: Money; seatsIncluded: number; perSeat: Seat };

/** Pushing an APK yourself is a real cost, and it is not the same as no app. */
type TvClient = "official" | "sideload" | "none";

/**
 * What the method needs from your home network. "nothing" covers tunnels and
 * overlay networks: your server dials out, so nothing has to be reachable.
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
export type RemoteAccessMethod = {
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
	 * Every service at home is reachable, even the ones you never published, as
	 * the guide sets it up: routes and ACLs can narrow it down. Not pruned on,
	 * read off the resolved method to pick extra guides.
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
	 * Users reach the services by name, no raw IP address to remember. Not pruned
	 * on: a DNS zone gets any method there, so it earns a guide, not a bad mark.
	 */
	hasBuiltInNameResolution: boolean;
	hasWebInterface: boolean;
	/**
	 * Never read on its own: a method publishing a public address has no client
	 * at all, so "none" means nothing to install rather than nothing that works.
	 */
	appleTv: "official" | "none"; // tvOS installs what the App Store carries
	/** Android TV and Google TV, which the Play Store serves. */
	androidTv: TvClient;
	/** The Amazon Appstore carries far fewer of these than the Play Store. */
	fireTv: TvClient;
	/** How many people this plan serves. null: no limit. */
	maxUsers: number | null;
	/** How many connected devices this plan serves. null: no limit. */
	maxDevices: number | null;
	/** What it costs every month. null: free. */
	price: Price | null;
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
	appleTv: "official",
	androidTv: "official",
	fireTv: "official",
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
	appleTv: "official",
	androidTv: "official",
	fireTv: "sideload",
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
	appleTv: "none",
	// Documented for neither: their install page knows the Play Store and an APK
	androidTv: "sideload",
	fireTv: "sideload",
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
	appleTv: "none",
	androidTv: "none",
	fireTv: "none",
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
		appleTv: "none",
		androidTv: "none",
		fireTv: "none",
		hasWebInterface: false,
		// Serving the services themselves is the reverse proxy quiz's job
		setupSteps: [],
		needsDomain: true,
	},
	{
		...unlimitedAndFree,
		// Only reachable by someone who cannot forward a port: IPv4 reaches
		// everyone, so answering yes to that question drops this one
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
		appleTv: "none",
		androidTv: "none",
		fireTv: "none",
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
		appleTv: "none",
		androidTv: "none",
		fireTv: "none",
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
		appleTv: "none",
		// A leanback launcher in its manifest, and a TV interface of its own
		androidTv: "official",
		fireTv: "sideload",
		hasWebInterface: false,
		setupSteps: [
			"install-package",
			"edit-config-file",
			"per-user-key-exchange",
		],
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
		price: { perSeat: { amount: 8, currency: "USD", per: "user" } },
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
		appleTv: "official",
		androidTv: "official",
		fireTv: "official",
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
		price: { perSeat: { amount: 6, currency: "EUR", per: "user" } },
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
		appleTv: "official",
		androidTv: "official",
		fireTv: "sideload",
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
		price: {
			fixed: { amount: 18, currency: "USD" },
			seatsIncluded: 10,
			perSeat: { amount: 2, currency: "USD", per: "device" },
		},
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
		appleTv: "none",
		androidTv: "none",
		fireTv: "none",
		hasWebInterface: true,
		setupSteps: ["install-package"],
		needsDomain: true,
	},
	{ ...pangolinCe, slug: "pangolin-ce-on-vps", ...onAVps },
	{ ...pangolinCe, slug: "pangolin-ce-at-home", ...atHome },
	{ ...pangolinEe, slug: "pangolin-ee-on-vps", ...onAVps },
	{ ...pangolinEe, slug: "pangolin-ee-at-home", ...atHome },
] as const satisfies readonly RemoteAccessMethod[];

export type MethodSlug = (typeof methods)[number]["slug"];

/** CGNAT and a router you cannot touch both leave you without a port to forward. */
const worksWithoutForwardedPort = (method: RemoteAccessMethod) =>
	method.homeNetworkRequirement !== "forwarded-port";

const worksWithoutPublicIpv6 = (method: RemoteAccessMethod) =>
	method.homeNetworkRequirement !== "public-ipv6";

/**
 * An or, not an and: serving both kinds is a capability and not a commitment,
 * so a tool is not marked down for the half its user may never set up.
 */
const handlesTlsItself = (method: RemoteAccessMethod) =>
	method.handlesTlsForPublicServices || method.handlesTlsForPrivateServices;

/** A half it serves and puts no HTTPS on: something else has to. */
const needsAReverseProxy = (method: RemoteAccessMethod) =>
	(method.servesPublicServices && !method.handlesTlsForPublicServices) ||
	(method.servesPrivateServices && !method.handlesTlsForPrivateServices);

/** Nothing to install, so any box with a Jellyfin app or a browser gets there. */
const worksOnAnyTv = (method: RemoteAccessMethod) =>
	method.servesPublicServices;

/** Clients aim at your home address, which your ISP can change under you. */
const isReachedAtHome = (method: RemoteAccessMethod) =>
	method.homeNetworkRequirement !== "nothing";

/**
 * Renting nothing does not put it at home: a tunnel or an overlay network lands
 * it on machines the vendor runs.
 */
const entryPoint = (method: RemoteAccessMethod) =>
	isReachedAtHome(method)
		? "home"
		: method.needsYourOwnRemoteMachine
			? "rented"
			: "hosted";

const money = ({ amount, currency }: Money) => `${amount} ${currency}`;

/** The whole bill, flat fee included: a per seat price on its own hides it. */
const monthlyBill = (price: Price | null) => {
	if (price === null) return "Free";
	const seat = `${money(price.perSeat)} per ${price.perSeat.per}`;
	if (price.fixed === undefined) return `${seat}, every month`;
	const covered = `${price.seatsIncluded} ${price.perSeat.per}s`;
	return `${money(price.fixed)} a month for ${covered}, then ${seat}`;
};

/** What the vendor bills every month, and the only bill `price` knows about. */
const hasSubscription = (method: RemoteAccessMethod) => method.price !== null;

/** The machine you rent: nobody invoices it here, it is not free either. */
const hasHostingCost = (method: RemoteAccessMethod) =>
	method.needsYourOwnRemoteMachine;

/** Both bills together, which is what paying nothing at all rules out. */
const costsMoney = (method: RemoteAccessMethod) =>
	hasSubscription(method) || hasHostingCost(method);

/**
 * Both keep quiet about a method that publishes a public address: there is no
 * client to install in the first place.
 */
const tvAxes = (
	slug: string,
	device: string,
	client: (one: RemoteAccessMethod) => TvClient,
): Axis<RemoteAccessMethod>[] => [
	{
		id: `${slug}-client`,
		applies: (one) => !worksOnAnyTv(one),
		holds: (one) => worksOnAnyTv(one) || client(one) !== "none",
		con: `${device} cannot install it`,
	},
	{
		id: `${slug}-store`,
		applies: (one) => !worksOnAnyTv(one) && client(one) !== "none",
		holds: (one) => worksOnAnyTv(one) || client(one) === "official",
		pro: `${device} installs it from the store`,
		con: `${device} needs its app sideloaded`,
	},
];

/** Written without knowing what was asked: a description, not a summary. */
const axes: readonly Axis<RemoteAccessMethod>[] = [
	{
		id: "subscription",
		holds: (one) => !hasSubscription(one),
		pro: (one) => (hasHostingCost(one) ? "No subscription" : "Free"),
		con: (one) => monthlyBill(one.price),
	},
	{
		id: "user-limit",
		holds: (one) => one.maxUsers === null,
		con: (one) => `Up to ${one.maxUsers} people`,
	},
	{
		id: "device-limit",
		holds: (one) => one.maxDevices === null,
		con: (one) => `Up to ${one.maxDevices} devices`,
	},
	{
		id: "high-bandwidth",
		holds: (one) => one.isHighBandwidthFriendly,
		pro: "Streams video without complaint",
		con: "Streaming video goes against its terms",
	},
	{
		id: "port-forwarding",
		// The IPv6 one hears nothing here: the axis below is its line
		applies: (one) => one.homeNetworkRequirement !== "public-ipv6",
		holds: worksWithoutForwardedPort,
		pro: "Nothing to open on your router",
		con: "A port to open on your router",
	},
	{
		id: "public-ipv6",
		holds: worksWithoutPublicIpv6,
		con: "Every user needs public IPv6",
	},
	{
		id: "public-services",
		holds: (one) => one.servesPublicServices,
		pro: "A link is enough, nothing to install",
		con: "Every user installs a client",
	},
	{
		id: "private-services",
		holds: (one) => one.servesPrivateServices,
		pro: "Can stay off the open internet",
		con: "Whatever you publish faces the internet",
	},
	{
		id: "public-tls",
		// One axis per half, since a method can cover one and not the other:
		// Pangolin CE puts HTTPS on what it publishes and none on the rest
		applies: (one) => one.servesPublicServices,
		holds: (one) =>
			!one.servesPublicServices || one.handlesTlsForPublicServices,
		pro: "HTTPS on what you publish",
		con: "A reverse proxy to add for HTTPS on what you publish",
	},
	{
		id: "private-tls",
		applies: (one) => one.servesPrivateServices,
		holds: (one) =>
			!one.servesPrivateServices || one.handlesTlsForPrivateServices,
		pro: "HTTPS on what stays private",
		con: "A reverse proxy to add for HTTPS on what stays private",
	},
	{
		id: "third-party",
		holds: (one) => !one.isDependentOnThirdParty,
		pro: "Nobody else in the loop",
		con: "Leans on a service you do not run",
	},
	{
		id: "open-source",
		holds: (one) => !one.hasProprietaryComponent,
		pro: "Open source all the way",
		con: "A closed source piece",
	},
	{
		id: "name-resolution",
		holds: (one) => one.hasBuiltInNameResolution,
		pro: "Machines answer to a name",
		con: "Names take a DNS zone of your own",
	},
	...tvAxes("apple-tv", "An Apple TV", (one) => one.appleTv),
	...tvAxes("android-tv", "An Android TV", (one) => one.androidTv),
	...tvAxes("fire-tv", "A Fire TV", (one) => one.fireTv),
	{
		id: "own-remote-machine",
		holds: (one) => !one.needsYourOwnRemoteMachine,
		con: "A server to rent and keep running",
	},
	{
		id: "whole-network",
		holds: (one) => !one.reachesEveryLocalService,
		con: "Opens the whole home network by default",
	},
	{
		id: "web-interface",
		// Nothing installed of its own means nothing to administer either
		applies: (one) => one.setupSteps.length > 0,
		holds: (one) => one.hasWebInterface,
		pro: "Managed from a web interface",
		con: "Managed by logging in to the server",
	},
	{
		id: "setup-effort",
		holds: (one) => one.setupSteps.length <= 1,
		pro: (one) =>
			one.setupSteps.length === 0
				? "Nothing of its own to install"
				: "One thing to install",
		con: "Several pieces to set up",
	},
];

export const traits = (method: RemoteAccessMethod) => describe(method, axes);

const servesUsers = (users: number) => (method: RemoteAccessMethod) =>
	method.maxUsers === null || method.maxUsers >= users;

const servesDevices = (devices: number) => (method: RemoteAccessMethod) =>
	method.maxDevices === null || method.maxDevices >= devices;

/** The way out of a fact, kept to the safe side: a guess rules nothing out. */
const dontKnow = "I don't know";

/** The way out of a preference, which takes no side and so rules nothing out. */
const dontMind = "I don't mind";

/** Answers read yes, then no, then the way out, where there is one. */
const questions = [
	{
		id: "port-forwarding",
		kind: "fact",
		// What a home line can do at all, before asking where connections land
		asksFirst: true,
		question: "Can you set up port forwarding on your router?",
		help: "Port forwarding tells your router to send connections arriving on a given port to your server. It lives in your router's admin page, sometimes under NAT or virtual servers. It also takes a public IPv4 address: under CGNAT your ISP shares one between several homes, and no port can be opened. Compare the address your router shows with the one a what-is-my-ip website reports, different means CGNAT. https://en.wikipedia.org/wiki/Carrier-grade_NAT",
		answers: [
			{
				// Not keepAll: the IPv6-only route is the same setup minus the users
				// whose ISP has no IPv6, so a forwarded port makes it pointless
				id: "yes",
				label: "Yes",
				keep: worksWithoutPublicIpv6,
			},
			{
				id: "no",
				label: "No, or I'd rather not",
				keep: worksWithoutForwardedPort,
			},
			{ id: "unknown", label: dontKnow, keep: worksWithoutForwardedPort },
		],
	},
	{
		id: "public-ipv6",
		kind: "fact",
		asksFirst: true,
		question: "Will every one of your users have public IPv6?",
		answers: [
			{ id: "yes", label: "Yes", keep: keepAll },
			{ id: "no", label: "No", keep: worksWithoutPublicIpv6 },
			{ id: "unknown", label: dontKnow, keep: worksWithoutPublicIpv6 },
		],
	},
	{
		id: "how-many-users",
		kind: "fact",
		question: "How many people will you serve, including yourself?",
		answers: [
			{ id: "up-to-5", label: "Up to 5", keep: servesUsers(5) },
			// An open ended count only fits a plan with no cap at all
			{
				id: "more-than-5",
				label: "More than 5",
				keep: (m) => m.maxUsers === null,
			},
			{ id: "unknown", label: dontKnow, keep: servesUsers(5) },
		],
	},
	{
		id: "how-many-devices",
		kind: "fact",
		question: "How many devices will connect in total?",
		help: "Phones, TVs, laptops and tablets all count, yours included.",
		answers: [
			{ id: "up-to-10", label: "Up to 10", keep: servesDevices(10) },
			{ id: "up-to-100", label: "11 to 100", keep: servesDevices(100) },
			{
				id: "more-than-100",
				label: "More than 100",
				keep: servesDevices(101),
			},
			{ id: "unknown", label: dontKnow, keep: servesDevices(10) },
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
			{ id: "yes", label: "Yes", keep: (m) => m.isHighBandwidthFriendly },
			{ id: "no", label: "No", keep: keepAll },
			{
				id: "unknown",
				label: dontKnow,
				keep: (m) => m.isHighBandwidthFriendly,
			},
		],
	},
	{
		id: "budget",
		kind: "preference",
		question: "Are you willing to pay for remote access?",
		answers: [
			{ id: "yes", label: "Yes", keep: keepAll },
			{
				id: "subscription-only",
				label: "Yes, but only for a service subscription",
				keep: (m) => !hasHostingCost(m),
			},
			{
				id: "rented-server-only",
				label: "Yes, but only for a rented server",
				keep: (m) => !hasSubscription(m),
			},
			{ id: "no", label: "No", keep: (m) => !costsMoney(m) },
		],
	},
	{
		id: "third-party",
		kind: "preference",
		question:
			"Should remote access keep working if its provider went away?",
		help: "Some of these need an account, a coordination server or a licence check that you do not run, and stop the day it stops. A server you rent does not count: what runs on it is yours.",
		answers: [
			{
				id: "yes",
				label: "Yes",
				keep: (m) => !m.isDependentOnThirdParty,
			},
			{
				id: "no",
				label: "No, depending on their service is fine",
				keep: keepAll,
			},
		],
	},
	{
		id: "open-source",
		kind: "preference",
		question: "Does every part have to be open source?",
		answers: [
			{
				id: "yes",
				label: "Yes",
				keep: (m) => !m.hasProprietaryComponent,
			},
			{
				id: "no",
				label: "No, a closed source piece is fine",
				keep: keepAll,
			},
		],
	},
	{
		id: "effort",
		kind: "fact",
		question: "How much do you want to set up yourself?",
		answers: [
			{
				id: "as-little-as-possible",
				label: "As little as possible",
				keep: (m) => m.setupSteps.length <= 1,
			},
			{
				id: "a-couple-of-pieces",
				label: "A couple of pieces is fine",
				keep: (m) => m.setupSteps.length <= 2,
			},
			{
				id: "whatever-it-takes",
				label: "Whatever it takes",
				keep: keepAll,
			},
		],
	},
	{
		id: "watching-devices",
		kind: "fact",
		question:
			"Will an LG or Samsung TV, a Roku, or a console need to reach your services?",
		help: "Their stores carry no VPN client at all. An Apple TV, an Android TV or a Fire TV can run one, televisions that run Android TV included, though not every tool has an app for all three.",
		answers: [
			{ id: "yes", label: "Yes", keep: worksOnAnyTv },
			{ id: "no", label: "No", keep: keepAll },
			{ id: "unknown", label: dontKnow, keep: worksOnAnyTv },
		],
	},
	{
		id: "client-application",
		kind: "preference",
		question: "How should your users connect?",
		help: "An app on their device puts it on your network, so nothing of yours has to answer the internet. A web address is the other way around.",
		answers: [
			{
				id: "app",
				label: "With an app, and nothing exposed to the internet",
				keep: (m) => m.servesPrivateServices,
			},
			{
				id: "web-address",
				label: "With a web address, nothing to install",
				keep: (m) => m.servesPublicServices,
			},
			{ id: "no-preference", label: dontMind, keep: keepAll },
		],
	},
	{
		id: "entry-point",
		kind: "preference",
		question: "Where should connections from outside arrive?",
		help: "A hosted service is theirs to run: an account instead of a server.",
		answers: [
			{
				id: "home",
				label: "At home, on my own line",
				keep: (m) => entryPoint(m) === "home",
			},
			{
				id: "rented-server",
				label: "On an internet-facing server, rented by me",
				keep: (m) => entryPoint(m) === "rented",
			},
			{
				id: "hosted-service",
				label: "On a hosted service",
				keep: (m) => entryPoint(m) === "hosted",
			},
			{ id: "no-preference", label: dontMind, keep: keepAll },
		],
	},
	{
		id: "tls",
		kind: "preference",
		question: "What should take care of HTTPS?",
		help: "A separate reverse proxy is a second tool to set up, which the reverse proxy quiz picks for you.",
		answers: [
			{
				id: "remote-access-tool",
				label: "The remote access tool",
				keep: handlesTlsItself,
			},
			{
				id: "reverse-proxy",
				label: "A separate reverse proxy",
				keep: (m) => !handlesTlsItself(m),
			},
			{ id: "no-preference", label: dontMind, keep: keepAll },
		],
	},
	{
		id: "web-interface",
		kind: "preference",
		question: "How do you want to manage remote access?",
		help: "A web interface adds users, devices and routes from any browser, on any of your machines. Without one, you log in to the server itself to do it there, in a file or with a command depending on the tool.",
		answers: [
			{
				id: "web-interface",
				label: "In a web interface",
				keep: (m) => m.hasWebInterface,
			},
			{
				id: "server-login",
				label: "By logging in to the server",
				keep: (m) => !m.hasWebInterface,
			},
			{ id: "no-preference", label: dontMind, keep: keepAll },
		],
	},
] as const satisfies readonly Question<RemoteAccessMethod>[];

/** Every field but `setupSteps` is a scalar, so one pass over the list does. */
const sameValue = (one: unknown, other: unknown) =>
	Array.isArray(one) && Array.isArray(other)
		? one.length === other.length &&
			one.every((item, index) => item === other[index])
		: one === other;

/** The service itself: what a provider does not change between its plans. */
const service = ({
	slug,
	price,
	maxUsers,
	maxDevices,
	...rest
}: RemoteAccessMethod) => rest;

/**
 * Nothing but the bill may differ: a rented server and a hosted account both
 * cost money, and which of the two you want is a real choice.
 */
const differsOnlyByTheBill = (
	candidate: RemoteAccessMethod,
	other: RemoteAccessMethod,
) => {
	const theirs: Record<string, unknown> = service(other);
	return Object.entries(service(candidate)).every(([field, value]) =>
		sameValue(value, theirs[field]),
	);
};

/** Paying for what the free plan of the same service already covers. */
const worseThan = (candidate: RemoteAccessMethod, other: RemoteAccessMethod) =>
	differsOnlyByTheBill(candidate, other) &&
	hasSubscription(candidate) &&
	!hasSubscription(other);

export const remoteAccessQuiz: Quiz<RemoteAccessMethod> = {
	options: methods,
	questions,
	worseThan,
};

export type ExtraGuide =
	| "reverse-proxy"
	| "get-domain"
	| "dynamic-dns"
	| "restrict-vpn-access"
	| "private-dns";

/**
 * What is left to set up once the method is picked. HTTPS aside, the quiz never
 * asks about these: they rule no option out, so each earns a page instead.
 */
export const extraGuides = (method: RemoteAccessMethod): ExtraGuide[] => [
	...(needsAReverseProxy(method) ? (["reverse-proxy"] as const) : []),
	...(method.needsDomain ? (["get-domain"] as const) : []),
	...(isReachedAtHome(method) ? (["dynamic-dns"] as const) : []),
	...(method.reachesEveryLocalService
		? (["restrict-vpn-access"] as const)
		: []),
	...(!method.hasBuiltInNameResolution ? (["private-dns"] as const) : []),
];
