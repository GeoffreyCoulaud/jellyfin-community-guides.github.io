import type { Option, Step, Trait } from "../../quiz/engine";
import "./traits.css";

type ConProps<O extends Option> = {
	option: O;
	trait: Trait<O>;
	onRefuse: (refused: Step<O>) => void;
};

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
	/** Whose card it is: a refused con is cited by the option it was read on. */
	option: O;
	traits: readonly Trait<O>[];
	level: "h3" | "h4";
	note?: string;
	onDealbreaker: (refused: Step<O>) => void;
};

/** A side with nothing on it is left out rather than headed and empty. */
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
