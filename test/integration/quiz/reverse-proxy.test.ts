/** What the reverse proxy quiz owes its readers, on top of the contract. */

import { describe, expect, it } from "vitest";
import { reverseProxyGuide } from "../../../src/guides";
import {
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

	it("offers every family it has a proxy from", () => {
		// given the families the options belong to
		const families = new Set(quiz.options.map((proxy) => proxy.family));

		// when the answers naming one are read
		const named = asks("already-used")
			.answers.map((answer) => answer.id)
			.filter(takesASide)
			.filter((id) => id !== "none");

		// then the two lists are the same: a habit with no answer of its own
		// is a habit the quiz cannot use
		expect(named.sort()).toEqual([...families].sort());
	});
});
