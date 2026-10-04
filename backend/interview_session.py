from interview_engine import (
    generate_first_question,
    generate_next_question,
    conduct_turn,
    generate_final_feedback
)


class InterviewSession:

    def __init__(self, difficulty, total_questions):

        if difficulty not in [
            "easy",
            "medium",
            "hard"
        ]:
            raise ValueError(
                "Difficulty must be easy, medium, or hard."
            )

        if total_questions < 1:
            raise ValueError(
                "Number of questions must be at least 1."
            )

        self.difficulty = difficulty
        self.total_questions = total_questions

        self.question_number = 0

        self.current_question = None
        self.current_prompt = None

        self.follow_up_count = 0

        self.history = []
        self.previous_questions = []

        self.current_record = None

        self.completed = False

    def start(self):

        self.question_number = 1

        question = generate_first_question(
            self.difficulty
        )

        self.current_question = question
        self.current_prompt = question

        self.current_record = {
            "question": question,
            "turns": [],
            "pending_answer": None
        }

        self.previous_questions.append(
            question
        )

        return question

    def submit_answer(self, answer):

        self.current_record["pending_answer"] = answer

        result = conduct_turn(
            difficulty=self.difficulty,
            current_prompt=self.current_prompt,
            history=self.history,
            current_record=self.current_record,
            follow_up_count=self.follow_up_count
        )

        # --------------------------------
        # Store this answer + evaluation
        # --------------------------------

        self.current_record["turns"].append({
            "prompt": self.current_prompt,
            "answer": answer,
            "evaluation": result["evaluation"]
        })

        self.current_record["pending_answer"] = None

        # --------------------------------
        # REACT
        # --------------------------------

        if result["type"] == "react":

            self.follow_up_count += 1

            self.current_prompt = result["message"]

            return {
                "type": "react",
                "message": result["message"],
                "finished": False
            }

        # --------------------------------
        # HINT
        # --------------------------------

        if result["type"] == "hint":

            self.follow_up_count += 1

            return {
                "type": "hint",
                "message": result["message"],
                "finished": False
            }

        # --------------------------------
        # EVALUATE / FINISH TOPIC
        # --------------------------------

        self.history.append(
            self.current_record
        )

        # --------------------------------
        # Interview finished
        # --------------------------------

        if self.question_number >= self.total_questions:

            self.completed = True

            feedback = generate_final_feedback(
                difficulty=self.difficulty,
                history=self.history
            )

            return {
                "type": "complete",
                "message": (
                    "Thanks. That completes the interview. "
                    "I'll now prepare your final assessment."
                ),
                "feedback": feedback,
                "finished": True
            }

        # --------------------------------
        # Generate next main question
        # --------------------------------

        self.question_number += 1

        self.follow_up_count = 0

        next_question = generate_next_question(
            difficulty=self.difficulty,
            history=self.history,
            previous_questions=self.previous_questions
        )

        self.current_question = next_question
        self.current_prompt = next_question

        self.current_record = {
            "question": next_question,
            "turns": [],
            "pending_answer": None
        }

        self.previous_questions.append(
            next_question
        )

        return {
            "type": "next",
            "message": next_question,
            "finished": False
        }