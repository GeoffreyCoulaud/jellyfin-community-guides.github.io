/** The comparison matrix: one column per option, one row per pro or con. */

import type { Option, Trait } from "./engine";

export type Row = {
	key: string;
	label: string;
	tone: Trait["tone"];
	/** Whether each column has it, in column order. */
	carried: readonly boolean[];
	/** Every column has it, so it tells none of them apart. */
	shared: boolean;
};

export type Table<O extends Option> = {
	columns: readonly O[];
	rows: readonly Row[];
};

/** Traits reading the same on two options share a row. */
const rowKey = (trait: Trait) => `${trait.id}/${trait.tone}/${trait.label}`;

const countTone = (traits: readonly Trait[], tone: Trait["tone"]) =>
	traits.filter((trait) => trait.tone === tone).length;

const toneOrder = { pro: 0, con: 1 };

/**
 * Columns go from most pros to fewest cons, rows from pros to cons, each side
 * from the most carried. Ties keep the order the axes are declared in.
 */
export const tabulate = <O extends Option>(
	pool: readonly O[],
	traitsOf: (option: O) => readonly Trait[],
): Table<O> => {
	const cards = pool
		.map((option) => ({ option, traits: traitsOf(option) }))
		.toSorted(
			(one, other) =>
				countTone(other.traits, "pro") - countTone(one.traits, "pro") ||
				countTone(one.traits, "con") - countTone(other.traits, "con"),
		);

	const traitsByKey = new Map<string, Trait>();
	for (const card of cards) {
		for (const trait of card.traits) {
			if (!traitsByKey.has(rowKey(trait))) {
				traitsByKey.set(rowKey(trait), trait);
			}
		}
	}

	const rows = [...traitsByKey].map(([key, trait]): Row => {
		const carried = cards.map((card) =>
			card.traits.some((one) => rowKey(one) === key),
		);
		return {
			key,
			label: trait.label,
			tone: trait.tone,
			carried,
			shared: carried.every(Boolean),
		};
	});

	const carriers = (row: Row) => row.carried.filter(Boolean).length;

	return {
		columns: cards.map((card) => card.option),
		rows: rows.toSorted(
			(one, other) =>
				toneOrder[one.tone] - toneOrder[other.tone] ||
				carriers(other) - carriers(one),
		),
	};
};
