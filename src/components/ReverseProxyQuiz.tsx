import { reverseProxyQuiz } from "../quiz/reverse-proxy";
import { QuizRunner } from "./quiz/QuizRunner";

// Astro cannot pass the quiz's functions as props, so each quiz gets its own component
export const ReverseProxyQuiz = () => <QuizRunner quiz={reverseProxyQuiz} />;
