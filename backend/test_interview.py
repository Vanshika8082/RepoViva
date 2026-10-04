from interview_session import InterviewSession


print("=" * 60)
print("                    RepoViva")
print("               Technical Interview")
print("=" * 60)


print("\nChoose your difficulty:")
print("easy")
print("medium")
print("hard")

difficulty = input(
    "\nDifficulty: "
).strip().lower()


while difficulty not in [
    "easy",
    "medium",
    "hard"
]:

    print(
        "Please choose easy, medium, or hard."
    )

    difficulty = input(
        "Difficulty: "
    ).strip().lower()


while True:

    try:

        total_questions = int(
            input(
                "How many questions would you like? "
            )
        )

        if total_questions > 0:
            break

        print(
            "Please enter a number greater than 0."
        )

    except ValueError:

        print(
            "Please enter a valid number."
        )


print("\n" + "=" * 60)

print(
    "INTERVIEW STARTING"
)

print("=" * 60)


print(
    "\nInterviewer:\n"
    "Alright, let's get started. "
    "I'll ask you about your project and "
    "dig deeper where it makes sense."
)


session = InterviewSession(
    difficulty=difficulty,
    total_questions=total_questions
)


question = session.start()


print("\nInterviewer:")
print(question)


while not session.completed:

    print("\nYou:")

    answer = input("> ").strip()

    if not answer:

        print(
            "\nInterviewer:\n"
            "Take your time. Give me your best answer."
        )

        continue

    result = session.submit_answer(
        answer
    )

    # -----------------------------
    # Natural follow-up
    # -----------------------------

    if result["type"] == "react":

        print("\nInterviewer:")
        print(result["message"])

    # -----------------------------
    # Hint
    # -----------------------------

    elif result["type"] == "hint":

        print("\nInterviewer:")
        print(result["message"])

        print(
            "\nInterviewer:"
        )

        print(
            session.current_prompt
        )

    # -----------------------------
    # Next main question
    # -----------------------------

    elif result["type"] == "next":

        print("\nInterviewer:")
        print(
            "Alright, let's move on "
            "to another part of the project."
        )

        print(
            "\nInterviewer:"
        )

        print(
            result["message"]
        )

    # -----------------------------
    # Interview complete
    # -----------------------------

    elif result["type"] == "complete":

        print("\nInterviewer:")
        print(
            result["message"]
        )


# ==================================
# FINAL REPORT
# ==================================

print("\n" + "=" * 60)

print(
    "                 INTERVIEW COMPLETE"
)

print("=" * 60)


feedback = result["feedback"]


print("\nFINAL ASSESSMENT\n")


print(
    f"Overall Score: "
    f"{feedback['overall_score']}/10"
)


print(
    f"\nTechnical Understanding: "
    f"{feedback['technical_understanding']}/10"
)

print(
    feedback["technical_reason"]
)


print(
    f"\nCode Understanding: "
    f"{feedback['code_understanding']}/10"
)

print(
    feedback["code_reason"]
)


print(
    f"\nProblem Solving: "
    f"{feedback['problem_solving']}/10"
)

print(
    feedback["problem_solving_reason"]
)


print(
    f"\nEngineering Reasoning: "
    f"{feedback['engineering_reasoning']}/10"
)

print(
    feedback["engineering_reasoning_reason"]
)


print(
    f"\nDepth: "
    f"{feedback['depth']}/10"
)

print(
    feedback["depth_reason"]
)


print("\nStrengths:")
print(feedback["strengths"])


print("\nAreas to Improve:")
print(feedback["areas_to_improve"])


print("\nTopics to Review:")
print(feedback["topics_to_review"])


print("\nFinal Assessment:")
print(feedback["final_assessment"])