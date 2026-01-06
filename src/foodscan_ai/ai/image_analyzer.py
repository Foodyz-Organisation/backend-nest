"""Image analysis utilities for the AI Nutrition Assistant using Gemini Vision API.

This module uses Google's Gemini Vision API for image analysis instead of local models.

Functions:
- extract_food_items(image) -> list[str]: returns likely food items detected in the image.
- get_caption(image) -> str: returns a descriptive caption for the image.
"""
import os
import re
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY", "AIzaSyCFDcF3qlpPTrNKY_Mbhpt3FWdxjALlsuw")
genai.configure(api_key=api_key)
vision_model = genai.GenerativeModel('models/gemini-2.5-flash')


def get_caption(image: Image.Image) -> str:
    """Generate a descriptive caption for the image using Gemini Vision.
    
    Args:
        image: PIL Image object
        
    Returns:
        str: A descriptive caption of the image
    """
    try:
        prompt = "Describe this image in one sentence, focusing on any food items visible."
        response = vision_model.generate_content([prompt, image])
        return response.text.strip()
    except Exception as e:
        print(f"⚠️ Gemini Vision error: {e}")
        return "Image of food or meal"


def extract_food_items(image: Image.Image) -> list:
    """Extract probable food items from an image using Gemini Vision.

    Args:
        image: PIL Image object
        
    Returns:
        list[str]: List of detected food items
    """
    try:
        prompt = "List all food items visible in this image. Provide only the food names separated by commas, nothing else."
        response = vision_model.generate_content([prompt, image])
        items_text = response.text.strip()
        
        # Parse the comma-separated list
        items = [item.strip() for item in items_text.split(',')]
        
        # Clean up and normalize
        cleaned_items = []
        for item in items:
            # Remove extra words and normalize
            item = re.sub(r'\d+\.?\s*', '', item)  # Remove numbers/bullet points
            item = re.sub(r'^(a|an|the)\s+', '', item, flags=re.I)  # Remove articles
            item = item.strip(' .')
            if len(item) > 2:
                cleaned_items.append(item.title())
        
        if not cleaned_items:
            # Fallback to caption if list extraction fails
            caption = get_caption(image)
            return [caption]
            
        # Remove duplicates while preserving order
        seen = set()
        result = []
        for item in cleaned_items:
            if item.lower() not in seen:
                seen.add(item.lower())
                result.append(item)
                
        return result[:10]  # Limit to 10 items
        
    except Exception as e:
        print(f"⚠️ Error extracting food items: {e}")
        return ["Food item"]

