/** What the remote access quiz owes its readers, on top of the contract. */

import { remoteAccessExtras, remoteAccessGuide } from "../../../src/guides";
import {
	extraGuides,
	remoteAccessQuiz,
	traits,
	type MethodSlug,
	type RemoteAccessMethod,
} from "../../../src/quiz/remote-access";
import { behavesLikeAQuiz } from "./contract";

behavesLikeAQuiz({
	name: "the remote access quiz",
	quiz: remoteAccessQuiz,
	traits,
	guide: (method: RemoteAccessMethod) =>
		remoteAccessGuide(method.slug as MethodSlug),
	directory: "guides/remote-access",
	extras: { handedOut: extraGuides, pages: remoteAccessExtras },
});
