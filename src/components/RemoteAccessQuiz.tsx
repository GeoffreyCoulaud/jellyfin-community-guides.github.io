import { remoteAccessQuiz } from "../quiz/remote-access";
import { QuizRunner } from "./quiz/QuizRunner";

// Astro cannot pass the quiz's functions as props, so each quiz gets its own component
export const RemoteAccessQuiz = () => <QuizRunner quiz={remoteAccessQuiz} />;
