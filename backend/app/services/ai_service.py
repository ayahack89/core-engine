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
        import re
        chat_reply = ""
        requirements = ""
        
        chat_match = re.search(r'===\s*CHAT_?REPLY\s*===', response_text, re.IGNORECASE)
        req_match = re.search(r'===\s*REQUIREMENTS\s*===', response_text, re.IGNORECASE)
        
        if chat_match and req_match:
            if chat_match.start() < req_match.start():
                chat_reply = response_text[chat_match.end():req_match.start()].strip()
                requirements = response_text[req_match.end():].strip()
            else:
                requirements = response_text[req_match.end():chat_match.start()].strip()
                chat_reply = response_text[chat_match.end():].strip()
        elif chat_match:
            chat_reply = response_text[chat_match.end():].strip()
        elif req_match:
            requirements = response_text[req_match.end():].strip()
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
Your primary goal is to help the user design their application, optimize their queries, and compile comprehensive, final Software Requirements Specifications.

Analyze the user's input and:
1. Respond to the user's message, asking highly targeted, developer-first follow-up questions to extract missing specifications.
2. Limit follow-up questions to 2-3 at a time so you don't overwhelm them.
3. Simultaneously construct and update a comprehensive, finalized requirements.md document.

The requirements.md file MUST serve as the absolute, single source of truth and a Query Optimizer blueprint for the project. At the end of the requirements.md file, you MUST include a dedicated section titled "## Coder Prompt Blueprint / Query Optimizer" containing a highly dense, optimized prompt outlining exactly how a developer-agent or coder LLM should bootstrap and implement the entire project.

You MUST output your response in EXACTLY the following structure with delimiters. Do not deviate from this format:

===CHAT_REPLY===
[Write your response to the user here. Keep it conversational, helpful, and professional.]

===REQUIREMENTS===
[Write the full, updated requirements.md content here. It must start with # Project Specification. Maintain structured sections like Overview, Target Users, Core Features, Tech Stack, User Flows, Coder Prompt Blueprint / Query Optimizer, etc.]
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
    async def get_coder_reply(chat_history: List[Dict[str, str]], workspace_context: str = "") -> str:
        """Sends the coding conversation history to OpenRouter and retrieves the next coder assistant reply."""
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/b0nd589/core-engine",
            "X-Title": "Core Engine Development Suite"
        }
        
        system_instruction = f"""You are a Staff Software Engineer, Tech Lead, and Cursor.ai-style Vibe Coding Agent.
Your goal is to build, implement, and maintain the software based solely on the requirements specified in the `requirements.md` file (which is the single source of truth for the project).

Here is the CURRENT WORKSPACE CONTEXT showing all existing files in the project directory:
=========================================
{workspace_context}
=========================================

Instructions:
1. Thoroughly scan `requirements.md` to understand the entire project scope, tech stack, and user flows.
2. Check `requirements.txt` (for Python projects) or `package.json` (for NextJS projects) for dependency versions.
3. If the user asks to build or implement features, you must autonomously design and write all the code.
4. To write new files or update existing files, you MUST use the exact file block delimiter format:
===FILE: path/to/file===
[file contents here]
===END_FILE===

You can specify multiple file blocks in your output. If you want to modify a file, output the ENTIRE updated content of the file. Write clean, professional, bug-free, production-quality, human-understandable code.
5. In your chat response (the text outside file blocks), explain your plan, progress, and actions step-by-step. Keep the tone professional, technical, and developer-first.
6. Make sure to keep any existing features intact unless the requirements request changes to them.
"""
        
        messages = [{"role": "system", "content": system_instruction}]
        for msg in chat_history:
            role = msg["role"]
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

    @staticmethod
    async def stream_chat_reply(
        chat_history: List[Dict[str, str]], 
        current_requirements: str = "",
        model: str = None
    ):
        """Sends the conversation history to OpenRouter and streams the response chunks."""
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/b0nd589/core-engine",
            "X-Title": "Core Engine Development Suite"
        }
        
        system_instruction = """You are a Senior Systems Analyst, Product Manager, and User Query Optimizer Engine.
Your primary goal is to help the user design their application, optimize their queries, and compile comprehensive, final Software Requirements Specifications.

Analyze the user's input and:
1. Respond to the user's message, asking highly targeted, developer-first follow-up questions to extract missing specifications.
2. Limit follow-up questions to 2-3 at a time so you don't overwhelm them.
3. Simultaneously construct and update a comprehensive, finalized requirements.md document.

The requirements.md file MUST serve as the absolute, single source of truth and a Query Optimizer blueprint for the project. At the end of the requirements.md file, you MUST include a dedicated section titled "## Coder Prompt Blueprint / Query Optimizer" containing a highly dense, optimized prompt outlining exactly how a developer-agent or coder LLM should bootstrap and implement the entire project.

You MUST output your response in EXACTLY the following structure with delimiters. Do not deviate from this format:

===CHAT_REPLY===
[Write your response to the user here. Keep it conversational, helpful, and professional.]

===REQUIREMENTS===
[Write the full, updated requirements.md content here. It must start with # Project Specification. Maintain structured sections like Overview, Target Users, Core Features, Tech Stack, User Flows, Coder Prompt Blueprint / Query Optimizer, etc.]
"""
        
        messages = [{"role": "system", "content": system_instruction}]
        
        if current_requirements:
            messages.append({
                "role": "system",
                "content": f"[CURRENT REQUIREMENTS DOCUMENT]\n{current_requirements}\n[END OF CURRENT REQUIREMENTS DOCUMENT]"
            })
            
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
            
        payload = {
            "model": model or settings.OPENROUTER_MODEL,
            "messages": messages,
            "temperature": 0.7,
            "stream": True
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        logger.error(f"OpenRouter API error in stream_chat_reply: {response.status_code} - {error_text.decode('utf-8', errors='ignore')}")
                        yield f"data: {json.dumps({'error': 'Failed to connect to OpenRouter. Check credentials.'})}\n\n"
                        return
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_content = line[6:].strip()
                            if data_content == "[DONE]":
                                break
                            try:
                                data_json = json.loads(data_content)
                                delta = data_json.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield f"data: {json.dumps({'content': content})}\n\n"
                            except Exception as e:
                                logger.error(f"Error parsing SSE stream line: {line} - {e}")
        except Exception as e:
            logger.error(f"Error calling OpenRouter API for streaming: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    @staticmethod
    async def stream_coder_reply(chat_history: List[Dict[str, str]], workspace_context: str = "", model: str = None):
        """Streams the coder conversation from OpenRouter."""
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/b0nd589/core-engine",
            "X-Title": "Core Engine Development Suite"
        }
        
        system_instruction = f"""You are a Staff Software Engineer, Tech Lead, and Cursor.ai-style Vibe Coding Agent.
Your goal is to build, implement, and maintain the software based solely on the requirements specified in the `requirements.md` file (which is the single source of truth for the project).

Here is the CURRENT WORKSPACE CONTEXT showing all existing files in the project directory:
=========================================
{workspace_context}
=========================================

Instructions:
1. Thoroughly scan `requirements.md` to understand the entire project scope, tech stack, and user flows.
2. Check `requirements.txt` (for Python projects) or `package.json` (for NextJS projects) for dependency versions.
3. If the user asks to build or implement features, you must autonomously design and write all the code.
4. To write new files or update existing files, you MUST use the exact file block delimiter format:
===FILE: path/to/file===
[file contents here]
===END_FILE===

You can specify multiple file blocks in your output. If you want to modify a file, output the ENTIRE updated content of the file. Write clean, professional, bug-free, production-quality, human-understandable code.
5. In your chat response (the text outside file blocks), explain your plan, progress, and actions step-by-step. Keep the tone professional, technical, and developer-first.
6. Make sure to keep any existing features intact unless the requirements request changes to them.
"""
        
        messages = [{"role": "system", "content": system_instruction}]
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
            
        payload = {
            "model": model or settings.OPENROUTER_MODEL,
            "messages": messages,
            "temperature": 0.5,
            "stream": True
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        logger.error(f"OpenRouter API error in stream_coder_reply: {response.status_code} - {error_text.decode('utf-8', errors='ignore')}")
                        yield f"data: {json.dumps({'error': 'Failed to connect to OpenRouter. Check credentials.'})}\n\n"
                        return
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_content = line[6:].strip()
                            if data_content == "[DONE]":
                                break
                            try:
                                data_json = json.loads(data_content)
                                delta = data_json.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield f"data: {json.dumps({'content': content})}\n\n"
                            except Exception as e:
                                logger.error(f"Error parsing SSE stream line: {line} - {e}")
        except Exception as e:
            logger.error(f"Error calling OpenRouter API for coder streaming: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
