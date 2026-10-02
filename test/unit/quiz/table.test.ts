import { describe, expect, it } from "vitest";
import { traitsOf } from "../../../src/quiz/engine";
import { tabulate } from "../../../src/quiz/table";
import {
	axesFor,
	slugs,
	type Tagged,
	tagged,
} from "../../fixtures/tagged-quiz";

const axes = axesFor("fast", "cheap", "safe");
const traits = (option: Tagged) => traitsOf(option, axes);

describe("tabulate", () => {
	it("orders columns by most pros, then fewest cons", () => {
		const table = tabulate(
			[
				tagged("one", "fast"),
				tagged("all", "fast", "cheap", "safe"),
				tagged("two", "fast", "cheap"),
			],
			traits,
		);

		expect(slugs(table.columns)).toEqual(["all", "two", "one"]);
	});

	it("lists pros before cons, the most carried first", () => {
		const table = tabulate(
			[tagged("a", "cheap"), tagged("b", "fast", "cheap")],
			traits,
		);

		expect(table.rows.map((row) => row.label)).toEqual([
			"cheap",
			"fast",
			"not safe",
			"not fast",
		]);
	});

	it("marks which columns carry each row", () => {
		const table = tabulate([tagged("a", "fast"), tagged("b")], (option) =>
			traitsOf(option, axesFor("fast")),
		);

		expect(table.rows).toEqual([
			{
				key: "fast/pro/fast",
				label: "fast",
				tone: "pro",
				carried: [true, false],
				shared: false,
			},
			{
				key: "fast/con/not fast",
				label: "not fast",
				tone: "con",
				carried: [false, true],
				shared: false,
			},
		]);
	});

	it("marks rows every column carries as shared", () => {
		const table = tabulate([tagged("a", "fast"), tagged("b", "fast")], traits);
		const fast = table.rows.find((row) => row.label === "fast");

		expect(fast?.shared).toBe(true);
	});
});
