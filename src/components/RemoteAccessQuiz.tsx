import {
	extraGuides,
	remoteAccessQuiz,
	traits,
	type ExtraGuide,
	type RemoteAccessMethod,
	type MethodSlug,
} from "../quiz/remote-access";
import { remoteAccessGuide } from "../guides";
import { QuizRunner, type Doc } from "./quiz/QuizRunner";

/** The reverse proxy is a quiz of its own, the rest are pages under /reference. */
const extras: Record<ExtraGuide, Doc> = {
	"reverse-proxy": {
		title: "Pick a reverse proxy for HTTPS",
		href: "/quiz/reverse-proxy/",
	},
	"get-domain": {
		title: "Get a domain name",
		href: "/reference/get-domain/",
	},
	"dynamic-dns": {
		title: "Keep a name pointing at your home",
		href: "/reference/dynamic-dns/",
	},
	"restrict-vpn-access": {
		title: "Restrict what your users reach",
		href: "/reference/restrict-vpn-access/",
	},
	"private-dns": {
		title: "Reach your machines by name",
		href: "/reference/private-dns/",
	},
};

const doc = (method: RemoteAccessMethod) =>
	remoteAccessGuide(method.slug as MethodSlug);

const guides = (method: RemoteAccessMethod): Doc[] =>
	extraGuides(method).map((guide) => extras[guide]);

export const RemoteAccessQuiz = () => (
	<QuizRunner
		quiz={remoteAccessQuiz}
		doc={doc}
		guides={guides}
		traits={traits}
	/>
);
