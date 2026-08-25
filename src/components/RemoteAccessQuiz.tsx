import {
	extraGuides,
	remoteAccessQuiz,
	traits,
	type RemoteAccessMethod,
	type MethodSlug,
} from "../quiz/remote-access";
import { extraPages, remoteAccessGuide } from "../guides";
import { QuizRunner, type Doc } from "./quiz/QuizRunner";

const doc = (method: RemoteAccessMethod) =>
	remoteAccessGuide(method.slug as MethodSlug);

const guides = (method: RemoteAccessMethod): Doc[] =>
	extraGuides(method).map((extra) => extraPages[extra]);

export const RemoteAccessQuiz = () => (
	<QuizRunner
		quiz={remoteAccessQuiz}
		doc={doc}
		guides={guides}
		traits={traits}
	/>
);
