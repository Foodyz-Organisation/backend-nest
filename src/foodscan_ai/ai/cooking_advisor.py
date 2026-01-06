from llm_client import LLMClient


def get_recipe_suggestion(ingredients: str, condition: str, age: int) -> str:
    """
    Generates recipe suggestions based on available ingredients and health conditions.
    
    Args:
        ingredients (str): Available ingredients or fridge items.
        condition (str): Health condition(s).
        age (int): User's age.
    
    Returns:
        str: Recipe suggestions with instructions.
    """
    if not ingredients:
        return "⚠️ **Please provide some ingredients to get recipe suggestions.**"
    
    print(f"🍳 Generating recipes - Age: {age}, Ingredients: {ingredients[:50]}...")
    
    client = LLMClient()
    prompt = f"""You are a professional chef and nutritionist. Generate 2-3 healthy recipe suggestions for a {age}-year-old person.

**AVAILABLE INGREDIENTS**: {ingredients}
**HEALTH CONDITION**: {condition if condition else "None"}
**AGE**: {age}

Provide recipe suggestions in this EXACT format:

## 🍳 Recipe Suggestions

### Recipe 1: [Name]
**Prep time**: [X] minutes | **Difficulty**: [Easy/Medium/Hard]

**Ingredients**:
- [List ingredients with amounts]

**Instructions**:
1. [Step-by-step cooking instructions]

**Health Benefits**: [Why this is good for their age/condition]

---

### Recipe 2: [Name]
[Same format as Recipe 1]

## 💡 Chef's Tips
[1-2 helpful cooking tips or substitution suggestions based on their condition]

Keep it concise and practical. Focus on recipes that match their health needs."""

    try:
        result = client.ask(prompt, max_tokens=2000)
        print("✅ Recipe suggestions generated")
        return result
    except Exception as e:
        print(f"❌ LLM Error: {e}")
        return f"❌ **Error generating recipes**: {e}"
