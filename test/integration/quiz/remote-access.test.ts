/** What the remote access quiz owes its readers, on top of the contract. */

import { describe, expect, it } from "vitest";
import { extraPages, remoteAccessGuide } from "../../../src/guides";
import {
	extraGuides,
	remoteAccessQuiz,
	traits,
	type ExtraGuide,
	type MethodSlug,
	type RemoteAccessMethod,
} from "../../../src/quiz/remote-access";
import { behavesLikeAQuiz, hasPage } from "./contract";

const quiz = remoteAccessQuiz;

behavesLikeAQuiz({
	name: "the remote access quiz",
	quiz,
	traits,
	guide: (method: RemoteAccessMethod) =>
		remoteAccessGuide(method.slug as MethodSlug),
	directory: "guides/remote-access",
});

/** Every extra guide any method can send the reader off to. */
const handedOut = new Set(quiz.options.flatMap(extraGuides));

describe("the remote access quiz", () => {
	it("sends every extra guide to a page that exists", () => {
		// given the pages the extra guides point at
		// when they are looked for
		const missing = Object.values(extraPages)
			.filter((extra) => !hasPage(extra.href))
			.map((extra) => extra.href);

		// then every one of them is written
		expect(missing).toEqual([]);
	});

	it("hands out every extra guide it knows of", () => {
		// given the extra guides the site can name
		// when the methods are read for the ones they earn
		const never = Object.keys(extraPages).filter(
			(extra) => !handedOut.has(extra as ExtraGuide),
		);

		// then none is missing a method to earn it: a guide nobody is sent to
		// is a page nobody reads
		expect(never).toEqual([]);
	});
});
