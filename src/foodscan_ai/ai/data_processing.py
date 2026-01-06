"""
Data Processing Module for AI Nutrition Assistant (Simplified)
===============================================

Lightweight data processing without heavy model dependencies.
Uses basic validation and cleaning for Gemini API consumption.
"""

import re
from PIL import Image
import numpy as np
from typing import Dict, Any, Union

class DataProcessor:
    """
    Lightweight data processor for AI model inputs.
    Simplified version using only basic Python operations.
    """

    def __init__(self):
        """Initialize the simplified data processor."""
        print("🔧 Initializing Lightweight Data Processor (no heavy models)...")

    def process_text(self, text: str, max_length: int = 512) -> Dict[str, Any]:
        """Process text data with basic cleaning."""
        if not text or not isinstance(text, str):
            raise ValueError("Text input is required and must be a string.")
        
        cleaned = text.strip()
        cleaned = re.sub(r'\s+', ' ', cleaned)
        cleaned = cleaned[:max_length]
        
        return {
            'original_text': text,
            'cleaned_text': cleaned,
            'word_count': len(cleaned.split()),
            'processing_steps': ['validated', 'cleaned', 'normalized']
        }

    def process_image(self, image: Union[str, Image.Image], target_size: tuple = (512, 512)) -> Dict[str, Any]:
        """Process image data with basic validation."""
        if isinstance(image, str):
            image = Image.open(image)
        
        if not isinstance(image, Image.Image):
            raise ValueError("Image must be a PIL Image or file path")
        
        if image.size != target_size:
            image = image.resize(target_size, Image.Resampling.LANCZOS)
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        return {
            'original_image': image,
            'processed_tensor': None,
            'metadata': {
                'target_size': target_size,
                'format': image.mode,
                'dimensions': image.size
            },
            'processing_steps': ['validated', 'resized', 'format_converted']
        }

    def process_numerical(self, value: Union[int, float], min_val: float = 0, max_val: float = 120) -> Dict[str, Any]:
        """Process numerical data with validation."""
        if not isinstance(value, (int, float)):
            raise ValueError(f"Input must be numeric. Got: {type(value)}")
        
        if value < min_val or value > max_val:
            raise ValueError(f"Value {value} out of range [{min_val}, {max_val}]")
        
        return {
            'original': value,
            'normalized': (value - min_val) / (max_val - min_val),
            'range': (min_val, max_val),
            'processing_steps': ['validated', 'normalized']
        }
