"""
AI Data Entry Assistant
-----------------------
Endpoint that uses Gemini to parse free-form text and suggest database operations.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import json
import google.generativeai as genai

router = APIRouter(prefix="/api/ai-assistant", tags=["ai-assistant"])

# Database Schema Context (for Gemini to understand)
DB_SCHEMA_CONTEXT = """
# Database Schema: Academia UPC

## Tables:

### students
- id: UUID (auto)
- name: TEXT (required)
- phone: TEXT (required, unique)
- email: TEXT
- level: TEXT ("Sétimo", "Octavo", "Noveno", "Bachillerato")
- availability: JSONB (array of slots like ["mon_08", "tue_14"])
- preference: TEXT ("individual" or "grupal")

### tutors
- id: UUID (auto)
- name: TEXT (required)
- phone: TEXT (required, unique)
- email: TEXT
- subject_ids: UUID[] (array of subject IDs)
- availability: JSONB (array of slots)
- hourly_rate: NUMERIC

### subjects
- id: UUID (auto)
- name: TEXT (required) - e.g., "Matemáticas"
- level: TEXT - e.g., "Sétimo", "Octavo"
- code: TEXT (unique) - e.g., "MAT_7", "ESP_8"
- category: TEXT - e.g., "III Ciclo", "Bachillerato"
- individual_price: NUMERIC
- group_price: NUMERIC

### programs
- id: UUID (auto)
- name: TEXT - e.g., "Plan Mensual Sétimo"
- level: TEXT - Same as subjects.level
- type: TEXT ("cohort", "on_demand", "workshop")

### program_structure
- program_id: UUID (FK to programs)
- subject_id: UUID (FK to subjects)
- weekly_hours: INTEGER (1 or 2 typically)

### enrollments
- student_id: UUID (FK)
- program_id: UUID (FK)
- term_id: UUID (FK)
- status: TEXT ("active", "paused", "completed")

## Slot Format:
Availability slots use format: "day_hour" where:
- day: mon, tue, wed, thu, fri, sat
- hour: 08, 09, 10, 11, 14, 15, 16, 17, 18, 19
Example: "mon_14" = Monday 2pm, "wed_09" = Wednesday 9am

## Subject Codes:
Format: [ABBREV]_[LEVEL]
- MAT = Matemáticas, ESP = Español, CIE = Ciencias, EST = Estudios Sociales, ING = Inglés
- Level: 7, 8, 9, B (Bachillerato)
Example: MAT_7, ESP_B
"""


class DataAssistantRequest(BaseModel):
    text: str  # Free-form text from admin
    context: Optional[str] = None  # Optional extra context


class SuggestedOperation(BaseModel):
    operation: str  # "INSERT", "UPDATE", "LINK"
    table: str
    data: Dict[str, Any]
    sql_preview: Optional[str] = None
    warnings: List[str] = []
    missing_fields: List[str] = []


class DataAssistantResponse(BaseModel):
    success: bool
    interpretation: str  # What the AI understood
    suggestions: List[SuggestedOperation]
    raw_entities: Dict[str, Any]  # Extracted entities for debugging


@router.post("/parse", response_model=DataAssistantResponse)
async def parse_data_input(request: DataAssistantRequest):
    """
    Parse free-form text and suggest database operations.
    """
    # Get API key dynamically (after main.py has loaded .env)
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    genai.configure(api_key=api_key)

    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')

        prompt = f"""You are a database assistant for Academia UPC (a tutoring academy).
        
Given the following database schema:
{DB_SCHEMA_CONTEXT}

The admin has provided this text:
---
{request.text}
---

Your task:
1. Understand what the admin wants to do (add tutor, update subject, enroll student, etc.)
2. Extract all relevant entities (names, phones, subjects, hours, availability, etc.)
3. Suggest database operations needed

IMPORTANT: Output STRICT JSON with this structure:
{{
  "interpretation": "Brief description of what you understood",
  "entities": {{
    "type": "tutor|student|subject|program|enrollment",
    "name": "...",
    "phone": "...",
    "email": "...",
    "subjects": ["MAT_7", "ESP_8"],
    "availability": ["mon_14", "wed_09"],
    "level": "Sétimo|Octavo|Noveno|Bachillerato",
    "hourly_rate": 5000,
    ... (any other extracted data)
  }},
  "operations": [
    {{
      "operation": "INSERT|UPDATE",
      "table": "tutors|students|subjects|...",
      "data": {{ ... fields to insert/update ... }},
      "warnings": ["Phone format unusual", "Subject MAT_7 may not exist"],
      "missing_fields": ["email is recommended but not provided"]
    }}
  ]
}}

If you cannot determine the intent, set operations to empty array and explain in interpretation.
Convert phone formats to digits only (e.g., "8888-7777" -> "88887777").
Map day names to slot format (Lunes=mon, Martes=tue, etc.).
"""

        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )

        result = json.loads(response.text)

        # Build suggestions from AI response
        suggestions = []
        for op in result.get("operations", []):
            suggestions.append(SuggestedOperation(
                operation=op.get("operation", "INSERT"),
                table=op.get("table", "unknown"),
                data=op.get("data", {}),
                warnings=op.get("warnings", []),
                missing_fields=op.get("missing_fields", [])
            ))

        return DataAssistantResponse(
            success=True,
            interpretation=result.get("interpretation", "No pude interpretar la solicitud"),
            suggestions=suggestions,
            raw_entities=result.get("entities", {})
        )

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI response was not valid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute")
async def execute_suggestion(suggestion: SuggestedOperation):
    """
    Execute an approved suggestion.
    This would connect to Supabase and run the operation.
    For now, returns the SQL that would be executed.
    """
    # TODO: Implement actual Supabase execution
    # For safety, we just return the SQL preview for now
    
    table = suggestion.table
    data = suggestion.data
    op = suggestion.operation

    if op == "INSERT":
        columns = ", ".join(data.keys())
        values = ", ".join([f"'{v}'" if isinstance(v, str) else str(v) for v in data.values()])
        sql = f"INSERT INTO {table} ({columns}) VALUES ({values});"
    elif op == "UPDATE":
        set_clause = ", ".join([f"{k} = '{v}'" if isinstance(v, str) else f"{k} = {v}" for k, v in data.items() if k != 'id'])
        where = f"id = '{data.get('id')}'" if 'id' in data else "phone = '{}'".format(data.get('phone', '???'))
        sql = f"UPDATE {table} SET {set_clause} WHERE {where};"
    else:
        sql = "-- Operation not supported"

    return {
        "success": True,
        "sql_generated": sql,
        "message": "SQL generated. Execute in Supabase or implement direct connection."
    }
