import os
import re
import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from typing import List

from app.core.config import settings
from app.schemas.llm_validation import LLMTestCaseResponse, LLMTestDataResponse, LLMTestCaseItem, LLMTestDataItem


def _sanitize_tc_output(text: str) -> str:
    """
    Post-process LLM-generated test case markdown.
    - Strip ALL variants of HTML <br> tags that some models emit inside table
      cells despite being explicitly told not to (safety net).
    - Replace them with a single space so cell content stays on one visual line
      in the markdown table, exactly as intended by the prompt.
    """
    # Covers <br>, <br/>, <br />, <BR>, <BR/> etc.
    cleaned = re.sub(r'<br\s*/?>', ' ', text, flags=re.IGNORECASE)
    # Also collapse any double-spaces that might result
    cleaned = re.sub(r'  +', ' ', cleaned)
    return cleaned


def _build_llm(max_tokens: int):
    """
    Factory that returns the appropriate LangChain chat model based on AI_PROVIDER.

    - "openrouter" → ChatOpenAI pointed at https://openrouter.ai/api/v1
      Ideal for development: free/cheap models avoid Gemini free-tier quota limits.
    - "gemini" (default) → ChatGoogleGenerativeAI (Gemini 2.5 Flash)
      Used in production where the Gemini quota is sufficient.
    """
    provider = (settings.AI_PROVIDER or "gemini").lower().strip()

    if provider == "openrouter":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.OPENAI_MODEL,
            openai_api_key=settings.OPENAI_API_KEY,
            openai_api_base=settings.OPENAI_BASE_URL,
            temperature=0.7,
            max_tokens=max_tokens,
        )

    # Default: Google Gemini
    from langchain_google_genai import ChatGoogleGenerativeAI
    api_key = settings.GEMINI_API_KEY or "dummy-key"
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=api_key,
        temperature=0.7,
        max_output_tokens=max_tokens,
    )


class AIService:
    def __init__(self):
        provider = (settings.AI_PROVIDER or "gemini").lower().strip()
        print(f"[AIService] Initialized with provider: {provider.upper()}")

        # High-capacity LLM for long-form document generation (BRD, FRS, PRS).
        # max_output_tokens=8192 prevents silent mid-document truncation which
        # occurs when a 10-section FRS or detailed BRD exceeds the default budget.
        self.llm_doc = _build_llm(max_tokens=8192)

        # Standard LLM for structured JSON outputs (test cases, test data).
        # These responses are compact — a lower token budget keeps latency down.
        self.llm = _build_llm(max_tokens=4096)

    def generate_brd(self, context_text: str) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Act as a Senior Business Analyst and generate a professional Business Requirements Document (BRD) based strictly on the user’s input. Use only the information explicitly provided by the user and do not assume, infer, or add any missing details under any circumstances. If any required information is not available, leave the respective section blank without fabricating or approximating content. Maintain a formal, clear, and stakeholder-ready business tone throughout the document, ensuring it is well-structured, concise, and professionally formatted. The BRD must include the following sections: Executive Summary, Business Objectives, Scope (with In Scope and Out of Scope), Functional Requirements, Business Rules, Assumptions and Constraints, and Approval & Sign-off. Map only the user-provided content to the appropriate sections and do not include any explanations, comments, or additional meta-text. The final output should be clean, readable, and suitable for direct stakeholder review."),
            ("user", "Context/Input:\n{context}")
        ])
        chain = prompt | self.llm_doc | StrOutputParser()
        # In a real async scenario, we'd use chain.ainvoke, but this might run inside Celery sync scope.
        return chain.invoke({"context": context_text})

    def generate_frs(self, context_text: str) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Act as a Senior Systems Analyst and generate a professional Functional Requirements Specification (FRS) document based strictly on the user's input. Use only the information explicitly provided by the user and do not assume, infer, or add any missing details under any circumstances. If any required information is not available, leave the respective section blank without fabricating content. Maintain a formal, clear, and technically precise tone throughout, ensuring the document is well-structured and suitable for direct handoff to development teams. The FRS must include the following sections: 1. Introduction (Purpose, Scope, Definitions & Acronyms, References), 2. System Overview, 3. Functional Requirements (use FR-001 numbering, with Description, Priority, and Acceptance Criteria for each), 4. Non-Functional Requirements (Performance, Security, Usability, Scalability), 5. System Interfaces (UI, API, External System integrations), 6. Data Requirements (entities, fields, validations), 7. Business Rules & Constraints, 8. Error Handling & Exception Flows, 9. Assumptions & Dependencies, 10. Appendix. Map only the user-provided content to the appropriate sections. Do not include any explanations, comments, or meta-text. The final output must be clean, readable, and in Markdown format."),
            ("user", "Context/Input:\n{context}")
        ])
        chain = prompt | self.llm_doc | StrOutputParser()
        return chain.invoke({"context": context_text})

    def generate_prs(self, context_text: str) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Act as a Senior Product Manager and generate a professional Product Requirements Specification (PRS) document based strictly on the user's input. Use only the information explicitly provided by the user and do not assume, infer, or add any missing details under any circumstances. If any required information is not available, leave the respective section blank without fabricating content. Maintain a formal, clear, and product-focused tone throughout, ensuring the document is well-structured and suitable for both stakeholders and product teams. The PRS must include the following sections: 1. Product Vision & Strategy (Purpose, Target Audience, Value Proposition), 2. User Personas & Demographics, 3. User Stories & Acceptance Criteria (format each as: As a [Persona], I want [Capability], so that [Business Outcome]. Include Priority [High / Medium / Low] and Acceptance Criteria for each story. Group stories by Epic or Feature area.), 4. Product Features & Capabilities, 5. User Experience & Design Requirements, 6. Release Criteria & Milestones, 7. Metrics & Analytics (KPIs), 8. Competitive Context / Market Positioning, 9. Out of Scope, 10. Approval & Sign-off. Map only the user-provided content to the appropriate sections. Do not include any explanations, comments, or meta-text. The final output must be clean, readable, and in Markdown format."),
            ("user", "Context/Input:\n{context}")
        ])
        chain = prompt | self.llm_doc | StrOutputParser()
        return chain.invoke({"context": context_text})

    def generate_test_cases_doc(self, context_text: str) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Act as a Senior QA Engineer and generate a comprehensive Test Case Document based STRICTLY on the content provided by the user.

CRITICAL RULES — MUST FOLLOW WITHOUT EXCEPTION:
1. Use ONLY the modules, features, workflows, and scenarios EXPLICITLY mentioned in the source document.
2. Do NOT invent, assume, extrapolate, or hallucinate any module names, features, behaviors, or data fields.
3. If a module or feature is unclear, mark its test cases with a [CLARIFY] note but DO NOT fabricate details.
4. The Actual Result column MUST always be left completely blank. Never populate it.
5. OUTPUT FORMAT IS PLAIN MARKDOWN ONLY. You are STRICTLY FORBIDDEN from using ANY HTML tags whatsoever.
   - FORBIDDEN: <br>, <br/>, <br />, <p>, <div>, <span>, or any other HTML element.
   - For multiple steps inside a table cell, number them inline: "1. Step one 2. Step two 3. Step three"
   - Steps MUST appear on a SINGLE LINE inside the table cell, separated only by the numbering (1. 2. 3.).
   - Do NOT add any line break character or tag between steps. Keep the cell content as a single continuous line.

─────────────────────────────────────────
OUTPUT FORMAT — Strict Structure
─────────────────────────────────────────
For EACH module found in the document, output one section:

## Module: [Exact Module Name from Document]

| Test Case ID | Title | Module | Priority | Test Type | Description | Preconditions | Test Steps | Test Data | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-[CODE]-001 | [Title] | [Module] | P1/P2/P3 | Functional | [What this validates] | [State before test] | 1. Open login page 2. Enter username 3. Click Submit | [Data or -] | [Expected behavior] | |

─────────────────────────────────────────
COLUMN RULES
─────────────────────────────────────────
Test Case ID  : TC-[3-4 letter code]-[3-digit number]. e.g. TC-AUTH-001
Title         : Short, action-oriented. e.g. "Verify successful login with valid credentials"
Module        : Exact module name from the document
Priority      : P1 = critical flow / data loss risk | P2 = major feature | P3 = minor / cosmetic
Test Type     : Functional | Negative | Edge | Security (use Security only per rule below)
Description   : One sentence — what this test validates
Preconditions : System state, user role, existing data required before executing
Test Steps    : Numbered inline steps on a SINGLE LINE. Format: "1. Do X 2. Do Y 3. Do Z". NEVER use <br> or any HTML. NEVER use newline characters inside table cells.
Test Data     : Realistic sample values only (see Test Data Rules below). Use "-" if none needed.
Expected Result : Clear, measurable system behavior
Actual Result : ALWAYS EMPTY — never fill this column

─────────────────────────────────────────
COVERAGE RULES — apply to every module
─────────────────────────────────────────
Generate per module:
• Positive cases  — valid inputs, happy path flows
• Negative cases  — invalid inputs, error scenarios, constraint violations
• Edge cases      — minimum 2 per module:
    - At least one boundary value test (0, -1, max, max+1)
    - At least one null / empty / whitespace-only / oversized input test

─────────────────────────────────────────
TEST DATA RULES
─────────────────────────────────────────
Always provide realistic, domain-appropriate values. Use these conventions:

Strings     : Valid example + empty string + whitespace-only + 256-char oversize string
Numbers     : Valid value + 0 + negative (-1) + boundary max + max+1
Dates       : Valid ISO date + past date + future date + invalid format (e.g. 99/99/9999)
Emails      : valid@example.com + missing-@domain.com + plain-string
Passwords   : Valid (e.g. Admin@123) + too short + no special char + spaces only
IDs / Tokens: Valid UUID + empty + malformed string + already-used/expired value
Files       : Valid type+size + oversized file + unsupported extension + empty file (0 bytes)

Use "-" only when the test genuinely requires no data input.

─────────────────────────────────────────
SECURITY TEST RULES — conditional
─────────────────────────────────────────
Add Security test cases ONLY when the module explicitly involves one or more of:
  • User authentication or authorization (login, logout, session, tokens, roles)
  • User-controlled input that is stored or rendered (forms, search, rich text, file names)
  • File upload or download
  • API endpoints or URL parameters that accept user input
  • Password or credential management

When triggered, include at minimum:
  • SQL injection attempt        : e.g. ' OR '1'='1' --
  • XSS payload                  : e.g. <script>alert('xss')</script>
  • Privilege escalation attempt : low-privilege user accessing admin-only resource
  • Broken auth scenario         : expired token, reused token, missing auth header

Do NOT add Security cases for purely read-only, display, or reporting modules.

─────────────────────────────────────────
OUTPUT RULES
─────────────────────────────────────────
• Output ONLY the module sections with markdown tables.
• No introduction, conclusion, meta-commentary, or explanations.
• Output must be clean, complete, and directly usable by QA teams."""),
            ("user", "Source Document Content:\n{context}")
        ])
        chain = prompt | self.llm_doc | StrOutputParser()
        raw = chain.invoke({"context": context_text})
        return _sanitize_tc_output(raw)

    def generate_test_data_doc(self, context_text: str) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Act as a Senior QA Engineer and Test Data Architect. Generate a comprehensive Test Data Document based STRICTLY on the content provided by the user.

CRITICAL RULES — MUST FOLLOW WITHOUT EXCEPTION:
1. Use ONLY the modules, features, fields, and workflows EXPLICITLY mentioned in the source document.
2. Do NOT invent, assume, extrapolate, or hallucinate any module names, field names, or data values.
3. OUTPUT FORMAT IS PLAIN MARKDOWN ONLY. You are STRICTLY FORBIDDEN from using ANY HTML tags whatsoever.
   - FORBIDDEN: <br>, <br/>, <br />, <p>, <div>, <span>, or any other HTML element.
   - Keep every table cell content on a SINGLE LINE. Do NOT add line breaks inside table cells.
4. Every value in the "Title" column MUST follow this pattern:
   [Short descriptive label] — [Brief industry-standard description of what this data tests]
   Example: "Valid Email — Standard RFC-compliant email address for successful login"
   Example: "Boundary Max Username — 50-character username at the maximum allowed length"

─────────────────────────────────────────
OUTPUT FORMAT — Strict Structure
─────────────────────────────────────────
For EACH module found in the document, output one section:

## Module: [Exact Module Name from Document]

| Test Data ID | Title | Module | Field / Parameter | Data Type | Positive / Valid Values | Negative / Invalid Values | Boundary Values | Edge / Special Cases | Expected Validation Behavior |
|---|---|---|---|---|---|---|---|---|---|
| TD-[CODE]-001 | [Label — Description] | [Module] | [Field Name] | String / Number / Date / Email / Password / File / Boolean / UUID | [Realistic valid example values] | [Realistic invalid example values] | [Min / Max / Zero / Max+1 values] | [Null / Empty / Whitespace / Oversize] | [What the system should validate/enforce] |

─────────────────────────────────────────
COLUMN RULES
─────────────────────────────────────────
Test Data ID    : TD-[3-4 letter module code]-[3-digit number]. e.g. TD-AUTH-001
Title           : [Short Label] — [Industry-standard description of what data scenario is being tested]. REQUIRED. Never leave blank.
Module          : Exact module name from the document
Field/Parameter : The specific input field, API parameter, or form element being tested
Data Type       : One of — String | Number | Integer | Decimal | Date | DateTime | Email | Password | Phone | URL | UUID | File | Boolean | Enum | JSON
Positive Values : 2-3 realistic, valid, accepted sample values separated by " | "
Negative Values : 2-3 realistic, invalid, rejected sample values covering common error types, separated by " | "
Boundary Values : Explicit boundary values — minimum, maximum, zero, empty, max+1 as applicable
Edge/Special    : Null | Empty string | Whitespace-only | 256-char oversize | Special chars | Unicode | SQL injection pattern | XSS payload
Expected Validation Behavior : One concise sentence — what the system must do when this data is submitted

─────────────────────────────────────────
COVERAGE RULES — apply to every module
─────────────────────────────────────────
For each identifiable field in the module, generate:
• At minimum ONE row covering positive/valid data
• At minimum ONE row covering negative/invalid data
• At minimum ONE row covering boundary values
• At minimum ONE row covering edge/special cases (null, empty, oversize, injection)
• For authentication fields: include SQL injection and XSS payloads in Edge/Special Cases column
• For file fields: include valid type+size, oversized, wrong extension, empty file (0 bytes)
• For date fields: include past, future, invalid format (99/99/9999), leap year
• For numeric fields: include 0, -1, max value, max+1, decimal where integer expected

─────────────────────────────────────────
DATA VALUE CONVENTIONS
─────────────────────────────────────────
Strings     : "validuser123" | "" (empty) | "   " (whitespace) | "A"*256 (oversize)
Numbers     : 1 | 0 | -1 | [domain max] | [max+1]
Dates       : "2024-06-15" | "1900-01-01" | "2099-12-31" | "99/99/9999"
Emails      : "user@example.com" | "missing-at-sign" | "user@" | "@domain.com"
Passwords   : "Admin@123" | "abc" (too short) | "password" (no special) | "   " (spaces)
UUIDs       : Valid UUID | "" | "not-a-uuid" | Already expired/revoked value
Files       : Valid .docx <5MB | 50MB oversized | .exe unsupported | 0-byte empty file
Phone       : "+1-800-555-0199" | "1234" (too short) | "abcdefghij" (non-numeric)

─────────────────────────────────────────
OUTPUT RULES
─────────────────────────────────────────
• Output ONLY the module sections with markdown tables.
• No introduction, conclusion, meta-commentary, or explanations.
• Output must be clean, complete, and directly usable by QA teams and automation engineers."""),
            ("user", "Source Document Content:\n{context}")
        ])
        chain = prompt | self.llm_doc | StrOutputParser()
        raw = chain.invoke({"context": context_text})
        return _sanitize_tc_output(raw)

    def generate_test_cases(self, brd_text: str) -> list[dict]:

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert QA Engineer. Extract detailed Functional and Non-Functional Test Cases from the provided BRD text. Return ONLY a valid JSON array of objects. Each object must have keys: 'test_case_id', 'module', 'description', 'pre_conditions', 'steps_to_execute', 'expected_result'. Do not include markdown blocks or any other text."),
            ("user", "BRD Text:\n{brd_text}")
        ])
        chain = prompt | self.llm | StrOutputParser()
        result_text = chain.invoke({"brd_text": brd_text})
        try:
            # Clean up potential markdown formatting from LLM
            cln = result_text.replace("```json", "").replace("```", "").strip()
            raw_data = json.loads(cln)

            # Validate with Pydantic v2 RootModel
            validated = LLMTestCaseResponse.model_validate(raw_data)
            return [item.model_dump() for item in validated]
        except json.JSONDecodeError:
            return [{"test_case_id": "TC001", "module": "Parsing Error", "description": "Failed to parse LLM output", "pre_conditions": "N/A", "steps_to_execute": "N/A", "expected_result": "N/A"}]
        except Exception as e:
            # Return a single error item if validation fails
            return [{"test_case_id": "TC001", "module": "Validation Error", "description": f"Validation failed: {str(e)}", "pre_conditions": "N/A", "steps_to_execute": "N/A", "expected_result": "N/A"}]

    def generate_test_data(self, test_cases_json: str) -> list[dict]:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a test data generation expert. Based on the provided JSON of Test Cases, generate appropriate and realistic test data values to execute these tests. Return ONLY a valid JSON array of objects. Each object must have keys: 'test_case_id', 'parameter_name', 'test_data_value', 'data_type'. Do not include markdown blocks or any other text."),
            ("user", "Test Cases JSON:\n{test_cases}")
        ])
        chain = prompt | self.llm | StrOutputParser()
        result_text = chain.invoke({"test_cases": test_cases_json})
        try:
            cln = result_text.replace("```json", "").replace("```", "").strip()
            raw_data = json.loads(cln)

            # Validate with Pydantic v2 RootModel
            validated = LLMTestDataResponse.model_validate(raw_data)
            return [item.model_dump() for item in validated]
        except json.JSONDecodeError:
            return [{"test_case_id": "TC001", "parameter_name": "ParsingError", "test_data_value": "Failed to parse LLM output", "data_type": "string"}]
        except Exception as e:
            # Return a single error item if validation fails
            return [{"test_case_id": "TC001", "parameter_name": "ValidationError", "test_data_value": f"Validation failed: {str(e)}", "data_type": "string"}]
