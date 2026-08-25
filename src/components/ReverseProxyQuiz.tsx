import {
	reverseProxyQuiz,
	traits,
	type ReverseProxy,
	type ReverseProxySlug,
} from "../quiz/reverse-proxy";
import { reverseProxyGuide } from "../guides";
import { QuizRunner } from "./QuizRunner";

const doc = (proxy: ReverseProxy) =>
	reverseProxyGuide(proxy.slug as ReverseProxySlug);

export const ReverseProxyQuiz = () => (
	<QuizRunner quiz={reverseProxyQuiz} doc={doc} traits={traits} />
);
