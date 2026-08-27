import {
	extraGuides,
	reverseProxyQuiz,
	traits,
	type ReverseProxy,
	type ReverseProxySlug,
} from "../quiz/reverse-proxy";
import { reverseProxyExtras, reverseProxyGuide } from "../guides";
import { QuizRunner, type Doc } from "./quiz/QuizRunner";

const doc = (proxy: ReverseProxy) =>
	reverseProxyGuide(proxy.slug as ReverseProxySlug);

const guides = (proxy: ReverseProxy): Doc[] =>
	extraGuides(proxy).map((extra) => reverseProxyExtras[extra]);

export const ReverseProxyQuiz = () => (
	<QuizRunner
		quiz={reverseProxyQuiz}
		doc={doc}
		guides={guides}
		traits={traits}
	/>
);
