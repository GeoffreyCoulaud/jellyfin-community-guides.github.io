/** What the result card says about one option, read off the axes. */

import { describe, expect, it } from "vitest";
import { describe as traitsOf, type Axis } from "../../../src/quiz/engine";
import { has, tagged, type Tagged } from "../../fixtures/tagged-quiz";

const caffeine: Axis<Tagged> = {
	id: "caffeine",
	holds: has("caffeine"),
	pro: "Wakes you up",
	con: "Will not wake you up",
};

const coffee = tagged("coffee", "caffeine");
const juice = tagged("juice");

describe("describe", () => {
	it("reads a pro off a property that holds", () => {
		// given an option carrying what the axis tests
		// when it is described
		const traits = traitsOf(coffee, [caffeine]);

		// then the axis is read on its pro side
		expect(traits).toEqual([
			{ id: "caffeine", label: "Wakes you up", tone: "pro" },
		]);
	});

	it("reads a con off a property that does not hold", () => {
		// given an option the axis does not hold of
		// when it is described
		const [trait] = traitsOf(juice, [caffeine]);

		// then the axis is read on its con side
		expect(trait).toMatchObject({
			id: "caffeine",
			label: "Will not wake you up",
			tone: "con",
		});
	});

	it("gives a con the way out of it", () => {
		// given a con read off an option
		const [trait] = traitsOf(juice, [caffeine]);

		// when the con is refused
		// then what is left is the options the property holds of
		expect(trait?.keep?.(coffee)).toBe(true);
		expect(trait?.keep?.(juice)).toBe(false);
	});

	it("leaves a pro without a way out", () => {
		// given a pro read off an option
		// when the card offers it
		const [trait] = traitsOf(coffee, [caffeine]);

		// then there is nothing to refuse: a dealbreaker is a con or nothing
		expect(trait?.keep).toBeUndefined();
	});

	it("says nothing of a property worth a word only when it is missing", () => {
		// given an axis with no pro written
		const axis: Axis<Tagged> = {
			id: "caffeine",
			holds: has("caffeine"),
			con: "Will not wake you up",
		};

		// when an option carrying it is described
		// then the axis is left off the card
		expect(traitsOf(coffee, [axis])).toEqual([]);
	});

	it("says nothing of a property worth a word only when it holds", () => {
		// given an axis with no con written
		const axis: Axis<Tagged> = {
			id: "caffeine",
			holds: has("caffeine"),
			pro: "Wakes you up",
		};

		// when an option without it is described
		// then the axis is left off the card
		expect(traitsOf(juice, [axis])).toEqual([]);
	});

	it("skips an axis that has nothing to do with the option", () => {
		// given an axis that only applies to what is served hot
		const axis: Axis<Tagged> = {
			id: "milk",
			applies: has("hot"),
			holds: has("milk"),
			pro: "Takes milk",
			con: "Drunk black",
		};

		// when a cold option is described
		// then neither side is read: the axis does not apply
		expect(traitsOf(juice, [axis])).toEqual([]);
	});

	it("reads a label off the option it describes", () => {
		// given an axis wording itself from the option
		const axis: Axis<Tagged> = {
			id: "caffeine",
			holds: has("caffeine"),
			pro: (one) => `${one.slug} wakes you up`,
		};

		// when an option is described
		const [trait] = traitsOf(coffee, [axis]);

		// then the label carries what the option says
		expect(trait?.label).toBe("coffee wakes you up");
	});

	it("keeps the axes in the order they are declared", () => {
		// given two axes, both worth a word about the option
		const hot: Axis<Tagged> = {
			id: "hot",
			holds: has("hot"),
			con: "Served cold",
		};

		// when the option is described
		const traits = traitsOf(coffee, [hot, caffeine]);

		// then the card reads them in that order
		expect(traits.map((trait) => trait.id)).toEqual(["hot", "caffeine"]);
	});
});
