from llm_client import LLMClient
from ai.image_analyzer import extract_food_items, get_caption
from ai.data_processing import DataProcessor
from PIL import Image


def analyze_meal(meal_description: str, image, age: int, condition: str, goal: str) -> str:
    """
    Analyzes a meal for health safety and nutritional value.
    Both text description and image are required.
    Now includes comprehensive data processing pipeline.

    Args:
        meal_description (str): Text description of the meal.
        image: PIL Image object from Gradio or processed image data.
        age (int): User's age.
        condition (str): User's health condition(s).
        goal (str): User's health/fitness goal.

    Returns:
        str: Health analysis report with nutritional stats and personalized advice.
    """
    print(f"🥗 Processing meal analysis - Age: {age}, Goal: {goal}, Condition: {condition}")

    # Initialize data processor
    processor = DataProcessor()

    # Process all inputs through data pipeline
    try:
        processed_description = processor.process_text(meal_description)
        processed_condition = processor.process_text(condition)
        processed_goal = processor.process_text(goal)
        processed_age = processor.process_numerical(age)

        # Handle image processing (could be PIL Image or already processed dict)
        if isinstance(image, dict) and 'processed_tensor' in image:
            # Already processed by data pipeline
            processed_image = image
            print("✅ Using pre-processed image data")
        else:
            # Process raw image
            processed_image = processor.process_image(image)
            print(f"✅ Image processed: {processed_image['metadata']['target_size']}")

        print(f"✅ All data processed - Text: {processed_description['word_count']} words, Age: {processed_age['original']}")

    except ValueError as e:
        return f"❌ **Data Processing Error**: {e}"

    # Extract food items from processed image
    try:
        items = extract_food_items(processed_image['original_image'])
        if items:
            detected = ", ".join(items)
            image_info = f"Image-detected foods: {detected}"
            print(f"🖼️ Image Analysis: Detected {len(items)} items: {detected}")
        else:
            caption = get_caption(processed_image['original_image'])
            image_info = f"Image analysis: {caption}"
            print(f"🖼️ Image Analysis: {caption}")
    except Exception as e:
        print(f"❌ Image analysis error: {str(e)}")
        return f"❌ **Error**: Image analysis failed: {str(e)}"

    client = LLMClient()
    prompt = f"""You are a professional dietitian. Provide a COMPLETE and DETAILED analysis of this meal for a {processed_age['original']}-year-old person.

**MEAL DESCRIPTION**: {processed_description['cleaned_text']}
**DETECTED FOOD ITEMS**: {image_info}
**HEALTH CONDITION**: {processed_condition['cleaned_text']}
**FITNESS GOAL**: {processed_goal['cleaned_text']}
**AGE**: {processed_age['original']} years old

IMPORTANT: Provide the FULL analysis in this EXACT format. DO NOT truncate or abbreviate:

## 📊 Complete Nutritional Breakdown (per serving)
- **Calories**: [exact number] kcal
- **Protein**: [number]g
- **Carbohydrates**: [number]g
- **Dietary Fiber**: [number]g
- **Sugars**: [number]g
- **Total Fat**: [number]g
- **Saturated Fat**: [number]g
- **Sodium**: [number]mg
- **Key Vitamins & Minerals**: [list main ones present]

## ✅ MEAL COMPATIBILITY VERDICT
**Is this meal suitable for this person?**
- **Answer**: [YES / NO / YES WITH MODIFICATIONS]
- **Explanation**: [2-3 sentences explaining why or why not based on their specific condition and goal]

## 💡 Detailed Nutritional Assessment
[Provide 3-4 sentences analyzing the meal's nutritional quality, portion size appropriateness, and overall balance for a {processed_age['original']}-year-old person]

## ⚠️ Health Impact Analysis
**For {processed_condition['cleaned_text']}:**
- [Specific impact on their condition - be detailed]
- [List any problematic ingredients or nutrients]
- [Explain any risks or benefits]

**For {processed_goal['cleaned_text']} goal:**
- [How this meal supports or hinders their goal]
- [Specific recommendations for modifications]

## 🔍 Detailed Recommendations
**What to Keep:**
- [List positive aspects]

**What to Modify:**
- [Specific changes needed]

**Alternative Suggestions:**
- [Better options if meal is not suitable]

## ⭐ Overall Rating
**[Excellent / Good / Fair / Poor]** for this person's specific situation

**Summary**: [One final sentence with the key takeaway]"""

    print(f"📝 Sending to LLM - Age: {processed_age['original']}, Condition: {processed_condition['cleaned_text']}, Goal: {processed_goal['cleaned_text']}")
    try:
        result = client.ask(prompt, max_tokens=4096, temperature=0.7)
        print("✅ Meal analysis complete")
        return result
    except Exception as e:
        print(f"❌ LLM Error: {e}")
        return f"❌ **Error analyzing meal**: {e}"