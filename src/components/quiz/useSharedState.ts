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
	// The back button belongs to the page the reader came from, not to answers
	window.history.replaceState(null, "", url);
};

/**
 * Read on mount rather than at the first render: the page is built ahead of
 * time, and a first render reading the address would not match what it hydrates.
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
		// Rather than leave an address claiming answers nobody gave
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
