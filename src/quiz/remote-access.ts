import { keepAll, type Question, type Quiz } from "./engine";

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
	/** Users have to install something on their devices to reach the services. */
	needsClientApplication: boolean;
	/**
	 * Every service at home is reachable, even the ones you never published.
	 * What the guide sets up by default: advertised routes and ACLs can narrow
	 * it down, so treat this as what the user is signing up for, not a ceiling.
	 */
	reachesEveryLocalService: boolean;
	/** Serves the services over HTTPS itself, so no reverse proxy to pick. */
	handlesTls: boolean;
	/** Coordination or traffic goes through a service you don't run. */
	isDependentOnThirdParty: boolean;
	/** A VPS you have to rent and run, on top of the server at home. */
	needsYourOwnRemoteMachine: boolean;
	homeNetworkRequirement: HomeNetworkRequirement;
	/** The service you share answers unauthenticated requests from the internet. */
	isExposedToInternet: boolean;
	/** No bandwidth cap or terms of service getting in the way of video. */
	isHighBandwidthFriendly: boolean;
	hasProprietaryComponent: boolean;
	/** Users reach the services by name, with no raw IP address to remember. */
	hasBuiltInNameResolution: boolean;
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
	needsClientApplication: true,
	reachesEveryLocalService: true,
	// tailscale serve, and funnel to publish a service without a VPN client
	handlesTls: true,
	isDependentOnThirdParty: true,
	needsYourOwnRemoteMachine: false,
	homeNetworkRequirement: "nothing",
	isExposedToInternet: false,
	isHighBandwidthFriendly: true,
	hasProprietaryComponent: true,
	hasBuiltInNameResolution: true,
	setupSteps: ["install-package"],
	needsDomain: false,
} as const;

const netbirdCloud = {
	needsClientApplication: true,
	reachesEveryLocalService: true,
	handlesTls: true,
	isDependentOnThirdParty: true,
	needsYourOwnRemoteMachine: false,
	homeNetworkRequirement: "nothing",
	isExposedToInternet: false,
	isHighBandwidthFriendly: true,
	hasProprietaryComponent: false,
	hasBuiltInNameResolution: true,
	setupSteps: ["install-package"],
	needsDomain: false,
} as const;

const zerotier = {
	needsClientApplication: true,
	reachesEveryLocalService: true,
	handlesTls: false,
	isDependentOnThirdParty: true,
	needsYourOwnRemoteMachine: false,
	homeNetworkRequirement: "nothing",
	isExposedToInternet: false,
	isHighBandwidthFriendly: true,
	hasProprietaryComponent: true,
	hasBuiltInNameResolution: false,
	setupSteps: ["install-package"],
	needsDomain: false,
} as const;

/** Declaration order breaks ties: the first one is the safer default. */
const methods = [
	{
		...unlimitedAndFree,
		slug: "port-forward",
		needsClientApplication: false,
		reachesEveryLocalService: false,
		handlesTls: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: false,
		homeNetworkRequirement: "forwarded-port",
		isExposedToInternet: true,
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: true,
		// Serving the services themselves is the reverse proxy quiz's job
		setupSteps: [],
		needsDomain: true,
	},
	{
		...unlimitedAndFree,
		// Declared after port-forward on purpose: half of the internet still
		// reaches servers over IPv4, so it never wins a tie against it.
		slug: "ipv6",
		needsClientApplication: false,
		reachesEveryLocalService: false,
		handlesTls: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: false,
		// CGNAT is an IPv4 problem, a public IPv6 goes around it entirely
		homeNetworkRequirement: "public-ipv6",
		isExposedToInternet: true,
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: true,
		setupSteps: [],
		needsDomain: true,
	},
	{
		...unlimitedAndFree,
		slug: "vps-plus-tunnel",
		needsClientApplication: false,
		reachesEveryLocalService: false,
		// The VPS terminates TLS, but which reverse proxy runs there is your call
		handlesTls: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: true,
		homeNetworkRequirement: "nothing",
		isExposedToInternet: true,
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: true,
		setupSteps: ["install-package", "edit-config-file"],
		needsDomain: true,
	},
	{
		...unlimitedAndFree,
		slug: "wireguard",
		needsClientApplication: true,
		reachesEveryLocalService: true,
		handlesTls: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: false,
		homeNetworkRequirement: "forwarded-port",
		isExposedToInternet: false,
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: false,
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
		needsClientApplication: true,
		reachesEveryLocalService: true,
		// No serve or funnel: both need the ACME and relay infrastructure that
		// Tailscale runs, which headscale has no way to stand in for.
		handlesTls: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: true,
		homeNetworkRequirement: "nothing",
		isExposedToInternet: false,
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: true,
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
		needsClientApplication: true,
		reachesEveryLocalService: true,
		handlesTls: true,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: true,
		homeNetworkRequirement: "nothing",
		isExposedToInternet: false,
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: true,
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
		needsClientApplication: false,
		reachesEveryLocalService: false,
		handlesTls: true,
		isDependentOnThirdParty: true,
		needsYourOwnRemoteMachine: false,
		homeNetworkRequirement: "nothing",
		isExposedToInternet: true,
		// Their terms of service rule out streaming video through the proxy
		isHighBandwidthFriendly: false,
		hasProprietaryComponent: true,
		hasBuiltInNameResolution: true,
		setupSteps: ["install-package"],
		needsDomain: true,
	},
	{
		...unlimitedAndFree,
		slug: "pangolin-ee-on-vps",
		needsClientApplication: true,
		reachesEveryLocalService: true,
		// Reverse proxy for public services, VPN for the internal ones
		handlesTls: true,
		// Free, but the EE build phones a third party activation server
		isDependentOnThirdParty: true,
		needsYourOwnRemoteMachine: true,
		homeNetworkRequirement: "nothing",
		isExposedToInternet: true,
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: true,
		hasBuiltInNameResolution: true,
		setupSteps: ["docker-compose"],
		needsDomain: true,
	},
	{
		...unlimitedAndFree,
		slug: "pangolin-ee-at-home",
		needsClientApplication: true,
		reachesEveryLocalService: true,
		handlesTls: true,
		isDependentOnThirdParty: true,
		needsYourOwnRemoteMachine: false,
		// Without a VPS to tunnel out to, clients have to reach your router
		homeNetworkRequirement: "forwarded-port",
		isExposedToInternet: true,
		isHighBandwidthFriendly: true,
		hasProprietaryComponent: true,
		hasBuiltInNameResolution: true,
		setupSteps: ["docker-compose"],
		needsDomain: true,
	},
] as const satisfies readonly Method[];

export type MethodSlug = (typeof methods)[number]["slug"];

/** CGNAT only takes inbound IPv4 away. */
const isPossibleUnderCgnat = (method: Method) =>
	method.homeNetworkRequirement !== "forwarded-port";

/** Clients aim at your home address, which your ISP can change under you. */
const isReachedAtHome = (method: Method) =>
	method.homeNetworkRequirement !== "nothing";

const servesUsers = (users: number) => (method: Method) =>
	method.maxUsers === null || method.maxUsers >= users;

const servesDevices = (devices: number) => (method: Method) =>
	method.maxDevices === null || method.maxDevices >= devices;

const questions = [
	{
		id: "cgnat",
		kind: "fact",
		question: "Are you behind CGNAT?",
		help: "Your ISP shares one public IPv4 address between several homes, which leaves you with no port to forward. Compare the address your router shows on its status page with the one a what-is-my-ip website reports: different addresses mean CGNAT. https://en.wikipedia.org/wiki/Carrier-grade_NAT",
		answers: [
			{ label: "No", keep: keepAll },
			{ label: "Yes", keep: isPossibleUnderCgnat },
			{ label: "I don't know", keep: isPossibleUnderCgnat },
		],
	},
	{
		id: "port-forwarding",
		kind: "fact",
		question: "Can you set up port forwarding on your router?",
		help: "Port forwarding tells your router to send connections arriving on a given port to your server. It lives in your router's admin page, sometimes under NAT or virtual servers.",
		answers: [
			{ label: "Yes", keep: keepAll },
			{
				label: "No, or I'd rather not",
				keep: (m) => m.homeNetworkRequirement !== "forwarded-port",
			},
			{
				label: "I don't know",
				keep: (m) => m.homeNetworkRequirement !== "forwarded-port",
			},
		],
	},
	{
		id: "public-ipv6",
		kind: "fact",
		question: "Will every one of your users have public IPv6?",
		answers: [
			{ label: "Yes", keep: keepAll },
			{
				label: "No, or I don't know",
				keep: (m) => m.homeNetworkRequirement !== "public-ipv6",
			},
		],
	},
	{
		id: "remote-machine",
		kind: "fact",
		question: "Do you have a VPS, or would you rent one?",
		answers: [
			{ label: "Yes", keep: keepAll },
			{ label: "No", keep: (m) => !m.needsYourOwnRemoteMachine },
		],
	},
	{
		id: "how-many-users",
		kind: "fact",
		question: "How many people will you serve, including yourself?",
		help: "Pick the lower answer if you are unsure.",
		answers: [
			{ label: "Up to 5", keep: servesUsers(5) },
			{ label: "6 to 10", keep: servesUsers(10) },
			{ label: "More than 10", keep: servesUsers(11) },
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
		question: "Will you stream video, like Jellyfin or Plex?",
		answers: [
			{ label: "Yes", keep: (m) => m.isHighBandwidthFriendly },
			{ label: "No, only light services", keep: keepAll },
		],
	},
	{
		id: "name-resolution",
		kind: "fact",
		question: "Do your users need a name instead of an IP address?",
		answers: [
			{ label: "No, an IP address is fine", keep: keepAll },
			{ label: "Yes, they need a name", keep: (m) => m.hasBuiltInNameResolution },
		],
	},
	{
		id: "budget",
		kind: "fact",
		question: "Is a monthly subscription an option?",
		answers: [
			{ label: "No, free only", keep: (m) => m.price === null },
			{ label: "Yes, if it buys something", keep: keepAll },
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
		answers: [
			{
				label: "With an app that puts their device on my network",
				keep: (m) => m.needsClientApplication,
			},
			{
				label: "With a web address, nothing to install",
				keep: (m) => !m.needsClientApplication,
			},
		],
	},
	{
		id: "internet-exposure",
		kind: "preference",
		question: "Should your services be reachable from the open internet?",
		answers: [
			{
				label: "Yes, anyone knowing the address can knock",
				keep: (m) => m.isExposedToInternet,
			},
			{
				label: "No, only from my private network",
				keep: (m) => !m.isExposedToInternet,
			},
		],
	},
	{
		id: "third-party",
		kind: "preference",
		question: "Should a company run the connection for you?",
		answers: [
			{
				label: "Yes, one less thing to maintain",
				keep: (m) => m.isDependentOnThirdParty,
			},
			{
				label: "No, nobody in the middle",
				keep: (m) => !m.isDependentOnThirdParty,
			},
		],
	},
	{
		id: "entry-point",
		kind: "preference",
		question: "Where should the entry point be?",
		answers: [
			{
				label: "On a server I rent, away from home",
				keep: (m) => m.needsYourOwnRemoteMachine,
			},
			{
				label: "At home, I rent nothing",
				keep: (m) => !m.needsYourOwnRemoteMachine,
			},
		],
	},
	{
		id: "tls",
		kind: "preference",
		question: "Who should handle HTTPS?",
		help: "Securing the connection means terminating TLS somewhere and keeping a certificate valid.",
		answers: [
			{
				label: "The tool itself, certificates included",
				keep: (m) => m.handlesTls,
			},
			{
				label: "A reverse proxy I run myself",
				keep: (m) => !m.handlesTls,
			},
		],
	},
	{
		id: "open-source",
		kind: "preference",
		question: "Open source everywhere, or the most beaten path?",
		answers: [
			{
				label: "Every part open source, even if it is less known",
				keep: (m) => !m.hasProprietaryComponent,
			},
			{
				label: "The most widely used option, tutorials everywhere",
				keep: (m) => m.hasProprietaryComponent,
			},
		],
	},
] as const satisfies readonly Question<Method>[];

export const remoteAccessQuiz: Quiz<Method> = { options: methods, questions };

export type ExtraGuide = "get-domain" | "dynamic-dns" | "restrict-vpn-access";

/**
 * Dynamic DNS keeps a name pointing at a home address that moves, so it is only
 * needed when the address isn't static, which is asked outside of the quiz.
 * Restricting access is never asked either: joining the network is what buys
 * the client application, and the guide is where the user gets told that it
 * hands out the whole house by default, then how to lock it down.
 */
export const extraGuides = (method: Method): ExtraGuide[] => [
	...(method.needsDomain ? (["get-domain"] as const) : []),
	...(isReachedAtHome(method) ? (["dynamic-dns"] as const) : []),
	...(method.reachesEveryLocalService ? (["restrict-vpn-access"] as const) : []),
];
