import gradio as gr
from ai.cooking_advisor import get_recipe_suggestion
from ai.meal_analyzer import analyze_meal
from ai.sport_recommender import generate_exercise_plan

def cook_tab(ingredients, condition, age):
    return get_recipe_suggestion(ingredients, condition, int(age) if age else 30)

def analyze_tab(meal, image, age, condition, goal):
    return analyze_meal(meal, image, age, condition, goal)

def sport_tab(age, goal, condition):
    if not age or not goal or not condition:
        return "⚠️ **Please fill all fields to generate exercise recommendations.**"
    return generate_exercise_plan(int(age), goal, condition)

with gr.Blocks(title="AI Nutrition Assistant") as demo:
    gr.Markdown("# 🍱 AI Health & Fitness Assistant")
    
    with gr.Tab("🧑‍🍳 What Can I Cook?"):
        ingredients = gr.Textbox(label="Ingredients or fridge items")
        condition = gr.Textbox(label="Health condition")
        cook_age = gr.Number(label="Your Age (optional)", value=30, minimum=1, maximum=120)
        output = gr.Markdown()
        btn = gr.Button("Generate Recipes")
        btn.click(fn=cook_tab, inputs=[ingredients, condition, cook_age], outputs=output)
    
    with gr.Tab("🍽️ Is My Meal Healthy?"):
        gr.Markdown("### Analyze your meal's nutritional value")
        gr.Markdown("**Both description and image are required**")
        
        with gr.Row():
            with gr.Column():
                meal = gr.Textbox(
                    label="Meal Description (Required)", 
                    placeholder="e.g., Grilled chicken with rice and vegetables",
                    lines=3
                )
                image = gr.Image(label="Upload meal image (Required)", type="pil")
            with gr.Column():
                age = gr.Number(label="Your Age", value=30, minimum=1, maximum=120)
                condition = gr.Textbox(
                    label="Health Condition(s)", 
                    placeholder="e.g., diabetes, high blood pressure, none"
                )
                goal = gr.Textbox(
                    label="Your Goal", 
                    placeholder="e.g., lose weight, build muscle, maintain health"
                )
        
        output2 = gr.Markdown()
        btn2 = gr.Button("Analyze Meal", variant="primary")
        btn2.click(fn=analyze_tab, inputs=[meal, image, age, condition, goal], outputs=output2)
    
    with gr.Tab("💪 Sport Recommendations"):
        gr.Markdown("### Get safe and personalized exercise plans with video tutorials")
        gr.Markdown("Get AI-powered exercise recommendations based on your profile, complete with YouTube tutorials!")
        
        with gr.Row():
            with gr.Column():
                sport_age = gr.Number(
                    label="Your Age", 
                    value=30, 
                    minimum=1, 
                    maximum=120
                )
                sport_goal = gr.Textbox(
                    label="Fitness Goal", 
                    placeholder="e.g., improve flexibility, build muscle, lose weight, reduce back pain",
                    lines=2
                )
                sport_condition = gr.Textbox(
                    label="Health Condition(s)", 
                    placeholder="e.g., arthritis, hypertension, knee problems, none",
                    lines=2
                )
        
        output3 = gr.Markdown()
        btn3 = gr.Button("Generate Exercise Plan", variant="primary")
        btn3.click(fn=sport_tab, inputs=[sport_age, sport_goal, sport_condition], outputs=output3)

if __name__ == "__main__":
    demo.launch()