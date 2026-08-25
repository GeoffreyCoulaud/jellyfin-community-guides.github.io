import type { Option, Step, Trait } from "../../quiz/engine";

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

type Props<O extends Option> = {
	/** Whose card it is, and so what a refused con is cited by in a link. */
	option: O;
	traits: readonly Trait<O>[];
	/** Under the name of an option, or under a heading naming several. */
	level: "h3" | "h4";
	/** What the Dealbreaker buttons are for, wherever that is worth saying. */
	note?: string;
	onDealbreaker: (refused: Step<O>) => void;
};

/**
 * Pros and cons face to face. A side with nothing on it is left out rather than
 * headed and empty: a column reading "Cons" over blank space says there are
 * none in the least convincing way there is.
 */
export const Traits = <O extends Option>({
	option,
	traits,
	level,
	note,
	onDealbreaker,
}: Props<O>) => {
	const Heading = level;
	const pros = traits.filter((trait) => trait.tone === "pro");
	const cons = traits.filter((trait) => trait.tone === "con");
	if (pros.length === 0 && cons.length === 0) return null;

	return (
		<div className="quiz-block quiz-columns">
			{pros.length > 0 && (
				<div>
					<Heading className="quiz-heading">Pros</Heading>
					<ul className="quiz-traits">
						{pros.map((trait) => (
							<li className="quiz-pro" key={trait.id}>
								{trait.label}
							</li>
						))}
					</ul>
				</div>
			)}
			{cons.length > 0 && (
				<div>
					<Heading className="quiz-heading">Cons</Heading>
					{note !== undefined && <p className="quiz-note">{note}</p>}
					<ul className="quiz-traits">
						{cons.map((trait) => (
							<ConRow
								key={trait.id}
								option={option}
								trait={trait}
								onRefuse={onDealbreaker}
							/>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};
