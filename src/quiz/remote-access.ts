import {
	type Axis,
	type Link,
	matchesAll,
	type Question,
	type Quiz,
} from "./engine";
import { glyph, logo } from "./icons";

type Money = { amount: number; currency: "EUR" | "USD" };

type Seat = Money & { per: "user" | "device" };

/** Either per seat, or a flat fee covering some seats and per seat beyond. */
type Price =
	| { perSeat: Seat; fixed?: undefined }
	| { fixed: Money; seatsIncluded: number; perSeat: Seat };

/** Sideloading an APK is a real cost, and not the same as having no app. */
type TvClient = "official" | "sideload" | "none";

/** "nothing": the server dials out, so nothing at home has to be reachable. */
type HomeNetworkRequirement = "nothing" | "forwarded-port" | "public-ipv6";

/** "terms": video is against the terms of service. "undisclosed-cap": throttled. */
type BandwidthLimit = "terms" | "undisclosed-cap";

type SetupStep =
	| "install-package"
	| "docker-compose"
	| "edit-config-file"
	| "per-user-key-exchange";

/** One plan of one method: a provider selling several plans is several options. */
export type RemoteAccessMethod = {
	slug: string;
	title: string;
	href: string;
	icon: string;
	/** Reachable from the internet: a link, a browser, nothing to install. */
	servesPublicServices: boolean;
	/** Reachable only once the device joined your network with a client. */
	servesPrivateServices: boolean;
	handlesTlsForPublicServices: boolean;
	handlesTlsForPrivateServices: boolean;
	/** Every service at home is reachable by default, even unpublished ones. */
	reachesEveryLocalService: boolean;
	/** Coordination or traffic goes through a service you don't run. */
	isDependentOnThirdParty: boolean;
	/** A VPS to rent and run, on top of the server at home. */
	needsYourOwnRemoteMachine: boolean;
	homeNetworkRequirement: HomeNetworkRequirement;
	bandwidthLimit: BandwidthLimit | null;
	hasProprietaryComponent: boolean;
	/** Users reach services by name, no raw IP address to remember. */
	hasBuiltInNameResolution: boolean;
	hasWebInterface: boolean;
	appleTv: "official" | "none";
	androidTv: TvClient;
	fireTv: TvClient;
	/** null: no limit. */
	maxUsers: number | null;
	/** null: no limit. */
	maxDevices: number | null;
	/** Monthly. null: free. */
	price: Price | null;
	/** The free plan of the same service, which this paid plan is pruned for. */
	freePlan?: string;
	/** Only modeled where it tells two options apart. */
	rolesPerUser?: "one" | "several";
	setupSteps: readonly SetupStep[];
	needsDomain: boolean;
};

const unlimitedAndFree = {
	maxUsers: null,
	maxDevices: null,
	price: null,
} as const;

const tailscale = {
	icon: logo("tailscale"),
	servesPublicServices: false,
	servesPrivateServices: true,
	reachesEveryLocalService: true,
	handlesTlsForPublicServices: false,
	// tailscale serve, on the tailnet name, certificate included
	handlesTlsForPrivateServices: true,
	isDependentOnThirdParty: true,
	needsYourOwnRemoteMachine: false,
	homeNetworkRequirement: "nothing",
	bandwidthLimit: null,
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
	icon: logo("netbird"),
	servesPublicServices: false,
	servesPrivateServices: true,
	reachesEveryLocalService: true,
	// Publishing goes through a separate reverse proxy feature, still in beta
	handlesTlsForPublicServices: false,
	handlesTlsForPrivateServices: false,
	isDependentOnThirdParty: true,
	needsYourOwnRemoteMachine: false,
	homeNetworkRequirement: "nothing",
	bandwidthLimit: null,
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
	icon: logo("zerotier"),
	servesPublicServices: false,
	servesPrivateServices: true,
	reachesEveryLocalService: true,
	handlesTlsForPublicServices: false,
	handlesTlsForPrivateServices: false,
	isDependentOnThirdParty: true,
	needsYourOwnRemoteMachine: false,
	homeNetworkRequirement: "nothing",
	bandwidthLimit: null,
	hasProprietaryComponent: true,
	hasBuiltInNameResolution: false,
	appleTv: "none",
	// Their install page only knows the Play Store and an APK
	androidTv: "sideload",
	fireTv: "sideload",
	hasWebInterface: true,
	setupSteps: ["install-package"],
	needsDomain: false,
} as const;

/** A reverse proxy for what you publish and a VPN for what you don't. */
const pangolin = {
	...unlimitedAndFree,
	icon: logo("pangolin"),
	servesPublicServices: true,
	servesPrivateServices: true,
	// Access is granted resource by resource
	reachesEveryLocalService: false,
	handlesTlsForPublicServices: true,
	// Since 1.22 for CE
	handlesTlsForPrivateServices: true,
	bandwidthLimit: null,
	hasBuiltInNameResolution: true,
	appleTv: "none",
	androidTv: "none",
	fireTv: "none",
	hasWebInterface: true,
	setupSteps: ["docker-compose"],
	needsDomain: true,
} as const;

/** AGPL, nothing to activate. */
const pangolinCe = {
	...pangolin,
	isDependentOnThirdParty: false,
	hasProprietaryComponent: false,
	rolesPerUser: "one",
} as const;

/** Free under a revenue threshold, with a licence key checked against Fossorial. */
const pangolinEe = {
	...pangolin,
	isDependentOnThirdParty: true,
	hasProprietaryComponent: true,
	rolesPerUser: "several",
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

const methods = [
	{
		...unlimitedAndFree,
		slug: "port-forward",
		title: "Port forwarding",
		href: "/guides/remote-access/port-forward/",
		icon: glyph("router"),
		servesPublicServices: true,
		servesPrivateServices: false,
		reachesEveryLocalService: false,
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: false,
		homeNetworkRequirement: "forwarded-port",
		bandwidthLimit: null,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: true,
		appleTv: "none",
		androidTv: "none",
		fireTv: "none",
		hasWebInterface: false,
		// Serving the services is the reverse proxy's job
		setupSteps: [],
		needsDomain: true,
	},
	{
		...unlimitedAndFree,
		// Only for those who cannot forward a port: IPv4 reaches everyone
		slug: "ipv6",
		title: "Direct IPv6",
		href: "/guides/remote-access/ipv6/",
		icon: glyph("globe"),
		servesPublicServices: true,
		servesPrivateServices: false,
		reachesEveryLocalService: false,
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: false,
		// CGNAT is an IPv4 problem, a public IPv6 goes around it
		homeNetworkRequirement: "public-ipv6",
		bandwidthLimit: null,
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
		title: "A VPS tunnelled back home",
		href: "/guides/remote-access/vps-plus-tunnel/",
		icon: glyph("server"),
		servesPublicServices: true,
		servesPrivateServices: false,
		reachesEveryLocalService: false,
		// The VPS terminates TLS, with a reverse proxy of your choice
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: true,
		homeNetworkRequirement: "nothing",
		bandwidthLimit: null,
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
		title: "WireGuard",
		href: "/guides/remote-access/wireguard/",
		icon: logo("wireguard"),
		servesPublicServices: false,
		servesPrivateServices: true,
		reachesEveryLocalService: true,
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: false,
		homeNetworkRequirement: "forwarded-port",
		bandwidthLimit: null,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: false,
		appleTv: "none",
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
		// WireGuard with keys, QR codes and revocation in a web interface
		...unlimitedAndFree,
		slug: "wg-easy",
		title: "wg-easy",
		href: "/guides/remote-access/wg-easy/",
		icon: logo("wireguard"),
		servesPublicServices: false,
		servesPrivateServices: true,
		reachesEveryLocalService: true,
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: false,
		homeNetworkRequirement: "forwarded-port",
		bandwidthLimit: null,
		hasProprietaryComponent: false,
		// Its bundled CoreDNS answers for containers, not for your machines
		hasBuiltInNameResolution: false,
		appleTv: "none",
		androidTv: "official",
		fireTv: "sideload",
		hasWebInterface: true,
		setupSteps: ["docker-compose"],
		needsDomain: false,
	},
	{
		...tailscale,
		slug: "tailscale-free",
		title: "Tailscale, free plan",
		href: "/guides/remote-access/tailscale/#free-plan",
		maxUsers: 6,
		// User devices are unlimited, only tagged resources are capped
		maxDevices: null,
		price: null,
	},
	{
		...tailscale,
		slug: "tailscale-standard",
		title: "Tailscale, Standard plan",
		href: "/guides/remote-access/tailscale/#standard-plan",
		maxUsers: null,
		maxDevices: null,
		price: { perSeat: { amount: 8, currency: "USD", per: "user" } },
		freePlan: "tailscale-free",
	},
	{
		// The same tailnet with one service published out of it
		...tailscale,
		slug: "tailscale-funnel",
		title: "Tailscale Funnel",
		href: "/guides/remote-access/tailscale/#funnel",
		servesPublicServices: true,
		handlesTlsForPublicServices: true,
		bandwidthLimit: "undisclosed-cap",
		maxUsers: 6,
		maxDevices: null,
		price: null,
	},
	{
		...unlimitedAndFree,
		slug: "headscale",
		title: "Headscale",
		href: "/guides/remote-access/headscale/",
		icon: logo("headscale"),
		servesPublicServices: false,
		servesPrivateServices: true,
		reachesEveryLocalService: true,
		// serve and funnel rely on infrastructure only Tailscale runs
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: true,
		homeNetworkRequirement: "nothing",
		bandwidthLimit: null,
		hasProprietaryComponent: false,
		hasBuiltInNameResolution: true,
		appleTv: "official",
		androidTv: "official",
		fireTv: "official",
		// Third party ones exist, the project itself is a command line
		hasWebInterface: false,
		setupSteps: ["docker-compose", "edit-config-file"],
		needsDomain: true,
	},
	{
		...netbirdCloud,
		slug: "netbird-cloud-free",
		title: "NetBird Cloud, free plan",
		href: "/guides/remote-access/netbird/#cloud-free-plan",
		maxUsers: 5,
		maxDevices: 100,
		price: null,
	},
	{
		...netbirdCloud,
		slug: "netbird-cloud-team",
		title: "NetBird Cloud, Team plan",
		href: "/guides/remote-access/netbird/#cloud-team-plan",
		maxUsers: null,
		// 100 machines plus 10 per user are included, extra ones are 0.50 EUR
		maxDevices: null,
		price: { perSeat: { amount: 6, currency: "EUR", per: "user" } },
		freePlan: "netbird-cloud-free",
	},
	{
		...unlimitedAndFree,
		slug: "netbird-ce-on-vps",
		title: "NetBird self-hosted",
		href: "/guides/remote-access/netbird/#self-hosted",
		icon: logo("netbird"),
		servesPublicServices: false,
		servesPrivateServices: true,
		reachesEveryLocalService: true,
		handlesTlsForPublicServices: false,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: false,
		needsYourOwnRemoteMachine: true,
		homeNetworkRequirement: "nothing",
		bandwidthLimit: null,
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
		title: "ZeroTier, free plan",
		href: "/guides/remote-access/zerotier/#free-plan",
		// ZeroTier sells devices, not seats
		maxUsers: null,
		maxDevices: 10,
		price: null,
	},
	{
		...zerotier,
		slug: "zerotier-essential",
		title: "ZeroTier, Essential plan",
		href: "/guides/remote-access/zerotier/#essential-plan",
		maxUsers: null,
		maxDevices: null,
		price: {
			fixed: { amount: 18, currency: "USD" },
			seatsIncluded: 10,
			perSeat: { amount: 2, currency: "USD", per: "device" },
		},
		freePlan: "zerotier-free",
	},
	{
		...unlimitedAndFree,
		slug: "cloudflare-tunnel",
		title: "Cloudflare Tunnel",
		href: "/guides/remote-access/cloudflare-tunnel/",
		icon: logo("cloudflare"),
		servesPublicServices: true,
		servesPrivateServices: false,
		reachesEveryLocalService: false,
		handlesTlsForPublicServices: true,
		handlesTlsForPrivateServices: false,
		isDependentOnThirdParty: true,
		needsYourOwnRemoteMachine: false,
		homeNetworkRequirement: "nothing",
		// Their CDN terms reserve video for the paid Stream product
		bandwidthLimit: "terms",
		hasProprietaryComponent: true,
		hasBuiltInNameResolution: true,
		appleTv: "none",
		androidTv: "none",
		fireTv: "none",
		hasWebInterface: true,
		setupSteps: ["install-package"],
		needsDomain: true,
	},
	{
		...pangolinCe,
		...onAVps,
		slug: "pangolin-ce-on-vps",
		title: "Pangolin CE on a VPS",
		href: "/guides/remote-access/pangolin/#ce-on-a-vps",
	},
	{
		...pangolinCe,
		...atHome,
		slug: "pangolin-ce-at-home",
		title: "Pangolin CE at home",
		href: "/guides/remote-access/pangolin/#ce-at-home",
	},
	{
		...pangolinEe,
		...onAVps,
		slug: "pangolin-ee-on-vps",
		title: "Pangolin EE on a VPS",
		href: "/guides/remote-access/pangolin/#ee-on-a-vps",
	},
	{
		...pangolinEe,
		...atHome,
		slug: "pangolin-ee-at-home",
		title: "Pangolin EE at home",
		href: "/guides/remote-access/pangolin/#ee-at-home",
	},
] as const satisfies readonly RemoteAccessMethod[];

const streamsVideo = (method: RemoteAccessMethod) =>
	method.bandwidthLimit === null;

const worksWithoutForwardedPort = (method: RemoteAccessMethod) =>
	method.homeNetworkRequirement !== "forwarded-port";

const worksWithoutPublicIpv6 = (method: RemoteAccessMethod) =>
	method.homeNetworkRequirement !== "public-ipv6";

/** Either half is enough: serving both kinds is a capability, not a commitment. */
const handlesTlsItself = (method: RemoteAccessMethod) =>
	method.handlesTlsForPublicServices || method.handlesTlsForPrivateServices;

/** True when nothing is served privately: there is no private half to cover. */
const coversPrivateTls = (method: RemoteAccessMethod) =>
	!method.servesPrivateServices || method.handlesTlsForPrivateServices;

/** Nothing to install, so any device with a Jellyfin app or a browser works. */
const worksOnAnyTv = (method: RemoteAccessMethod) =>
	method.servesPublicServices;

/** Clients aim at your home address, which your ISP can change. */
const isReachedAtHome = (method: RemoteAccessMethod) =>
	method.homeNetworkRequirement !== "nothing";

/** Renting nothing does not mean at home: a tunnel lands on the vendor's machines. */
const entryPoint = (method: RemoteAccessMethod) => {
	if (isReachedAtHome(method)) {
		return "home";
	}

	return method.needsYourOwnRemoteMachine ? "rented" : "hosted";
};

const money = ({ amount, currency }: Money) => `${amount} ${currency}`;

/** The whole bill, flat fee included. */
const monthlyBill = (price: Price | null) => {
	if (price === null) {
		return "Free";
	}

	const seat = `${money(price.perSeat)} per ${price.perSeat.per}`;
	if (price.fixed === undefined) {
		return `${seat}, every month`;
	}

	const covered = `${price.seatsIncluded} ${price.perSeat.per}s`;
	return `${money(price.fixed)} a month for ${covered}, then ${seat}`;
};

const hasSubscription = (method: RemoteAccessMethod) => method.price !== null;

/** The rented machine is not billed by the vendor, but not free either. */
const hasHostingCost = (method: RemoteAccessMethod) =>
	method.needsYourOwnRemoteMachine;

const costsMoney = (method: RemoteAccessMethod) =>
	hasSubscription(method) || hasHostingCost(method);

/** Silent on methods publishing a public address: there is no client to install. */
const tvAxes = (
	id: string,
	device: string,
	client: (method: RemoteAccessMethod) => TvClient,
): Axis<RemoteAccessMethod>[] => [
	{
		id: `${id}-client`,
		applies: (method) => !worksOnAnyTv(method),
		holds: (method) => client(method) !== "none",
		con: `${device} cannot install it`,
	},
	{
		id: `${id}-store`,
		applies: (method) => !worksOnAnyTv(method) && client(method) !== "none",
		holds: (method) => client(method) === "official",
		pro: `${device} installs it from the store`,
		con: `${device} needs its app sideloaded`,
	},
];

const axes: readonly Axis<RemoteAccessMethod>[] = [
	{
		id: "subscription",
		holds: (method) => method.price === null,
		pro: (method) => (hasHostingCost(method) ? "No subscription" : "Free"),
		con: (method) => monthlyBill(method.price),
	},
	{
		id: "user-limit",
		holds: (method) => method.maxUsers === null,
		con: (method) => `Up to ${method.maxUsers} people`,
	},
	{
		id: "device-limit",
		holds: (method) => method.maxDevices === null,
		con: (method) => `Up to ${method.maxDevices} devices`,
	},
	{
		id: "high-bandwidth",
		holds: streamsVideo,
		pro: "Streams video without complaint",
		con: (method) =>
			method.bandwidthLimit === "terms"
				? "Streaming video goes against its terms"
				: "An undisclosed bandwidth cap",
	},
	{
		id: "port-forwarding",
		// IPv6 has its own line below
		applies: (method) => method.homeNetworkRequirement !== "public-ipv6",
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
		holds: (method) => method.servesPublicServices,
		pro: "A link is enough, nothing to install",
		con: "Every user installs a client",
	},
	{
		id: "private-services",
		holds: (method) => method.servesPrivateServices,
		pro: "Can stay off the open internet",
		con: "Whatever you publish faces the internet",
	},
	{
		id: "public-tls",
		applies: (method) => method.servesPublicServices,
		holds: (method) => method.handlesTlsForPublicServices,
		pro: "HTTPS on what you publish",
		con: "A reverse proxy to add for HTTPS on what you publish",
	},
	{
		id: "private-tls",
		applies: (method) => method.servesPrivateServices,
		holds: coversPrivateTls,
		pro: "HTTPS on what stays private",
		con: "A reverse proxy to add for HTTPS on what stays private",
	},
	{
		id: "third-party",
		holds: (method) => !method.isDependentOnThirdParty,
		pro: "Nobody else in the loop",
		con: "Leans on a service you do not run",
	},
	{
		id: "open-source",
		holds: (method) => !method.hasProprietaryComponent,
		pro: "Open source all the way",
		con: "A closed source piece",
	},
	{
		id: "roles-per-user",
		applies: (method) => method.rolesPerUser !== undefined,
		holds: (method) => method.rolesPerUser === "several",
		pro: "Users can hold several roles",
		con: "Each user holds a single role",
	},
	{
		id: "name-resolution",
		holds: (method) => method.hasBuiltInNameResolution,
		pro: "Machines answer to a name",
		con: "Names take a DNS zone of your own",
	},
	{
		id: "own-domain",
		holds: (method) => !method.needsDomain,
		pro: "No domain to buy",
		con: "Needs a domain name of your own",
	},
	...tvAxes("apple-tv", "An Apple TV", (method) => method.appleTv),
	...tvAxes("android-tv", "An Android TV", (method) => method.androidTv),
	...tvAxes("fire-tv", "A Fire TV", (method) => method.fireTv),
	{
		id: "own-remote-machine",
		holds: (method) => !method.needsYourOwnRemoteMachine,
		con: "A server to rent and keep running",
	},
	{
		id: "whole-network",
		holds: (method) => !method.reachesEveryLocalService,
		con: "Opens the whole home network by default",
	},
	{
		id: "web-interface",
		// Nothing installed means nothing to administer
		applies: (method) => method.setupSteps.length > 0,
		holds: (method) => method.hasWebInterface,
		pro: "Managed from a web interface",
		con: "Managed by logging in to the server",
	},
	{
		id: "setup-effort",
		holds: (method) => method.setupSteps.length <= 1,
		pro: (method) =>
			method.setupSteps.length === 0
				? "Nothing of its own to install"
				: "One thing to install",
		con: "Several pieces to set up",
	},
];

const servesUsers = (users: number) => (method: RemoteAccessMethod) =>
	method.maxUsers === null || method.maxUsers >= users;

const servesDevices = (devices: number) => (method: RemoteAccessMethod) =>
	method.maxDevices === null || method.maxDevices >= devices;

const roughGuess = "A rough guess is fine.";

const dontMind = "I don't mind";

const questions = [
	{
		id: "port-forwarding",
		kind: "fact",
		// Where connections can land at all, which later preferences depend on
		asksFirst: true,
		question: "Can you set up port forwarding on your router?",
		help: "A setting in your router, often under NAT or virtual servers. If the address it shows differs from what a what-is-my-ip site reports, you are behind CGNAT and cannot open one.",
		answers: [
			{
				// A forwarded port makes the IPv6-only route pointless
				id: "yes",
				label: "Yes",
				matches: worksWithoutPublicIpv6,
			},
			{
				id: "no",
				label: "No / I'd rather not / I don't know",
				matches: worksWithoutForwardedPort,
			},
		],
	},
	{
		id: "public-ipv6",
		kind: "fact",
		question: "Will every one of your users have public IPv6?",
		answers: [
			{ id: "yes", label: "Yes", matches: matchesAll },
			{ id: "no", label: "No / I don't know", matches: worksWithoutPublicIpv6 },
		],
	},
	{
		id: "how-many-users",
		kind: "fact",
		question: "How many people will you serve, including yourself?",
		help: roughGuess,
		answers: [
			{ id: "up-to-5", label: "Up to 5", matches: servesUsers(5) },
			{
				// An open-ended count only fits a plan with no cap
				id: "more-than-5",
				label: "More than 5",
				matches: (method) => method.maxUsers === null,
			},
		],
	},
	{
		id: "how-many-devices",
		kind: "fact",
		question: "How many devices will connect in total?",
		help: `Phones, TVs, laptops and tablets all count, yours included. ${roughGuess}`,
		answers: [
			{ id: "up-to-10", label: "Up to 10", matches: servesDevices(10) },
			{ id: "up-to-100", label: "11 to 100", matches: servesDevices(100) },
			{
				id: "more-than-100",
				label: "More than 100",
				matches: servesDevices(101),
			},
		],
	},
	{
		id: "high-bandwidth",
		kind: "fact",
		// Never let a capped option through on a streaming site
		asksFirst: true,
		question: "Will you stream video through it?",
		help: "Jellyfin, for instance: video is what some tools meter or forbid outright.",
		answers: [
			{ id: "yes", label: "Yes / I don't know", matches: streamsVideo },
			{ id: "no", label: "No", matches: matchesAll },
		],
	},
	{
		id: "budget",
		kind: "preference",
		question: "Are you willing to pay for remote access?",
		answers: [
			{ id: "yes", label: "Yes", matches: matchesAll },
			{
				id: "subscription-only",
				label: "Yes, but only for a service subscription",
				matches: (method) => !hasHostingCost(method),
			},
			{
				id: "rented-server-only",
				label: "Yes, but only for a rented server",
				matches: (method) => !hasSubscription(method),
			},
			{ id: "no", label: "No", matches: (method) => !costsMoney(method) },
		],
	},
	{
		id: "third-party",
		kind: "preference",
		question: "Should remote access keep working if its provider went away?",
		help: "Some need an account, a coordination server or a licence check you do not run, and stop the day it stops. A server you rent is yours.",
		answers: [
			{
				id: "yes",
				label: "Yes",
				matches: (method) => !method.isDependentOnThirdParty,
			},
			{
				id: "no",
				label: "No, depending on their service is fine",
				matches: matchesAll,
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
				matches: (method) => !method.hasProprietaryComponent,
			},
			{
				id: "no",
				label: "No, a closed source piece is fine",
				matches: matchesAll,
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
				matches: (method) => method.setupSteps.length <= 1,
			},
			{
				id: "a-couple-of-pieces",
				label: "A couple of pieces is fine",
				matches: (method) => method.setupSteps.length <= 2,
			},
			{
				id: "whatever-it-takes",
				label: "Whatever it takes",
				matches: matchesAll,
			},
		],
	},
	{
		id: "watching-devices",
		kind: "fact",
		question:
			"Will an LG or Samsung TV, a Roku, or a console need to reach your services?",
		help: "Their stores carry no VPN client at all. An Apple TV, an Android TV or a Fire TV can run one, though not every tool has an app for all three.",
		answers: [
			{ id: "yes", label: "Yes / I don't know", matches: worksOnAnyTv },
			{ id: "no", label: "No", matches: matchesAll },
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
				matches: (method) => method.servesPrivateServices,
			},
			{
				id: "web-address",
				label: "With a web address, nothing to install",
				matches: (method) => method.servesPublicServices,
			},
			{ id: "no-preference", label: dontMind, matches: matchesAll },
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
				matches: (method) => entryPoint(method) === "home",
			},
			{
				id: "rented-server",
				label: "On an internet-facing server, rented by me",
				matches: (method) => entryPoint(method) === "rented",
			},
			{
				id: "hosted-service",
				label: "On a hosted service",
				matches: (method) => entryPoint(method) === "hosted",
			},
			{ id: "no-preference", label: dontMind, matches: matchesAll },
		],
	},
	{
		id: "tls",
		kind: "preference",
		question: "What should take care of HTTPS?",
		help: "A separate reverse proxy is a second tool to set up.",
		answers: [
			{
				id: "remote-access-tool",
				label: "The remote access tool",
				matches: handlesTlsItself,
			},
			{
				id: "reverse-proxy",
				label: "A separate reverse proxy",
				matches: (method) => !handlesTlsItself(method),
			},
			{ id: "no-preference", label: dontMind, matches: matchesAll },
		],
	},
	{
		// `tls` is satisfied by either half, this one asks after the private half
		id: "private-tls",
		kind: "preference",
		question: "Should the services you keep private answer over HTTPS too?",
		help: "Behind a VPN the traffic is already encrypted, so this is about what browsers and apps accept: without HTTPS they warn, and some refuse outright.",
		answers: [
			{ id: "yes", label: "Yes", matches: coversPrivateTls },
			{
				id: "no",
				label: "No, plain HTTP is fine inside my network",
				matches: matchesAll,
			},
		],
	},
	{
		id: "web-interface",
		kind: "preference",
		question: "How do you want to manage remote access?",
		help: "A web interface adds users and devices from any browser. Without one, you log in to the server and edit a file or run a command.",
		answers: [
			{
				id: "web-interface",
				label: "In a web interface",
				matches: (method) => method.hasWebInterface,
			},
			{
				id: "server-login",
				label: "By logging in to the server",
				matches: (method) => !method.hasWebInterface,
			},
			{ id: "no-preference", label: dontMind, matches: matchesAll },
		],
	},
] as const satisfies readonly Question<RemoteAccessMethod>[];

/** Something it serves gets no HTTPS from it. */
const needsAReverseProxy = (method: RemoteAccessMethod) =>
	(method.servesPublicServices && !method.handlesTlsForPublicServices) ||
	!coversPrivateTls(method);

/** The pages to read once a method is picked, which no question asks about. */
const nextReads = (method: RemoteAccessMethod): Link[] => [
	...(needsAReverseProxy(method)
		? [
				{
					title: "Pick a reverse proxy for HTTPS",
					href: "/quiz/reverse-proxy/",
				},
			]
		: []),
	...(method.needsDomain
		? [{ title: "Get a domain name", href: "/reference/get-domain/" }]
		: []),
	...(isReachedAtHome(method)
		? [
				{
					title: "Keep a name pointing at your home",
					href: "/reference/dynamic-dns/",
				},
			]
		: []),
	...(method.reachesEveryLocalService
		? [
				{
					title: "Restrict what your users reach",
					href: "/reference/restrict-vpn-access/",
				},
			]
		: []),
	...(method.hasBuiltInNameResolution
		? []
		: [
				{
					title: "Reach your machines by name",
					href: "/reference/private-dns/",
				},
			]),
];

export const remoteAccessQuiz: Quiz<RemoteAccessMethod> = {
	options: methods,
	questions,
	axes,
	nextReads,
	worseThan: (candidate, other) => candidate.freePlan === other.slug,
};
