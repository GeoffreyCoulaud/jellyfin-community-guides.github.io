/** What the cards say alike, once nothing is left to ask. */

import { describe, expect, it } from "vitest";
import {
	compare,
	describe as traitsOf,
	type Axis,
	type Option,
	type Trait,
} from "../../../src/quiz/engine";
import { has, tagged, traitsFor, type Tagged } from "../../fixtures/tagged-quiz";

const caffeine = traitsFor("caffeine");

const coffee = tagged("coffee", "caffeine");
const tea = tagged("tea", "caffeine");
const juice = tagged("juice");

/** A card as the words on it, the way out of a con being no part of them. */
const words = <O extends Option>(traits: readonly Trait<O>[]) =>
	traits.map((trait) => `${trait.tone}: ${trait.label}`);

/** What each card is left with, by name. */
const apart = <O extends Option>(
	entries: readonly { option: O; traits: readonly Trait<O>[] }[],
) => entries.map((entry) => [entry.option.slug, words(entry.traits)]);

describe("compare", () => {
	it("says once what every card left says", () => {
		// given two options nothing on their cards tells apart
		// when they are compared
		const { shared, apart: own } = compare([coffee, tea], caffeine);

		// then the trait is said over the lot, and neither card repeats it
		expect(words(shared)).toEqual(["pro: caffeine"]);
		expect(apart(own)).toEqual([
			["coffee", []],
			["tea", []],
		]);
	});

	it("leaves on its own card what only one of them says", () => {
		// given two options one axis reads on opposite sides
		// when they are compared
		const { shared, apart: own } = compare([coffee, juice], caffeine);

		// then nothing is shared: the axis is exactly what tells them apart
		expect(words(shared)).toEqual([]);
		expect(apart(own)).toEqual([
			["coffee", ["pro: caffeine"]],
			["juice", ["con: not caffeine"]],
		]);
	});

	it("tells two cards apart on the words, not on the axis", () => {
		// given an axis holding of both, worded off the option it describes
		const named: Axis<Tagged> = {
			id: "caffeine",
			holds: has("caffeine"),
			pro: (one) => `${one.slug} wakes you up`,
		};

		// when the two are compared
		const { shared, apart: own } = compare([coffee, tea], (one) =>
			traitsOf(one, [named]),
		);

		// then neither is said for the other: same side, different words
		expect(words(shared)).toEqual([]);
		expect(apart(own)).toEqual([
			["coffee", ["pro: coffee wakes you up"]],
			["tea", ["pro: tea wakes you up"]],
		]);
	});

	it("shares only what the whole pool carries", () => {
		// given three options, two of them alike
		// when they are compared
		const { shared, apart: own } = compare([coffee, tea, juice], caffeine);

		// then what two of them share is not said over the three
		expect(words(shared)).toEqual([]);
		expect(apart(own)).toEqual([
			["coffee", ["pro: caffeine"]],
			["tea", ["pro: caffeine"]],
			["juice", ["con: not caffeine"]],
		]);
	});

	it("keeps the pool in the order it comes in", () => {
		// given a pool in an order of its own
		// when it is compared
		const { apart: own } = compare([juice, tea, coffee], caffeine);

		// then the cards come out in that order: none of them leads, so
		// nothing here may reorder them
		expect(own.map((entry) => entry.option.slug)).toEqual([
			"juice",
			"tea",
			"coffee",
		]);
	});

	it("hands a con its way out, wherever it ends up", () => {
		// given a con shared by every option left
		const { shared } = compare([juice], caffeine);
		const [con] = shared;

		// when it is read off the shared list
		// then it is still refusable: sharing a con is no reason to keep it
		expect(con?.tone).toBe("con");
		expect(con?.keep?.(coffee)).toBe(true);
		expect(con?.keep?.(juice)).toBe(false);
	});

	it("has nothing to compare in an empty pool", () => {
		// given nothing left standing
		// when it is compared
		// then there is nothing to say, on either side
		expect(compare([], caffeine)).toEqual({ shared: [], apart: [] });
	});
});
