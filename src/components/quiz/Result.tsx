import type { Option, Step, Trait } from "../../quiz/engine";
import { Emblem } from "../Emblem";
import { DocBlock, type Doc } from "./Doc";
import { Traits } from "./Traits";

type Props<O extends Option> = {
	option: O;
	doc: (option: O) => Doc;
	guides?: (option: O) => Doc[];
	traits?: (option: O) => readonly Trait<O>[];
	onDealbreaker: (refused: Step<O>) => void;
};

/** The one option left standing, and what it is like. */
export const Result = <O extends Option>({
	option,
	doc,
	guides,
	traits,
	onDealbreaker,
}: Props<O>) => {
	const match = doc(option);
	const extra = guides?.(option) ?? [];

	return (
		<section>
			{/* The name is the link to the guide, so nothing is asked for twice */}
			<h2 className="quiz-title quiz-result-title">
				<Emblem emblem={match.emblem} size="title" withPips />
				<a href={match.href}>{match.title}</a>
			</h2>

			<Traits
				option={option}
				traits={traits?.(option) ?? []}
				level="h3"
				note="One’s a dealbreaker? Say so to rerun the quiz"
				onDealbreaker={onDealbreaker}
			/>

			{extra.length > 0 && (
				<DocBlock heading="You will also need" docs={extra} />
			)}
		</section>
	);
};
