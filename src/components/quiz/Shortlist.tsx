import { compare, type Option, type Step, type Trait } from "../../quiz/engine";
import { Emblem } from "../Emblem";
import { DocBlock, type Doc } from "./Doc";
import { Traits } from "./Traits";

type Props<O extends Option> = {
	/** Everything still standing, in pool order, none of them leading. */
	options: readonly O[];
	doc: (option: O) => Doc;
	guides?: (option: O) => Doc[];
	traits?: (option: O) => readonly Trait<O>[];
	onDealbreaker: (refused: Step<O>) => void;
};

/**
 * Several left and no question to tell them apart, so none is put forward: what
 * they share is said once over the lot, and each card is left with what only it
 * says. Every question that could have decided this has been asked, which is
 * what makes the rest the reader's own call rather than the quiz ducking one.
 */
export const Shortlist = <O extends Option>({
	options,
	doc,
	guides,
	traits,
	onDealbreaker,
}: Props<O>) => {
	const { shared, apart } = compare(options, traits ?? (() => []));
	// A shared con is refused off a card like any other, and the first one left
	// standing is the card a link then cites it by
	const [carrier] = options;
	// Nothing said anywhere is a quiz with no cards to read, which is not the
	// same as a card with nothing of its own on it
	const described =
		shared.length > 0 || apart.some((card) => card.traits.length > 0);

	return (
		<section>
			<h2 className="quiz-title">Nothing left to ask</h2>
			<p className="quiz-note">
				Your answers leave {options.length} standing, and no question
				tells them apart. Here is what they have in common, then what
				each one has of its own.
			</p>
			<p className="quiz-note">
				Is one of the cons a dealbreaker? Say so, and the quiz runs
				again with every option carrying it gone.
			</p>

			{carrier !== undefined && shared.length > 0 && (
				<div className="quiz-block quiz-shared">
					<h3 className="quiz-title quiz-subtitle">
						Whichever you pick
					</h3>
					<Traits
						option={carrier}
						traits={shared}
						level="h4"
						onDealbreaker={onDealbreaker}
					/>
				</div>
			)}

			<ul className="quiz-cards">
				{apart.map(({ option, traits: own }) => {
					const page = doc(option);
					const extra = guides?.(option) ?? [];

					return (
						<li className="quiz-card" key={option.slug}>
							<h3 className="quiz-title quiz-subtitle">
								<Emblem emblem={page.emblem} withPips />
								<a href={page.href}>{page.title}</a>
							</h3>
							{own.length > 0 ? (
								<Traits
									option={option}
									traits={own}
									level="h4"
									onDealbreaker={onDealbreaker}
								/>
							) : (
								described && (
									<p className="quiz-note">
										Nothing the others do not also say.
									</p>
								)
							)}
							{extra.length > 0 && (
								<DocBlock
									heading="You will also need"
									docs={extra}
								/>
							)}
						</li>
					);
				})}
			</ul>
		</section>
	);
};
