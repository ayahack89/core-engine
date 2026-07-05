import logging
from typing import List, Dict
from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize GenAI Client
# Using the standard GOOGLE_API_KEY from settings
client = genai.Client(api_key=settings.GOOGLE_API_KEY)

CHAT_SYSTEM_PROMPT = """You are a Senior Systems Analyst and Product Manager. Your primary goal is to help the user design their application and gather complete, detailed requirements.

Analyze the user's initial idea and ask highly targeted, developer-first follow-up questions to extract missing specifications.
Focus on:
1. Core Business Goals & Target Audience
2. Key User Roles & User Stories
3. Detailed Features & Functionalities
4. Technical Preferences (Auth, Database, Payments, Tech Stack)
5. Security, Scaling, and Future Scope

Guidelines:
- Ask intelligent, open-ended but specific questions.
- Do NOT ask too many questions at once (limit to 3-4 questions at a time) to avoid overwhelming the user.
- Keep the tone highly professional, developer-first, modern, and clean.
- Once you feel you have gathered enough detail to produce a comprehensive requirements document, politely summarize the scope and let the user know they can generate the full requirements document using the "Generate Requirements" button.
"""

REQUIREMENTS_SYSTEM_PROMPT = """You are a Staff Technical Architect and Writer. 
Your task is to compile a comprehensive, highly detailed, production-quality Software Requirements Specification (SRS) based on the user interview transcript.

You must structure the generated markdown document exactly with the following sections:

# Project Overview
Provide a detailed summary of the application, its core value proposition, and the high-level vision.

# Problem Statement
Describe the exact pain points this software addresses.

# Objectives
What are the main, measurable goals of this software system?

# Target Users
Detail who will use the application and how.

# Functional Requirements
Specify a detailed, numbered list of what the system must do.

# Non Functional Requirements
Include performance, reliability, scalability, portability, and localization requirements.

# User Roles
Describe the system actors (e.g., Guest, Authenticated User, Admin) and their permissions.

# User Stories
Write concrete user stories in the standard format: "As a [role], I want to [action] so that [benefit]".

# Features
Detail the feature list with high-level descriptions.

# API Suggestions
Provide REST/GraphQL API structure suggestion (endpoints, methods, payloads).

# Database Suggestions
Provide schema details (tables, columns, datatypes, relationships).

# Tech Stack
Explain the proposed technology stack (frontend, backend, database, deployment) with architectural justification.

# Architecture
Outline the system components, caching layer, task queues, and data flow.

# Security
Detail requirements for data encryption, authentication, rate limiting, and compliance.

# Future Improvements
Suggest next steps, upcoming features, or potential improvements.

Write the document in clean, robust Markdown. Be comprehensive and make it look like it was written by an elite software architecture team.
"""

class AIService:
    @staticmethod
    async def get_chat_reply(chat_history: List[Dict[str, str]]) -> str:
        """Sends the conversation history to Gemini and retrieves the next assistant message."""
        try:
            # Map roles properly to match Gemini SDK expectations (user/model)
            contents = []
            for msg in chat_history:
                role = "user" if msg["role"] == "user" else "model"
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg["content"])]
                ))
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=CHAT_SYSTEM_PROMPT,
                    temperature=0.7,
                )
            )
            return response.text or "I am sorry, I couldn't formulate a reply. Please try again."
        except Exception as e:
            logger.error(f"Error calling Gemini API for chat: {e}", exc_info=True)
            raise e

    @staticmethod
    async def generate_requirements(chat_history: List[Dict[str, str]]) -> str:
        """Generates the final requirements.md document from the chat history."""
        try:
            # Formulate the conversation history as context
            history_text = "\n\n".join([
                f"{msg['role'].upper()}: {msg['content']}"
                for msg in chat_history
            ])
            
            prompt = f"Please generate the complete requirements.md based on the following conversation transcript:\n\n{history_text}"
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[prompt],
                config=types.GenerateContentConfig(
                    system_instruction=REQUIREMENTS_SYSTEM_PROMPT,
                    temperature=0.2, # Lower temperature for more factual and structured generation
                )
            )
            return response.text or ""
        except Exception as e:
            logger.error(f"Error generating requirements document: {e}", exc_info=True)
            raise e

    @staticmethod
    async def get_coder_reply(chat_history: List[Dict[str, str]]) -> str:
        """Sends the coding conversation history to Gemini and retrieves the next coder assistant reply."""
        try:
            # Map roles properly to match Gemini SDK expectations (user/model)
            contents = []
            for msg in chat_history:
                role = "user" if msg["role"] == "user" else "model"
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg["content"])]
                ))
            
            CODER_SYSTEM_PROMPT = """You are a Staff Software Engineer and Coding Assistant.
Your goal is to help the user implement their software based on the finalized requirements.md.

Guidelines:
- Provide high-quality, production-ready, clean code snippets.
- Walk through implementation details, modular designs, database schemas, and testing strategies.
- Maintain a highly technical, developer-first, concise tone.
- Refer to the project's requirements.md file as the source of truth for features and system architectures.
"""
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=CODER_SYSTEM_PROMPT,
                    temperature=0.5,
                )
            )
            return response.text or "I am sorry, I couldn't formulate a coding suggestion. Please try again."
        except Exception as e:
            logger.error(f"Error calling Gemini API for coder chat: {e}", exc_info=True)
            raise e

