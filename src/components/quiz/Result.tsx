import type { Option, Step, Trait } from "../../quiz/engine";
import { Emblem } from "../Emblem";
import { DocBlock, sameLink, type Doc } from "./Doc";

type ConProps<O extends Option> = {
	/** Whose card it is: a con is worded off the option it was read on. */
	option: O;
	trait: Trait<O>;
	onRefuse: (refused: Step<O>) => void;
};

/** A con, and the way out of it: refusing it is asking for the options without it. */
const ConRow = <O extends Option>({ option, trait, onRefuse }: ConProps<O>) => {
	const refuse = trait.keep;

	return (
		<li className="quiz-con">
			<span>{trait.label}</span>
			{refuse !== undefined && (
				<button
					type="button"
					onClick={() =>
						onRefuse({
							id: trait.id,
							label: trait.label,
							keep: refuse,
							option,
						})
					}
				>
					Dealbreaker
				</button>
			)}
		</li>
	);
};

type TraitsProps<O extends Option> = {
	option: O;
	traits: readonly Trait<O>[];
	onDealbreaker: (refused: Step<O>) => void;
};

const Traits = <O extends Option>({
	option,
	traits,
	onDealbreaker,
}: TraitsProps<O>) => (
	<div className="quiz-block quiz-columns">
		<div>
			<h3 className="quiz-heading">Pros</h3>
			<ul className="quiz-traits">
				{traits
					.filter((trait) => trait.tone === "pro")
					.map((trait) => (
						<li className="quiz-pro" key={trait.id}>
							{trait.label}
						</li>
					))}
			</ul>
		</div>
		<div>
			<h3 className="quiz-heading">Cons</h3>
			<p className="quiz-note">
				One&rsquo;s a dealbreaker? Say so to rerun the quiz
			</p>
			<ul className="quiz-traits">
				{traits
					.filter((trait) => trait.tone === "con")
					.map((trait) => (
						<ConRow
							key={trait.id}
							option={option}
							trait={trait}
							onRefuse={onDealbreaker}
						/>
					))}
			</ul>
		</div>
	</div>
);

type Props<O extends Option> = {
	option: O;
	alternatives: readonly O[];
	doc: (option: O) => Doc;
	guides?: (option: O) => Doc[];
	traits?: (option: O) => Trait<O>[];
	onDealbreaker: (refused: Step<O>) => void;
};

export const Result = <O extends Option>({
	option,
	alternatives,
	doc,
	guides,
	traits,
	onDealbreaker,
}: Props<O>) => {
	const match = doc(option);
	const extra = guides?.(option) ?? [];
	const listed = traits?.(option) ?? [];
	// Running one tool two ways is two options, and one page to send them to
	const others = alternatives
		.map(doc)
		.filter((other) => !sameLink(other, match))
		.filter(
			(other, index, all) =>
				all.findIndex((one) => sameLink(one, other)) === index,
		);

	return (
		<section>
			{/* The name is the link to the guide, so nothing is asked for twice */}
			<h2 className="quiz-title quiz-result-title">
				<Emblem emblem={match.emblem} size="title" withPips />
				<a href={match.href}>{match.title}</a>
			</h2>

			{listed.length > 0 && (
				<Traits
					option={option}
					traits={listed}
					onDealbreaker={onDealbreaker}
				/>
			)}

			{extra.length > 0 && (
				<DocBlock heading="You will also need" docs={extra} />
			)}

			{others.length > 0 && (
				<DocBlock
					heading="Also left standing"
					note={`Nothing left to ask tells these apart from ${match.title}.`}
					docs={others}
				/>
			)}
		</section>
	);
};
