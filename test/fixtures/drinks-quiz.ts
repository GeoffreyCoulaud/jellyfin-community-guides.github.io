/**
 * The smallest quiz with something of each kind to name: two questions, an
 * answer that rules nothing out, and cards carrying cons to refuse.
 */

import {
	describe,
	keepAll,
	type Axis,
	type Question,
	type Quiz,
} from "../../src/quiz/engine";

export type Drink = { slug: string; hot: boolean; caffeinated: boolean };

const drinks = [
	{ slug: "coffee", hot: true, caffeinated: true },
	{ slug: "tea", hot: true, caffeinated: false },
	{ slug: "lemonade", hot: false, caffeinated: false },
] as const satisfies readonly Drink[];

const questions = [
	{
		id: "temperature",
		kind: "preference",
		question: "Hot or cold?",
		answers: [
			{ id: "hot", label: "Hot", keep: (one: Drink) => one.hot },
			{ id: "cold", label: "Cold", keep: (one: Drink) => !one.hot },
			{ id: "either", label: "Either", keep: keepAll },
		],
	},
	{
		id: "caffeine",
		kind: "fact",
		question: "Caffeine?",
		answers: [
			{ id: "yes", label: "Yes", keep: (one: Drink) => one.caffeinated },
			{ id: "no", label: "No", keep: (one: Drink) => !one.caffeinated },
		],
	},
] as const satisfies readonly Question<Drink>[];

const axes: readonly Axis<Drink>[] = [
	{
		id: "caffeine",
		holds: (one) => one.caffeinated,
		pro: "Wakes you up",
		con: "Will not wake you up",
	},
	{ id: "temperature", holds: (one) => one.hot, con: "Served cold" },
];

export const drinksQuiz: Quiz<Drink> = { options: drinks, questions };

export const drinkTraits = (drink: Drink) => describe(drink, axes);

export const drink = (slug: string) =>
	drinksQuiz.options.find((one) => one.slug === slug)!;
