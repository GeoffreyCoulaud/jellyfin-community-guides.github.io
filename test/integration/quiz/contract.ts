/** What every quiz on the site must hold to, whatever it is about. */

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	answerQuestion,
	isDeadEnd,
	nextQuestion,
	type Option,
	type Quiz,
	type QuizState,
	startQuiz,
	traitsOf,
} from "../../../src/quiz/engine";

const docs = new URL("../../../src/content/docs/", import.meta.url);

/** The markdown source of a site path such as `/guides/remote-access/pangolin/`. */
const pageSource = (path: string) => {
	const base = path.replace(/^\/|\/$/g, "");
	const file = [".md", ".mdx"]
		.map((extension) => new URL(base + extension, docs))
		.find(existsSync);
	return file === undefined ? undefined : readFileSync(file, "utf8");
};

/** The anchors Starlight gives the headings of a page. */
const anchors = (source: string) =>
	[...source.matchAll(/^#{2,6} (.+)$/gm)].map(([, heading = ""]) =>
		heading
			.toLowerCase()
			.replace(/[^a-z0-9 -]/g, "")
			.replace(/ /g, "-"),
	);

const isBrokenLink = (href: string) => {
	const [path = "", anchor] = href.split("#");
	const source = pageSource(path);
	if (source === undefined) {
		return true;
	}

	return anchor !== undefined && !anchors(source).includes(anchor);
};

const duplicates = (names: readonly string[]) =>
	names.filter((name, index) => names.indexOf(name) !== index);

type Paths = {
	asked: Set<string>;
	/** As `question/answer`. */
	offered: Set<string>;
	/** Options in a final pool. */
	reachable: Set<string>;
	emptyPools: number;
};

/** Walks every path through the quiz, merging the ones that reach the same state. */
const everyPath = <O extends Option>(quiz: Quiz<O>): Paths => {
	const paths: Paths = {
		asked: new Set(),
		offered: new Set(),
		reachable: new Set(),
		emptyPools: 0,
	};
	const seen = new Set<string>();

	const walk = (state: QuizState<O>) => {
		const askedIds = state.answers.map(({ question }) => question.id).sort();
		const key = `${state.pool.map((option) => option.slug)}|${askedIds}`;
		if (seen.has(key)) {
			return;
		}
		seen.add(key);

		const question = nextQuestion(quiz, state);
		if (question === undefined) {
			if (state.pool.length === 0) {
				paths.emptyPools += 1;
			}
			for (const option of state.pool) {
				paths.reachable.add(option.slug);
			}
			return;
		}

		paths.asked.add(question.id);
		for (const answer of question.answers) {
			if (!isDeadEnd(answer, state.pool)) {
				paths.offered.add(`${question.id}/${answer.id}`);
				walk(answerQuestion(quiz, state, question, answer));
			}
		}
	};

	walk(startQuiz(quiz));
	return paths;
};

export const behavesLikeAQuiz = <O extends Option>(
	name: string,
	quiz: Quiz<O>,
) => {
	const paths = everyPath(quiz);

	describe(name, () => {
		it("gives every option its own slug and title", () => {
			expect(duplicates(quiz.options.map((option) => option.slug))).toEqual([]);
			expect(duplicates(quiz.options.map((option) => option.title))).toEqual(
				[],
			);
		});

		it("gives every question its own id, and every answer within it", () => {
			expect(duplicates(quiz.questions.map((question) => question.id))).toEqual(
				[],
			);
			for (const question of quiz.questions) {
				expect(duplicates(question.answers.map((answer) => answer.id))).toEqual(
					[],
				);
			}
		});

		it("has an answer for every option in every question", () => {
			const stranded = quiz.questions.flatMap((question) =>
				quiz.options
					.filter(
						(option) =>
							!question.answers.some((answer) => answer.matches(option)),
					)
					.map((option) => `${question.id}: ${option.slug}`),
			);

			expect(stranded).toEqual([]);
		});

		it("has no answer that rules every option out", () => {
			const dead = quiz.questions.flatMap((question) =>
				question.answers
					.filter((answer) => isDeadEnd(answer, quiz.options))
					.map((answer) => `${question.id}/${answer.id}`),
			);

			expect(dead).toEqual([]);
		});

		it("asks every question on some path", () => {
			const neverAsked = quiz.questions
				.map((question) => question.id)
				.filter((id) => !paths.asked.has(id));

			expect(neverAsked).toEqual([]);
		});

		it("offers every answer on some path", () => {
			const neverOffered = quiz.questions.flatMap((question) =>
				question.answers
					.map((answer) => `${question.id}/${answer.id}`)
					.filter((id) => !paths.offered.has(id)),
			);

			expect(neverOffered).toEqual([]);
		});

		it("can end on any option", () => {
			const unreachable = quiz.options
				.map((option) => option.slug)
				.filter((slug) => !paths.reachable.has(slug));

			expect(unreachable).toEqual([]);
		});

		it("never ends with no option left", () => {
			expect(paths.emptyPools).toBe(0);
		});

		it("has pros or cons for every option", () => {
			const silent = quiz.options
				.filter((option) => traitsOf(option, quiz.axes).length === 0)
				.map((option) => option.slug);

			expect(silent).toEqual([]);
		});

		it("gives every trait of an option its own id", () => {
			const doubled = quiz.options.flatMap((option) =>
				duplicates(traitsOf(option, quiz.axes).map((trait) => trait.id)),
			);

			expect(doubled).toEqual([]);
		});

		it("links every option to an existing page and heading", () => {
			const broken = quiz.options
				.map((option) => option.href)
				.filter(isBrokenLink);

			expect(broken).toEqual([]);
		});

		it("links every next read to an existing page", () => {
			const broken = quiz.options
				.flatMap((option) => quiz.nextReads?.(option) ?? [])
				.map((link) => link.href)
				.filter(isBrokenLink);

			expect(broken).toEqual([]);
		});
	});
};
