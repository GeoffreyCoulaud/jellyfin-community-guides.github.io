import type { Trait } from "../../quiz/engine";

const TraitList = ({
	heading,
	traits,
}: {
	heading: string;
	traits: readonly Trait[];
}) => (
	<div>
		<h3 className="quiz-heading">{heading}</h3>
		<ul className="quiz-traits">
			{traits.map((trait) => (
				<li className={`quiz-${trait.tone}`} key={trait.id}>
					{trait.label}
				</li>
			))}
		</ul>
	</div>
);

/** A side with nothing on it is left out. */
export const Traits = ({ traits }: { traits: readonly Trait[] }) => {
	const pros = traits.filter((trait) => trait.tone === "pro");
	const cons = traits.filter((trait) => trait.tone === "con");

	return (
		<div className="quiz-block quiz-columns">
			{pros.length > 0 && <TraitList heading="Pros" traits={pros} />}
			{cons.length > 0 && <TraitList heading="Cons" traits={cons} />}
		</div>
	);
};
