import httpx
import json
import logging
from typing import List, Dict
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIService:
    @staticmethod
    def parse_ai_response(response_text: str) -> Dict[str, str]:
        """Parses the assistant's reply and requirements block using delimiters."""
        chat_reply = ""
        requirements = ""
        
        if "===CHAT_REPLY===" in response_text:
            parts = response_text.split("===CHAT_REPLY===")
            content_after = parts[1]
            if "===REQUIREMENTS===" in content_after:
                subparts = content_after.split("===REQUIREMENTS===")
                chat_reply = subparts[0].strip()
                requirements = subparts[1].strip()
            else:
                chat_reply = content_after.strip()
        elif "===REQUIREMENTS===" in response_text:
            parts = response_text.split("===REQUIREMENTS===")
            chat_reply = parts[0].strip()
            requirements = parts[1].strip()
        else:
            chat_reply = response_text.strip()
            
        return {
            "chat_reply": chat_reply,
            "requirements": requirements
        }

    @staticmethod
    async def get_chat_reply(chat_history: List[Dict[str, str]], current_requirements: str = "") -> Dict[str, str]:
        """Sends the conversation history to OpenRouter and retrieves the next assistant message and updated requirements."""
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/b0nd589/core-engine",
            "X-Title": "Core Engine Development Suite"
        }
        
        # Build prompt
        system_instruction = """You are a Senior Systems Analyst, Product Manager, and User Query Optimizer Engine.
Your primary goal is to help the user design their application and gather complete, detailed requirements.

Analyze the user's input and:
1. Respond to the user's message, asking highly targeted, developer-first follow-up questions to extract missing specifications.
2. Limit follow-up questions to 2-3 at a time so you don't overwhelm them.
3. Simultaneously construct and update a comprehensive requirements document (markdown format).

You MUST output your response in EXACTLY the following structure with delimiters. Do not deviate from this format:

===CHAT_REPLY===
[Write your response to the user here. Keep it conversational, helpful, and professional.]

===REQUIREMENTS===
[Write the full, updated requirements.md content here. It must start with # Project Specification. Maintain structured sections like Overview, Target Users, Core Features, Tech Stack, User Flows, etc.]
"""
        
        # Build messages payload
        messages = [{"role": "system", "content": system_instruction}]
        
        if current_requirements:
            messages.append({
                "role": "system",
                "content": f"[CURRENT REQUIREMENTS DOCUMENT]\n{current_requirements}\n[END OF CURRENT REQUIREMENTS DOCUMENT]"
            })
            
        for msg in chat_history:
            # Map role properly
            role = msg["role"]
            if role == "assistant":
                role = "assistant"
            elif role == "user":
                role = "user"
            messages.append({"role": role, "content": msg["content"]})
            
        payload = {
            "model": settings.OPENROUTER_MODEL,
            "messages": messages,
            "temperature": 0.7
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
                    return {
                        "chat_reply": "I'm having trouble connecting to OpenRouter. Please ensure your OPENROUTER_API_KEY environment variable is configured with a valid key.",
                        "requirements": current_requirements
                    }
                
                resp_json = response.json()
                response_text = resp_json["choices"][0]["message"]["content"]
                return AIService.parse_ai_response(response_text)
                
        except Exception as e:
            logger.error(f"Error calling OpenRouter API for chat: {e}", exc_info=True)
            return {
                "chat_reply": f"Error contacting AI service: {str(e)}",
                "requirements": current_requirements
            }

    @staticmethod
    async def generate_requirements(chat_history: List[Dict[str, str]]) -> str:
        """Generates the final requirements.md document from the chat history."""
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/b0nd589/core-engine",
            "X-Title": "Core Engine Development Suite"
        }
        
        system_instruction = """You are a Staff Technical Architect and Writer. 
Your task is to compile a comprehensive, highly detailed, production-quality Software Requirements Specification (SRS) based on the user interview transcript.

You must structure the generated markdown document exactly with the following sections:
# Project Overview
# Problem Statement
# Objectives
# Target Users
# Functional Requirements
# Non Functional Requirements
# User Roles
# User Stories
# Features
# API Suggestions
# Database Suggestions
# Tech Stack
# Architecture
# Security
# Future Improvements
"""
        history_text = "\n\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in chat_history
        ])
        
        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": f"Please generate the complete requirements.md based on the following conversation transcript:\n\n{history_text}"}
        ]
        
        payload = {
            "model": settings.OPENROUTER_MODEL,
            "messages": messages,
            "temperature": 0.2
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    resp_json = response.json()
                    return resp_json["choices"][0]["message"]["content"]
                else:
                    logger.error(f"OpenRouter API error in generate_requirements: {response.text}")
                    return ""
        except Exception as e:
            logger.error(f"Error generating requirements document: {e}", exc_info=True)
            return ""

    @staticmethod
    async def get_coder_reply(chat_history: List[Dict[str, str]]) -> str:
        """Sends the coding conversation history to OpenRouter and retrieves the next coder assistant reply."""
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/b0nd589/core-engine",
            "X-Title": "Core Engine Development Suite"
        }
        
        system_instruction = """You are a Staff Software Engineer and Coding Assistant.
Your goal is to help the user implement their software based on the finalized requirements.md.

Guidelines:
- Provide high-quality, production-ready, clean code snippets.
- Walk through implementation details, modular designs, database schemas, and testing strategies.
- Maintain a highly technical, developer-first, concise tone.
- Refer to the project's requirements.md file as the source of truth for features and system architectures.
"""
        
        messages = [{"role": "system", "content": system_instruction}]
        for msg in chat_history:
            role = msg["role"]
            if role == "assistant":
                role = "assistant"
            elif role == "user":
                role = "user"
            messages.append({"role": role, "content": msg["content"]})
            
        payload = {
            "model": settings.OPENROUTER_MODEL,
            "messages": messages,
            "temperature": 0.5
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    resp_json = response.json()
                    return resp_json["choices"][0]["message"]["content"]
                else:
                    logger.error(f"OpenRouter API error in get_coder_reply: {response.text}")
                    return "I'm having trouble reaching the coder assistant. Please check your OpenRouter key."
        except Exception as e:
            logger.error(f"Error calling OpenRouter API for coder chat: {e}", exc_info=True)
            return f"Error contacting Coder assistant: {str(e)}"
