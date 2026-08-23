import {
	reverseProxyQuiz,
	traits,
	type ReverseProxy,
	type ReverseProxySlug,
} from "../quiz/reverse-proxy";
import { QuizRunner, type Doc } from "./QuizRunner";

const titles: Record<ReverseProxySlug, string> = {
	caddy: "Caddy",
	traefik: "Traefik",
	"caddy-docker-proxy": "Caddy Docker Proxy",
	"nginx-proxy-manager": "Nginx Proxy Manager",
	nginx: "Nginx",
	"tailscale-funnel": "Tailscale Funnel",
	"cloudflare-proxy": "Cloudflare proxy",
};

const doc = (proxy: ReverseProxy): Doc => ({
	title: titles[proxy.slug as ReverseProxySlug],
	href: `/guides/reverse-proxy/${proxy.slug}/`,
});

export const ReverseProxyQuiz = () => (
	<QuizRunner quiz={reverseProxyQuiz} doc={doc} traits={traits} />
);
