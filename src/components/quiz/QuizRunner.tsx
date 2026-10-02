import {
	answerQuestion,
	nextQuestion,
	type Option,
	type Quiz,
	resolve,
	rewind,
} from "../../quiz/engine";
import { Asking } from "./Asking";
import { Comparison } from "./Comparison";
import { Progress } from "./Progress";
import { Recap } from "./Recap";
import { Result } from "./Result";
import { useSharedState } from "./useSharedState";
import "./quiz.css";

export const QuizRunner = <O extends Option>({ quiz }: { quiz: Quiz<O> }) => {
	const [state, setState] = useSharedState(quiz);
	const question = nextQuestion(quiz, state);
	const outcome = resolve(quiz, state);

	if (question !== undefined) {
		const answered = state.answers.length;

		return (
			<div className="quiz not-content">
				<Progress quiz={quiz} state={state} />
				<Asking
					question={question}
					pool={state.pool}
					onAnswer={(answer) =>
						setState(answerQuestion(quiz, state, question, answer))
					}
					onBack={
						answered > 0
							? () => setState(rewind(quiz, state, answered - 1))
							: undefined
					}
				/>
			</div>
		);
	}

	return (
		<div className="quiz not-content">
			{outcome.status === "resolved" && (
				<Result quiz={quiz} option={outcome.option} />
			)}
			{outcome.status === "undecided" && (
				<Comparison quiz={quiz} options={outcome.options} />
			)}
			<Recap
				answers={state.answers}
				onChange={(index) => setState(rewind(quiz, state, index))}
			/>
		</div>
	);
};
