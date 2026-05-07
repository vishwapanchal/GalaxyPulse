import os
import json
from openai import AsyncOpenAI
from loguru import logger

# Initialize AsyncOpenAI with OpenRouter base URL
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY", "dummy_key_if_missing"),
)

MODEL = "meta-llama/llama-3.3-70b-instruct:free"

async def parse_feedback(feature_name: str, conversation_text: str) -> dict:
    """
    Pass the raw conversation to OpenRouter LLaMA to extract structured JSON.
    """
    prompt = f"""
    Analyze the following brief conversation between an AI and a user about the Samsung Galaxy feature "{feature_name}".
    Extract the feedback into a strict JSON format with exactly these fields:
    - "satisfaction": integer 1 to 5 (1=very unhappy, 5=very happy)
    - "friction": boolean (true if the user experienced any difficulty, bugs, or slowness, false otherwise)
    - "severity": string ("low", "medium", or "high", based on how bad the friction was. If no friction, use "low")
    - "sentiment": string ("positive", "negative_friction", or "neutral")
    - "auto_tags": array of strings (1 to 3 short tags summarizing the issue, e.g., ["shadow_artifact", "slow"])
    
    Conversation:
    {conversation_text}

    Respond ONLY with raw JSON. No markdown formatting, no backticks, no explanations.
    """
    
    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a data extraction assistant. Output strictly raw JSON without markdown."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )
        
        raw_output = response.choices[0].message.content.strip()
        
        # In case the model outputs markdown blocks
        if raw_output.startswith("```json"):
            raw_output = raw_output[7:-3].strip()
        elif raw_output.startswith("```"):
            raw_output = raw_output[3:-3].strip()
            
        return json.loads(raw_output)
    except Exception as e:
        logger.error(f"Failed to parse feedback via OpenRouter: {e}")
        # Return fallback on error
        return {
            "satisfaction": 3,
            "friction": True,
            "severity": "medium",
            "sentiment": "neutral",
            "auto_tags": ["parsing_error"]
        }
