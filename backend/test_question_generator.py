from question_generator import generate_question


difficulty = input("Choose difficulty (easy/medium/hard): ").lower()

question = generate_question(difficulty)

print("\nInterview Question:")
print(question)