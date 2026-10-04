import re

from groq_client import generate_response
from retrieval import search_similar_chunks


DIFFICULTY_PROFILE = {
    "easy": """
The candidate should demonstrate a basic understanding of their own project.

Focus on:
- What important features do
- Basic data flow
- Responsibilities of functions or components
- Simple implementation decisions

Do not expect advanced architecture.
""",

    "medium": """
The candidate should demonstrate solid understanding of how and why
their implementation works.

Focus on:
- Data flow
- Component interaction
- Design decisions
- Trade-offs
- Error handling
- Edge cases
- Practical consequences
""",

    "hard": """
The candidate should demonstrate deep engineering understanding.

Focus on:
- Architecture
- Scalability
- Performance
- Security
- Reliability
- Failure modes
- Trade-offs
- Alternative designs
- Production readiness

Everything must remain grounded in the actual project.
"""
}


QUESTION_TYPES = [
    "project understanding",
    "technical implementation",
    "data flow",
    "design decisions and trade-offs",
    "edge cases and failure modes",
    "performance and scalability",
    "architecture and future improvements"
]


def clean_question(text):
    text = text.strip()

    prefixes = [
        "Question:",
        "Q:",
        "Interview Question:",
        "Technical Question:"
    ]

    for prefix in prefixes:
        if text.lower().startswith(prefix.lower()):
            text = text[len(prefix):].strip()

    return text.split("\n")[0].strip()


def extract_field(text, field, default=""):
    pattern = rf"^{re.escape(field)}:\s*(.+?)(?=\n[A-Z_]+:|$)"

    match = re.search(
        pattern,
        text,
        re.IGNORECASE | re.MULTILINE | re.DOTALL
    )

    if match:
        return match.group(1).strip()

    return default


def extract_score(text, field):
    value = extract_field(text, field, "0")

    match = re.search(r"\d+", value)

    if match:
        score = int(match.group())

        return max(0, min(10, score))

    return 0


def get_repository_context(query, limit=6):

    results = search_similar_chunks(
        query,
        limit=limit
    )

    context = []

    for result in results:

        context.append(
            f"File: {result['source']}\n"
            f"Language: {result['language']}\n"
            f"Code:\n{result['content']}"
        )

    return "\n\n---\n\n".join(context)


def format_history(history):

    if not history:
        return "No previous interview conversation."

    sections = []

    for index, record in enumerate(history, start=1):

        text = [
            f"MAIN TOPIC {index}:",
            record["question"]
        ]

        for turn in record["turns"]:

            text.append(
                f"Interviewer: {turn['prompt']}"
            )

            text.append(
                f"Candidate: {turn['answer']}"
            )

            if turn.get("evaluation"):
                evaluation = turn["evaluation"]

                text.append(
                    f"Internal evaluation: "
                    f"correctness={evaluation['correctness']}, "
                    f"clarity={evaluation['clarity']}, "
                    f"depth={evaluation['depth']}"
                )

        sections.append("\n".join(text))

    return "\n\n====================\n\n".join(sections)


def generate_first_question(difficulty):

    context = get_repository_context(
        "What are the most important features and technical components "
        "of this project?"
    )

    prompt = f"""
You are a senior software engineer conducting a real one-on-one
technical interview.

You are sitting across from the candidate.

This is the FIRST question.

DIFFICULTY:
{difficulty}

DIFFICULTY PROFILE:
{DIFFICULTY_PROFILE[difficulty]}

PROJECT CONTEXT:
{context}

Ask one natural opening technical question about the candidate's project.

RULES:

- Ask exactly ONE question.
- Keep it concise.
- Sound like a real human interviewer.
- Do not sound like a quiz.
- Do not ask multiple things.
- Do not ask syntax or memorization questions.
- Do not ask about CSS or visual styling.
- Do not mention "provided code".
- Do not mention "context".
- Do not give the answer.
- Do not give feedback.
- Return ONLY the question.
"""

    return clean_question(
        generate_response(prompt)
    )


def generate_next_question(
    difficulty,
    history,
    previous_questions
):

    history_text = format_history(history)

    previous_text = "\n".join(
        f"- {question}"
        for question in previous_questions
    )

    query = f"""
Find an important technical aspect of this repository that has not already
been discussed.

Previous questions:
{previous_text}
"""

    context = get_repository_context(query)

    question_type = QUESTION_TYPES[
        len(previous_questions) % len(QUESTION_TYPES)
    ]

    prompt = f"""
You are a senior software engineer conducting a realistic technical
interview about the candidate's own GitHub project.

DIFFICULTY:
{difficulty}

DIFFICULTY PROFILE:
{DIFFICULTY_PROFILE[difficulty]}

TARGET AREA:
{question_type}

REPOSITORY CONTEXT:
{context}

PREVIOUS INTERVIEW:
{history_text}

PREVIOUS MAIN QUESTIONS:
{previous_text}

Generate the next MAIN interview question.

RULES:

- Ask exactly ONE question.
- Keep it conversational.
- Ask about something that has not already been covered.
- Build naturally on the previous conversation when appropriate.
- Do not repeat or rephrase an earlier question.
- Do not ask multiple questions.
- Do not ask syntax or memorization questions.
- Do not ask CSS or visual styling questions.
- Do not give feedback.
- Do not give the answer.
- Do not mention "provided code" or "retrieved context".
- Do not sound like a quiz.
- Return ONLY the question.

The candidate should feel like they are speaking with an experienced
software engineer.
"""

    return clean_question(
        generate_response(prompt)
    )


def conduct_turn(
    difficulty,
    current_prompt,
    history,
    current_record,
    follow_up_count
):
    """
    Evaluate the candidate's latest answer internally and decide
    what the interviewer should do next.
    """

    current_answer = current_record["pending_answer"]

    previous_history = format_history(history)

    context = get_repository_context(
        current_prompt
    )

    if follow_up_count >= 2:

        follow_up_rule = """
The maximum number of follow-ups has been reached.

Evaluate the candidate's answer and finish this topic.
Do not ask another follow-up.
"""

    else:

        follow_up_rule = """
After evaluating the candidate's answer, choose the most appropriate
next action:

REACT:
The answer contains something worth exploring.
Ask ONE focused follow-up.

HINT:
The candidate is clearly stuck or has barely attempted the answer.
Give a subtle hint without revealing the answer.

EVALUATE:
The candidate has demonstrated enough understanding.
Finish this topic and move to another main question.
"""

    prompt = f"""
You are a senior software engineer conducting a real technical interview.

You are sitting across from the candidate.

DIFFICULTY:
{difficulty}

DIFFICULTY PROFILE:
{DIFFICULTY_PROFILE[difficulty]}

CURRENT INTERVIEWER PROMPT:
{current_prompt}

CANDIDATE'S LATEST ANSWER:
{current_answer}

PREVIOUS INTERVIEW:
{previous_history}

REPOSITORY CONTEXT:
{context}

{follow_up_rule}

FIRST, INTERNALLY EVALUATE THE CANDIDATE'S LATEST ANSWER.

CORRECTNESS:
How technically correct is the answer?

CLARITY:
How clearly did the candidate communicate their understanding?

DEPTH:
How deeply did the candidate understand the underlying implementation
and reasoning?

SCORING:

0-2 = incorrect or no meaningful understanding
3-4 = weak / significant misunderstanding
5-6 = partially correct / basic understanding
7-8 = mostly correct and solid
9-10 = excellent and technically deep

If the candidate says "I don't know", "I'm not sure", or gives no
meaningful attempt, score the answer 0 for correctness, clarity and depth.

Then choose exactly ONE action.

REACT:
Use when the answer is interesting but deserves one deeper question.

HINT:
Use when the candidate is clearly stuck.

EVALUATE:
Use when the answer is sufficient and the topic should end.

IMPORTANT:
The candidate will NOT see the scores or evaluation right now.

The candidate should only see the natural interviewer message.

The interviewer should sound:
- Calm
- Curious
- Experienced
- Direct
- Human
- Technically rigorous

Do not give praise just for the sake of praise.

Do not reveal the correct answer.

Return EXACTLY this format:

TYPE: react/hint/evaluate

MESSAGE: <what the candidate should hear>

CORRECTNESS: <0-10>
CORRECTNESS_REASON: <specific evidence from the answer>

CLARITY: <0-10>
CLARITY_REASON: <specific evidence from the answer>

DEPTH: <0-10>
DEPTH_REASON: <specific evidence from the answer>

WHAT_RIGHT: <what the candidate demonstrated correctly>

WHAT_MISSED: <what the candidate failed to demonstrate>

Return nothing else.
"""

    raw = generate_response(prompt).strip()

    turn_type = extract_field(
        raw,
        "TYPE",
        "evaluate"
    ).lower()

    if turn_type not in [
        "react",
        "hint",
        "evaluate"
    ]:
        turn_type = "evaluate"

    return {
        "type": turn_type,

        "message": extract_field(
            raw,
            "MESSAGE"
        ),

        "evaluation": {
            "correctness": extract_score(
                raw,
                "CORRECTNESS"
            ),

            "correctness_reason": extract_field(
                raw,
                "CORRECTNESS_REASON"
            ),

            "clarity": extract_score(
                raw,
                "CLARITY"
            ),

            "clarity_reason": extract_field(
                raw,
                "CLARITY_REASON"
            ),

            "depth": extract_score(
                raw,
                "DEPTH"
            ),

            "depth_reason": extract_field(
                raw,
                "DEPTH_REASON"
            ),

            "what_right": extract_field(
                raw,
                "WHAT_RIGHT"
            ),

            "what_missed": extract_field(
                raw,
                "WHAT_MISSED"
            )
        }
    }


def generate_final_feedback(
    difficulty,
    history
):

    interview_text = format_history(history)

    prompt = f"""
You are a senior technical interviewer writing the final report for a
completed project-based technical interview.

DIFFICULTY:
{difficulty}

NUMBER OF MAIN QUESTIONS:
{len(history)}

COMPLETE INTERVIEW RECORD:
{interview_text}

The candidate has now completed the interview.

This is the ONLY point at which detailed feedback should be shown.

Evaluate the candidate using the stored evaluations and the actual
answers.

Do not invent strengths or weaknesses.

Every important assessment must be supported by evidence from the
candidate's answers.

Do not judge grammar or minor wording mistakes.

Distinguish between:

- Knowing the answer but explaining it poorly
- Basic functional understanding
- Deep technical understanding
- Correctness
- Engineering reasoning
- Ability to discuss trade-offs

Calculate the overall assessment from the actual interview performance.

Return EXACTLY:

OVERALL_SCORE: <0-10>

TECHNICAL_UNDERSTANDING: <0-10>
TECHNICAL_REASON: <specific evidence-based explanation>

CODE_UNDERSTANDING: <0-10>
CODE_REASON: <specific evidence-based explanation>

PROBLEM_SOLVING: <0-10>
PROBLEM_SOLVING_REASON: <specific evidence-based explanation>

ENGINEERING_REASONING: <0-10>
ENGINEERING_REASONING_REASON: <specific evidence-based explanation>

DEPTH: <0-10>
DEPTH_REASON: <specific evidence-based explanation>

STRENGTHS:
<specific evidence-based strengths>

AREAS_TO_IMPROVE:
<specific evidence-based weaknesses>

TOPICS_TO_REVIEW:
<specific technical topics based on weaknesses>

FINAL_ASSESSMENT:
<a concise but honest senior-interviewer assessment>

Do not add anything else.
"""

    raw = generate_response(prompt).strip()

    return {
        "overall_score": extract_score(
            raw,
            "OVERALL_SCORE"
        ),

        "technical_understanding": extract_score(
            raw,
            "TECHNICAL_UNDERSTANDING"
        ),

        "technical_reason": extract_field(
            raw,
            "TECHNICAL_REASON"
        ),

        "code_understanding": extract_score(
            raw,
            "CODE_UNDERSTANDING"
        ),

        "code_reason": extract_field(
            raw,
            "CODE_REASON"
        ),

        "problem_solving": extract_score(
            raw,
            "PROBLEM_SOLVING"
        ),

        "problem_solving_reason": extract_field(
            raw,
            "PROBLEM_SOLVING_REASON"
        ),

        "engineering_reasoning": extract_score(
            raw,
            "ENGINEERING_REASONING"
        ),

        "engineering_reasoning_reason": extract_field(
            raw,
            "ENGINEERING_REASONING_REASON"
        ),

        "depth": extract_score(
            raw,
            "DEPTH"
        ),

        "depth_reason": extract_field(
            raw,
            "DEPTH_REASON"
        ),

        "strengths": extract_field(
            raw,
            "STRENGTHS"
        ),

        "areas_to_improve": extract_field(
            raw,
            "AREAS_TO_IMPROVE"
        ),

        "topics_to_review": extract_field(
            raw,
            "TOPICS_TO_REVIEW"
        ),

        "final_assessment": extract_field(
            raw,
            "FINAL_ASSESSMENT"
        )
    }