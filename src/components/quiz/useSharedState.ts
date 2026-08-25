import { useEffect, useState } from "react";
import {
	startQuiz,
	type Option,
	type Quiz,
	type QuizState,
	type Trait,
} from "../../quiz/engine";
import { decodeState, encodeState, type Cited } from "../../quiz/share";

/** The answers, and nothing else: an answer taken back has to leave the address. */
const write = (cited: readonly Cited[]) => {
	const url = new URL(window.location.href);
	url.search = new URLSearchParams([...cited]).toString();
	// replaceState: the back button belongs to the page the reader came from,
	// the recap being where answers are taken back
	window.history.replaceState(null, "", url);
};

/**
 * The quiz state, with the address bar holding what was answered so a result
 * can be sent to someone. Read on mount rather than at the first render: the
 * page is built ahead of time, and a first render reading the address would not
 * match the HTML it hydrates.
 */
export const useSharedState = <O extends Option>(
	quiz: Quiz<O>,
	traits?: (option: O) => readonly Trait<O>[],
): [QuizState<O>, (next: QuizState<O>) => void] => {
	const [state, setState] = useState(() => startQuiz(quiz));

	useEffect(() => {
		const params = [...new URL(window.location.href).searchParams];
		if (params.length === 0) return;
		const restored = decodeState(quiz, params, traits);
		// Nothing this quiz can read, so nothing to restore: dropping it says as
		// much, rather than leaving an address claiming answers nobody gave
		if (restored === undefined) write([]);
		else setState(restored);
	}, []);

	return [
		state,
		(next) => {
			setState(next);
			write(encodeState(next) ?? []);
		},
	];
};
