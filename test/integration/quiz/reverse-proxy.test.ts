/** What the reverse proxy quiz owes its readers, on top of the contract. */

import { describe, expect, it } from "vitest";
import { reverseProxyExtras, reverseProxyGuide } from "../../../src/guides";
import {
	extraGuides,
	reverseProxyQuiz,
	traits,
	type ReverseProxy,
	type ReverseProxySlug,
} from "../../../src/quiz/reverse-proxy";
import { behavesLikeAQuiz } from "./contract";

const quiz = reverseProxyQuiz;

behavesLikeAQuiz({
	name: "the reverse proxy quiz",
	quiz,
	traits,
	guide: (proxy: ReverseProxy) =>
		reverseProxyGuide(proxy.slug as ReverseProxySlug),
	directory: "guides/reverse-proxy",
	extras: { handedOut: extraGuides, pages: reverseProxyExtras },
});

/** The way out of a preference, which takes no side and so rules nothing out. */
const takesASide = (id: string) => id !== "no-preference";

const asks = (id: string) => quiz.questions.find((one) => one.id === id)!;

describe("the reverse proxy quiz", () => {
	it("gives every proxy a way of being told about a service", () => {
		// given the ways the quiz offers, the way out left aside
		const ways = asks("how-to-add-a-service").answers.filter((answer) =>
			takesASide(answer.id),
		);

		// when they are read against every proxy
		const stranded = quiz.options
			.filter((proxy) => !ways.some((way) => way.keep(proxy)))
			.map((proxy) => proxy.slug);

		// then none is left out: a proxy no way reaches is one nobody asking
		// for a way can be recommended
		expect(stranded).toEqual([]);
	});
});
