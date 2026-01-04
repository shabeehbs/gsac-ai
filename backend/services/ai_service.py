import openai
import os
from typing import Dict, Any
import base64

openai.api_key = os.getenv("OPENAI_API_KEY")

class AIService:
    @staticmethod
    async def generate_image_description(image_data: bytes, file_type: str) -> str:
        try:
            base64_image = base64.b64encode(image_data).decode('utf-8')

            prompt = """You are an HSE (Health, Safety, and Environment) incident investigation assistant. Analyze this image and provide a detailed, objective description focusing on:

1. Visible hazards or safety concerns
2. Equipment, machinery, or tools visible
3. Environmental conditions
4. People and their safety equipment (PPE)
5. Any visible damage or unsafe conditions
6. Location characteristics

Provide a factual, professional description suitable for an incident investigation report."""

            response = await openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{file_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500
            )

            return response.choices[0].message.content or "Unable to generate image description"
        except Exception as e:
            print(f"Error generating image description: {e}")
            return "Error: Could not generate image description. Image uploaded successfully."

    @staticmethod
    async def perform_first_pass_analysis(incident_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            prompt = f"""Analyze this incident and provide initial findings:

Incident Title: {incident_data.get('title', 'N/A')}
Description: {incident_data.get('description', 'N/A')}
Severity: {incident_data.get('severity', 'N/A')}
Location: {incident_data.get('location', 'N/A')}
Date: {incident_data.get('incident_date', 'N/A')}

Witnesses: {len(incident_data.get('witnesses', []))}
Documents: {len(incident_data.get('documents', []))}

Provide:
1. Immediate causes (what directly led to the incident)
2. Observable facts and evidence
3. Key areas requiring deeper investigation
4. Preliminary risk assessment

Format as JSON with keys: immediate_causes, observable_facts, investigation_areas, risk_level"""

            response = await openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000
            )

            return {
                "analysis": response.choices[0].message.content,
                "confidence_score": 0.7
            }
        except Exception as e:
            print(f"Error in first pass analysis: {e}")
            raise

    @staticmethod
    async def perform_second_pass_analysis(
        incident_data: Dict[str, Any],
        first_pass: Dict[str, Any],
        human_feedback: str
    ) -> Dict[str, Any]:
        try:
            prompt = f"""Perform deep root cause analysis:

INCIDENT DATA:
Title: {incident_data.get('title', 'N/A')}
Description: {incident_data.get('description', 'N/A')}
Severity: {incident_data.get('severity', 'N/A')}

FIRST PASS ANALYSIS:
{first_pass.get('analysis', 'N/A')}

HUMAN EXPERT FEEDBACK:
{human_feedback}

Provide comprehensive root cause analysis including:
1. Root causes (systemic issues, not just immediate causes)
2. Contributing factors (organizational, environmental, human factors)
3. Failure points in existing controls
4. Detailed corrective actions
5. Preventive measures
6. Timeline for implementation

Format as JSON with keys: root_causes, contributing_factors, control_failures, corrective_actions, preventive_measures, implementation_timeline"""

            response = await openai.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2000
            )

            return {
                "analysis": response.choices[0].message.content,
                "confidence_score": 0.9
            }
        except Exception as e:
            print(f"Error in second pass analysis: {e}")
            raise

    @staticmethod
    async def perform_comprehensive_second_pass(
        incident: Dict[str, Any],
        first_pass: Dict[str, Any],
        review: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            prompt = f"""You are an expert HSE incident investigator performing a refined Root Cause Analysis (RCA).

**INCIDENT DETAILS:**
Type: {incident.get('incident_type', 'N/A')}
Severity: {incident.get('severity', 'N/A')}
Date: {incident.get('incident_date', 'N/A')}
Location: {incident.get('location', 'N/A')}
Title: {incident.get('title', 'N/A')}
Description: {incident.get('description', 'N/A')}

**FIRST PASS AI ANALYSIS:**
Identified Hazards: {first_pass.get('identified_hazards', [])}
Potential Causes: {first_pass.get('potential_causes', [])}
Recommended Actions: {first_pass.get('recommended_actions', [])}

**HUMAN EXPERT REVIEW:**
Review Status: {review.get('review_status', 'N/A')}
Reviewer Notes: {review.get('reviewer_notes', 'None')}
Approved Hazards: {review.get('approved_hazards', [])}
Approved Causes: {review.get('approved_causes', [])}
Additional Actions: {review.get('additional_actions', [])}

Produce a comprehensive RCA following "5 Whys" and "Fishbone" methodologies. Return a JSON object with:

1. "refinedAnalysis": Object containing executiveSummary, incidentSequence, evidenceReview
2. "rootCauseAnalysis": Object with fiveWhysAnalysis (array of 5 why questions/answers), fishboneDiagram (categories: People, Process, Equipment, Environment, Management)
3. "contributingFactors": Array of 5-10 contributing factors
4. "immediateCauses": Array of 3-7 immediate causes
5. "rootCauses": Array of 2-5 underlying root causes
6. "correctiveActions": Array of objects with action, responsibility, timeline, priority (high/medium/low)
7. "preventiveActions": Array of 5-10 preventive measures

Return ONLY valid JSON."""

            response = await openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a senior HSE investigator with expertise in Root Cause Analysis and OSHA regulations. Return only valid JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )

            analysis_text = response.choices[0].message.content
            if not analysis_text:
                raise Exception("No analysis generated")

            import json
            analysis = json.loads(analysis_text)

            return {
                "refined_analysis": analysis.get("refinedAnalysis", {}),
                "root_cause_analysis": analysis.get("rootCauseAnalysis", {}),
                "contributing_factors": analysis.get("contributingFactors", []),
                "immediate_causes": analysis.get("immediateCauses", []),
                "root_causes": analysis.get("rootCauses", []),
                "corrective_actions": analysis.get("correctiveActions", []),
                "preventive_actions": analysis.get("preventiveActions", [])
            }
        except Exception as e:
            print(f"Error in comprehensive second pass: {e}")
            raise

    @staticmethod
    async def generate_rca_report(incident_data: Dict[str, Any]) -> str:
        try:
            analyses = incident_data.get('analyses', [])
            first_pass = next((a for a in analyses if a['analysis_type'] == 'FIRST_PASS'), None)
            second_pass = next((a for a in analyses if a['analysis_type'] == 'SECOND_PASS'), None)

            prompt = f"""Generate a comprehensive HSE Root Cause Analysis report:

INCIDENT DETAILS:
Title: {incident_data.get('title', 'N/A')}
Date: {incident_data.get('incident_date', 'N/A')}
Location: {incident_data.get('location', 'N/A')}
Severity: {incident_data.get('severity', 'N/A')}
Description: {incident_data.get('description', 'N/A')}

INITIAL ANALYSIS:
{first_pass.get('findings', {}).get('analysis', 'N/A') if first_pass else 'N/A'}

DEEP ANALYSIS:
{second_pass.get('findings', {}).get('analysis', 'N/A') if second_pass else 'N/A'}

WITNESSES: {len(incident_data.get('witnesses', []))}
DOCUMENTS: {len(incident_data.get('documents', []))}

Generate a professional RCA report in Markdown format with:
1. Executive Summary
2. Incident Overview
3. Investigation Methodology
4. Immediate Causes
5. Root Causes
6. Contributing Factors
7. Timeline of Events
8. Corrective Actions (with priorities and timelines)
9. Preventive Measures
10. Recommendations
11. Lessons Learned
12. Sign-off Section

Use proper markdown formatting with headers, bullet points, and emphasis where appropriate."""

            response = await openai.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4000
            )

            return response.choices[0].message.content or "Unable to generate report"
        except Exception as e:
            print(f"Error generating RCA report: {e}")
            raise
