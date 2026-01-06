import os
from dotenv import load_dotenv
import hashlib
import google.generativeai as genai

load_dotenv()

class LLMClient:
    def __init__(self, api_key=None, model=None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "AIzaSyCFDcF3qlpPTrNKY_Mbhpt3FWdxjALlsuw")
        self.model_name = model or "models/gemini-2.5-flash"
        self.cache = {}  # Simple in-memory cache
        
        # Configure Gemini
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)

    def ask(self, prompt, max_tokens=4096, temperature=0.7):
        # Create cache key from prompt
        cache_key = hashlib.md5(prompt.encode()).hexdigest()
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        try:
            # Generate content using Gemini
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=max_tokens,
                    temperature=temperature,
                )
            )
            result = response.text
            self.cache[cache_key] = result  # Cache the result
            return result
        except Exception as e:
            return f"Error communicating with Gemini: {str(e)}"