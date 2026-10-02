import {
	type Option,
	type Quiz,
	type QuizState,
	questionsLeft,
} from "../../quiz/engine";

/** The average of options ruled out and questions answered. */
export const Progress = <O extends Option>({
	quiz,
	state,
}: {
	quiz: Quiz<O>;
	state: QuizState<O>;
}) => {
	const total = quiz.options.length;
	const asked = state.answers.length;
	const left = questionsLeft(quiz, state);
	// Out of `total - 1`: the last option standing ends the quiz
	const byOptions = (total - state.pool.length) / Math.max(total - 1, 1);
	const byQuestions = asked / Math.max(asked + left, 1);
	const done = Math.round(((byOptions + byQuestions) / 2) * 100);

	return (
		<div
			className="quiz-bar"
			role="progressbar"
			aria-label="Quiz progress"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={done}
		>
			<span className="quiz-bar-fill" style={{ width: `${done}%` }} />
		</div>
	);
};
