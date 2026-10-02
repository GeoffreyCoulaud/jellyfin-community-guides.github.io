import { describe, expect, it } from "vitest";
import { reverseProxyQuiz as quiz } from "../../../src/quiz/reverse-proxy";
import { behavesLikeAQuiz } from "./contract";

behavesLikeAQuiz("the reverse proxy quiz", quiz);

describe("the reverse proxy quiz", () => {
	it("offers every proxy a way to declare routes", () => {
		const ways =
			quiz.questions
				.find((question) => question.id === "how-to-add-a-service")
				?.answers.filter((answer) => answer.id !== "no-preference") ?? [];

		const stranded = quiz.options
			.filter((proxy) => !ways.some((way) => way.matches(proxy)))
			.map((proxy) => proxy.slug);

		expect(ways).not.toEqual([]);
		expect(stranded).toEqual([]);
	});
});
