/**
 * What every quiz on the site owes its readers, whatever it is about: nothing
 * dead in it, no dead end to answer its way into, and a page behind every
 * option it can land on.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	applyAnswer,
	liveAnswers,
	nextQuestion,
	resolve,
	startQuiz,
	type Option,
	type Quiz,
	type QuizState,
	type Trait,
} from "../../../src/quiz/engine";
import { iconForPage, type Guide } from "../../../src/guides";

/** Where Starlight reads the pages the quizzes link to. */
const content = fileURLToPath(
	new URL("../../../src/content/docs/", import.meta.url),
);

/** A page as a quiz links to it: "/guides/reverse-proxy/caddy/". */
const file = (href: string) => join(content, href.replace(/^\/|\/$/g, ""));

export const hasPage = (href: string) =>
	[".md", ".mdx"].some((extension) => existsSync(file(href) + extension));

/** Every page written under one directory, as the site addresses them. */
const pagesUnder = (directory: string) =>
	readdirSync(join(content, directory))
		.filter((page) => /\.mdx?$/.test(page))
		.map((page) => `/${directory}/${page.replace(/\.mdx?$/, "")}/`);

/** What a run through the quiz turned out to touch. */
type Ways = {
	/** Questions the quiz was seen to ask. */
	asked: Set<string>;
	/** Answers it was seen to offer, as "question/answer". */
	offered: Set<string>;
	/** Options left standing at the end of a run. */
	standing: Set<string>;
	/** Runs ending with every option ruled out. */
	deadEnds: number;
};

/**
 * Two runs that ruled the same options out and asked the same questions have
 * the same future ahead of them, whatever order the answers came in. Walking
 * one of the two is walking both, which is what keeps this exhaustive.
 */
const reached = <O extends Option>(quiz: Quiz<O>, state: QuizState<O>) => {
	const kept = quiz.options.filter((option) =>
		state.steps.every((step) => step.keep(option)),
	);
	const asked = state.steps
		.map((step) => step.question?.id)
		.filter((id) => id !== undefined)
		.sort();
	return `${kept.map((option) => option.slug)}|${asked}`;
};

/** Every way through the quiz, one run per state it can be taken to. */
export const everyWayThrough = <O extends Option>(quiz: Quiz<O>): Ways => {
	const seen = new Set<string>();
	const ways: Ways = {
		asked: new Set(),
		offered: new Set(),
		standing: new Set(),
		deadEnds: 0,
	};
	const walk = (state: QuizState<O>) => {
		const key = reached(quiz, state);
		if (seen.has(key)) return;
		seen.add(key);
		const question = nextQuestion(quiz, state);
		if (question === undefined) {
			if (resolve(quiz, state).status === "over-constrained")
				ways.deadEnds += 1;
			for (const option of state.pool) ways.standing.add(option.slug);
			return;
		}
		ways.asked.add(question.id);
		for (const answer of liveAnswers(question, state.pool)) {
			ways.offered.add(`${question.id}/${answer.id}`);
			walk(applyAnswer(quiz, state, question, answer));
		}
	};
	walk(startQuiz(quiz));
	return ways;
};

type Family<O extends Option> = {
	name: string;
	quiz: Quiz<O>;
	traits: (option: O) => readonly Trait<O>[];
	/** The page the site sends the reader to, for one option. */
	guide: (option: O) => Guide;
	/** Where this family's guides live, so an unread one shows up. */
	directory: string;
};

/** The duplicates in a list, which every id here has to come back empty of. */
const twice = (names: readonly string[]) =>
	names.filter((name, index) => names.indexOf(name) !== index);

export const behavesLikeAQuiz = <O extends Option>({
	name,
	quiz,
	traits,
	guide,
	directory,
}: Family<O>) => {
	const slugs = quiz.options.map((option) => option.slug);
	let walked: Ways | undefined;
	const ways = () => (walked ??= everyWayThrough(quiz));

	describe(name, () => {
		it("gives every option a slug of its own", () => {
			// given the options it picks from
			// when their slugs are read
			// then no two share one: a slug is what a link cites
			expect(twice(slugs)).toEqual([]);
		});

		it("gives every question and answer an id of its own", () => {
			// given the questions it asks
			// when their ids are read
			// then nothing is named twice, within a question or across them
			expect(twice(quiz.questions.map((one) => one.id))).toEqual([]);
			for (const question of quiz.questions)
				expect(twice(question.answers.map((one) => one.id))).toEqual(
					[],
				);
		});

		it("leaves nobody without an answer to give", () => {
			// given every question and every option
			// when the answers are read against them
			const stranded = quiz.questions.flatMap((question) =>
				quiz.options
					.filter(
						(option) =>
							!question.answers.some((answer) =>
								answer.keep(option),
							),
					)
					.map((option) => `${question.id}: ${option.slug}`),
			);

			// then every option survives an answer, or the question is
			// unanswerable for whoever is left with it
			expect(stranded).toEqual([]);
		});

		it("offers no answer ruling every option out", () => {
			// given every answer it writes
			// when they are read against the whole list
			const dead = quiz.questions.flatMap((question) =>
				question.answers
					.filter((answer) => !quiz.options.some(answer.keep))
					.map((answer) => `${question.id}/${answer.id}`),
			);

			// then none of them is a dead end from the off
			expect(dead).toEqual([]);
		});

		it("asks every question it declares", () => {
			// given every way through the quiz
			// when the questions asked along them are collected
			const never = quiz.questions
				.map((question) => question.id)
				.filter((id) => !ways().asked.has(id));

			// then none is left unasked: a question nothing reaches is dead
			expect(never).toEqual([]);
		});

		it("offers every answer it declares", () => {
			// given every way through the quiz
			// when the answers offered along them are collected
			const never = quiz.questions.flatMap((question) =>
				question.answers
					.map((answer) => `${question.id}/${answer.id}`)
					.filter((cited) => !ways().offered.has(cited)),
			);

			// then none is left unoffered
			expect(never).toEqual([]);
		});

		it("can leave any option standing at the end", () => {
			// given every way through the quiz
			// when what is left standing at the end of each is collected
			const never = slugs.filter((slug) => !ways().standing.has(slug));

			// then every option is reachable: one nothing reaches is dead
			expect(never).toEqual([]);
		});

		it("never answers its way into nothing at all", () => {
			// given every way through the quiz
			// when the runs ending with everything ruled out are counted
			// then there are none: only a dealbreaker may leave you stuck
			expect(ways().deadEnds).toBe(0);
		});

		it("has something to say about every option", () => {
			// given the card each option is shown on
			// when its traits are read
			const silent = quiz.options
				.filter((option) => traits(option).length === 0)
				.map((option) => option.slug);

			// then none of them is blank
			expect(silent).toEqual([]);
		});

		it("names every trait on a card once", () => {
			// given the card each option is shown on
			// when the axes it reads are collected
			const doubled = quiz.options.flatMap((option) =>
				twice(traits(option).map((trait) => trait.id)).map(
					(id) => `${option.slug}: ${id}`,
				),
			);

			// then no axis is read twice: a shared link cites one by its id
			expect(doubled).toEqual([]);
		});

		it("sends every option to a page that exists", () => {
			// given the guide each option points at
			// when the pages are looked for
			const missing = quiz.options
				.map(guide)
				.filter((one) => !hasPage(one.href))
				.map((one) => one.href);

			// then every one of them is written
			expect(missing).toEqual([]);
		});

		it("leaves no guide unread", () => {
			// given the pages written for this family
			const linked = new Set(
				quiz.options.map((option) => guide(option).href),
			);

			// when the ones no option points at are collected
			const orphans = pagesUnder(directory).filter(
				(href) => !linked.has(href),
			);

			// then there are none: a page no answer leads to is never read
			expect(orphans).toEqual([]);
		});

		it("gives a page one icon, whatever points at it", () => {
			// given the guides the options point at
			// when the icon of each page is read off the sidebar
			const wrong = quiz.options
				.map(guide)
				.filter((one) => iconForPage(one.href) !== one.emblem.icon)
				.map((one) => one.href);

			// then it is the icon the option carries, options sharing a page
			// sharing what it is a picture of
			expect(wrong).toEqual([]);
		});
	});
};
