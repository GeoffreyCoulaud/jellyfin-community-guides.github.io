/** The cards as a grid, once nothing is left to ask. */

import { describe, expect, it } from "vitest";
import {
	describe as traitsOf,
	type Axis,
	type Option,
} from "../../../src/quiz/engine";
import { tabulate, type Table } from "../../../src/quiz/table";
import { has, lacks, tagged, type Tagged } from "../../fixtures/tagged-quiz";

/** The rows every column carries, which tell none of them from another. */
const alike = <O extends Option>(table: Table<O>) =>
	table.rows.filter((row) => row.shared).map((row) => row.label);

/** One side only, so an option can carry more of one than of the other. */
const axes: readonly Axis<Tagged>[] = [
	{ id: "sweet", holds: has("sweet"), pro: "sweet" },
	{ id: "cheap", holds: has("cheap"), pro: "cheap" },
	{ id: "slow", holds: lacks("slow"), con: "slow" },
	{ id: "loud", holds: lacks("loud"), con: "loud" },
];

const read = (one: Tagged) => traitsOf(one, axes);

/** The table as one line per row: what it says, and which columns say it. */
const grid = <O extends Option>(table: Table<O>) =>
	table.rows.map(
		(row) =>
			`${row.tone}: ${row.label} ` +
			row.carried.map((carried) => (carried ? "x" : ".")).join(""),
	);

const named = <O extends Option>(table: Table<O>) =>
	table.columns.map((option) => option.slug);

describe("tabulate", () => {
	it("leads with the option carrying the most pros", () => {
		// given three cards, one of them saying more for itself than the others
		const two = tagged("two", "sweet", "cheap");
		const one = tagged("one", "sweet");
		const none = tagged("none");

		// when they are tabulated
		const table = tabulate([none, one, two], read);

		// then the columns come out in that order, whatever order the pool was in
		expect(named(table)).toEqual(["two", "one", "none"]);
	});

	it("puts the fewest cons first, pros being equal", () => {
		// given two cards saying as much for themselves, one of them worse off
		const clean = tagged("clean", "sweet");
		const noisy = tagged("noisy", "sweet", "loud");

		// when they are tabulated
		const table = tabulate([noisy, clean], read);

		// then the one with less against it leads
		expect(named(table)).toEqual(["clean", "noisy"]);
	});

	it("says every pro before any con, widest first", () => {
		// given a pool where each side has something two of them carry
		const first = tagged("first", "sweet", "cheap", "slow");
		const second = tagged("second", "sweet", "slow", "loud");
		const third = tagged("third");

		// when it is tabulated
		const table = tabulate([first, second, third], read);

		// then the pros come first, each side ordered by how many carry it
		expect(grid(table)).toEqual([
			"pro: sweet xx.",
			"pro: cheap x..",
			"con: slow xx.",
			"con: loud .x.",
		]);
	});

	it("keeps the order the axes are declared in between ties", () => {
		// given two cons carried by as many options as each other
		const one = tagged("one", "slow", "loud");
		const other = tagged("other");

		// when they are tabulated
		const table = tabulate([one, other], read);

		// then neither jumps the other: the axes are the only order left, the
		// column carrying them both having been sorted behind the clean one
		expect(named(table)).toEqual(["other", "one"]);
		expect(grid(table)).toEqual(["con: slow .x", "con: loud .x"]);
	});

	it("marks what every column carries as telling none of them apart", () => {
		// given something said of all of them, and something said of one
		const one = tagged("one", "sweet", "cheap");
		const other = tagged("other", "sweet");

		// when they are tabulated
		const table = tabulate([one, other], read);

		// then both are rows, the one ticked all the way across being the one
		// the screen can fold away: what it says is no reason to pick either
		expect(grid(table)).toEqual(["pro: sweet xx", "pro: cheap x."]);
		expect(alike(table)).toEqual(["sweet"]);
	});

	it("tells two rows apart on the words, not on the axis", () => {
		// given an axis holding of both, worded off the option it describes
		const named: Axis<Tagged> = {
			id: "sweet",
			holds: has("sweet"),
			pro: (one) => `${one.slug} is sweet`,
		};
		const one = tagged("one", "sweet");
		const other = tagged("other", "sweet");

		// when the two are tabulated
		const table = tabulate([one, other], (drink) => traitsOf(drink, [named]));

		// then neither row is said for the other: same side, different words
		expect(grid(table)).toEqual([
			"pro: one is sweet x.",
			"pro: other is sweet .x",
		]);
		expect(alike(table)).toEqual([]);
	});

	it("hands a con its way out even when every column carries it", () => {
		// given a con on both of them
		const one = tagged("one", "loud");
		const other = tagged("other", "loud");

		// when they are tabulated
		const [row] = tabulate([one, other], read).rows;

		// then it is still refusable: sharing a con is no reason to keep it
		expect(row?.shared).toBe(true);
		expect(row?.refusal?.keep(one)).toBe(false);
		expect(row?.refusal?.keep(tagged("quiet"))).toBe(true);
	});

	it("hands a con its way out, cited by a column carrying it", () => {
		// given a con on the second column only
		const clean = tagged("clean", "sweet");
		const noisy = tagged("noisy", "loud");

		// when it is tabulated
		const table = tabulate([clean, noisy], read);
		const [pro, con] = table.rows;

		// then refusing it keeps what does not carry it, off the card it is read
		expect(pro?.refusal).toBeUndefined();
		expect(con?.refusal?.option).toBe(noisy);
		expect(con?.refusal?.keep(clean)).toBe(true);
		expect(con?.refusal?.keep(noisy)).toBe(false);
	});

	it("has nothing to tabulate in an empty pool", () => {
		// given nothing left standing
		// when it is tabulated
		// then there is no column to head and no row to fill
		expect(tabulate([], read)).toEqual({ columns: [], rows: [] });
	});
});
