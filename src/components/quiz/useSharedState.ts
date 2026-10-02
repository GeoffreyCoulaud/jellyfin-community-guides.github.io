import { useEffect, useState } from "react";
import {
	type Option,
	type Quiz,
	type QuizState,
	startQuiz,
} from "../../quiz/engine";
import { decodeAnswers, encodeAnswers } from "../../quiz/share";

const writeUrl = (params: URLSearchParams) => {
	const url = new URL(window.location.href);
	url.search = params.toString();
	// Replaced, not pushed: the back button belongs to the previous page
	window.history.replaceState(null, "", url);
};

/** The state, kept in the URL so a link reopens the quiz where it was left. */
export const useSharedState = <O extends Option>(quiz: Quiz<O>) => {
	const [state, setState] = useState(() => startQuiz(quiz));

	// Read after mount: the page is prerendered, so the first render cannot use the URL
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.size === 0) {
			return;
		}

		const restored = decodeAnswers(quiz, params);
		if (restored === undefined) {
			writeUrl(new URLSearchParams());
		} else {
			setState(restored);
		}
	}, [quiz]);

	const update = (next: QuizState<O>) => {
		setState(next);
		writeUrl(encodeAnswers(next));
	};

	return [state, update] as const;
};
