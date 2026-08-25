import {
	applyAnswer,
	blockers,
	dropStep,
	nextQuestion,
	reconsider,
	resolve,
	rewind,
	type Option,
	type Quiz,
	type Trait,
} from "../../quiz/engine";
import { Asking } from "./Asking";
import { Progress } from "./Progress";
import { Recap } from "./Recap";
import { Result } from "./Result";
import { Shortlist } from "./Shortlist";
import { givesFirst } from "./Step";
import { Stuck } from "./Stuck";
import { useSharedState } from "./useSharedState";
import type { Doc } from "./Doc";
// The whole quiz is drawn from here, so this is the one file to bring its styles
import "./quiz.css";

export type { Doc };

type Props<O extends Option> = {
	quiz: Quiz<O>;
	doc: (option: O) => Doc;
	guides?: (option: O) => Doc[];
	/** What the option is like, pros and cons, whatever the quiz asked. */
	traits?: (option: O) => readonly Trait<O>[];
};

export const QuizRunner = <O extends Option>({
	quiz,
	doc,
	guides,
	traits,
}: Props<O>) => {
	const [state, setState] = useSharedState(quiz, traits);
	const question = nextQuestion(quiz, state);
	const outcome = resolve(quiz, state);
	const stuck =
		outcome.status === "over-constrained"
			? [...blockers(quiz, state)].sort(
					(a, b) => givesFirst(a) - givesFirst(b),
				)
			: [];
	// One left or several, the screen below names them all
	const named =
		outcome.status === "resolved" || outcome.status === "undecided";

	return (
		<div className="quiz not-content">
			{/* The screen below names what is left, so the bar has nothing to add
			    to it. Over-constrained keeps it: nothing is left to name there. */}
			{!named && <Progress quiz={quiz} state={state} doc={doc} />}

			{question !== undefined && (
				<Asking
					question={question}
					pool={state.pool}
					onAnswer={(picked) =>
						setState(applyAnswer(quiz, state, question, picked))
					}
				/>
			)}

			{outcome.status === "resolved" && (
				<Result
					option={outcome.option}
					doc={doc}
					guides={guides}
					traits={traits}
					onDealbreaker={(refused) =>
						setState(reconsider(quiz, state, refused))
					}
				/>
			)}

			{outcome.status === "undecided" && (
				<Shortlist
					options={outcome.options}
					doc={doc}
					guides={guides}
					traits={traits}
					onDealbreaker={(refused) =>
						setState(reconsider(quiz, state, refused))
					}
				/>
			)}

			{outcome.status === "over-constrained" && (
				<Stuck
					blocking={stuck}
					onDrop={(step) => setState(dropStep(quiz, state, step))}
				/>
			)}

			<Recap
				steps={state.steps}
				folded={question === undefined}
				onRewind={(index) => setState(rewind(quiz, state, index))}
			/>
		</div>
	);
};
