/**
 * The pool as a grid: one column per option, one row per thing said. None of it
 * decides anything, which is why it is not the engine's: an order to read in is
 * a matter of what a page can hold.
 */

import type { Option, Step, Trait } from "./engine";

/** Two cards saying the same thing: same axis, same side, same words. */
const worded = <O extends Option>(trait: Trait<O>) =>
	`${trait.id}/${trait.tone}/${trait.label}`;

export type Row<O extends Option> = {
	key: string;
	label: string;
	tone: "pro" | "con";
	/** Whether each column carries it, in column order. */
	carried: readonly boolean[];
	/** Carried by every column, and so telling none of them from another. */
	shared: boolean;
	/** A con and the way out of it, cited by the first column carrying it. */
	refusal?: Step<O>;
};

export type Table<O extends Option> = {
	/** The options left, most pros first, then fewest cons. */
	columns: readonly O[];
	/** Pros before cons, each side widest-carried first. */
	rows: readonly Row<O>[];
};

const count = <O extends Option>(
	traits: readonly Trait<O>[],
	tone: Trait<O>["tone"],
) => traits.filter((trait) => trait.tone === tone).length;

/**
 * Columns lead with the most pros, then the fewest cons, which is an order to
 * read in and not a ranking: the quiz ran out of questions, so counting words
 * on a card is the whole of what anyone here can do to them.
 */
export const tabulate = <O extends Option>(
	pool: readonly O[],
	traits: (option: O) => readonly Trait<O>[],
): Table<O> => {
	const cards = pool
		.map((option) => ({ option, traits: traits(option) }))
		.sort(
			(one, other) =>
				count(other.traits, "pro") - count(one.traits, "pro") ||
				count(one.traits, "con") - count(other.traits, "con"),
		);
	// First card carrying it, so a refused con is cited by a column that has it
	const first = new Map<string, { trait: Trait<O>; option: O }>();
	for (const card of cards)
		for (const trait of card.traits)
			if (!first.has(worded(trait)))
				first.set(worded(trait), { trait, option: card.option });
	const sides = { pro: 0, con: 1 };
	const carriers = (row: Row<O>) =>
		row.carried.filter((carried) => carried).length;

	return {
		columns: cards.map((card) => card.option),
		// Ties keep the order the axes are declared in, which the map preserves
		rows: [...first.entries()]
			.map(([key, { trait, option }]): Row<O> => {
				const carried = cards.map((card) =>
					card.traits.some((one) => worded(one) === key),
				);
				return {
					key,
					label: trait.label,
					tone: trait.tone,
					carried,
					shared: carried.every((one) => one),
					...(trait.keep !== undefined && {
						refusal: {
							id: trait.id,
							label: trait.label,
							keep: trait.keep,
							option,
						},
					}),
				};
			})
			.sort(
				(one, other) =>
					sides[one.tone] - sides[other.tone] ||
					carriers(other) - carriers(one),
			),
	};
};
