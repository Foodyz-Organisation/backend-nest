from llm_client import LLMClient


def generate_exercise_plan(age: int, goal: str, condition: str) -> str:
    """
    Generates personalized exercise recommendations with video tutorials.
    
    Args:
        age (int): User's age.
        goal (str): Fitness goal.
        condition (str): Health condition(s).
    
    Returns:
        str: Exercise plan with YouTube video links.
    """
    if not all([age, goal, condition]):
        return "⚠️ **Please fill all fields to generate exercise recommendations.**"
    
    print(f"💪 Generating exercise plan - Age: {age}, Goal: {goal}, Condition: {condition}")
    
    client = LLMClient()
    prompt = f"""You are a certified fitness trainer and physical therapist. Create a safe, personalized exercise plan for a {age}-year-old person.

**AGE**: {age}
**FITNESS GOAL**: {goal}
**HEALTH CONDITION**: {condition}

Provide exercise recommendations in this EXACT format:

## 💪 Your Personalized Exercise Plan

### 🎯 Overview
[Brief 2-3 sentence overview of the plan and why it's suitable for their age/condition]

### 📋 Recommended Exercises

**Exercise 1: [Exercise Name]**
- **Duration/Reps**: [e.g., 3 sets of 10 reps, or 20 minutes]
- **Frequency**: [How often per week]
- **Benefits**: [Why this helps their goal/condition]
- **Safety Notes**: [Any precautions for their condition]
- **Video Tutorial**: Search YouTube for "[specific search term]"

**Exercise 2: [Exercise Name]**
[Same format as Exercise 1]

**Exercise 3: [Exercise Name]**
[Same format as Exercise 1]

### ⚠️ Safety Guidelines
- [Important safety considerations for their age and condition]
- [When to stop and consult a doctor]

### 📅 Weekly Schedule Suggestion
[Simple weekly plan, e.g., Mon/Wed/Fri routine]

### 💡 Pro Tips
[1-2 motivation or progression tips]

Keep it safe, practical, and age-appropriate. Prioritize their health condition concerns."""

    try:
        result = client.ask(prompt, max_tokens=2000)
        print("✅ Exercise plan generated")
        return result
    except Exception as e:
        print(f"❌ LLM Error: {e}")
        return f"❌ **Error generating exercise plan**: {e}"
