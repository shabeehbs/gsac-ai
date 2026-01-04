import openai
import os
from typing import Dict, Any
import base64

openai.api_key = os.getenv("OPENAI_API_KEY")

class AIService:
    @staticmethod
    def _truncate_text(text: str, max_length: int = 1000) -> str:
        """Truncate text to reduce token usage"""
        if not text or len(text) <= max_length:
            return text
        return text[:max_length] + "... [truncated]"

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
            description = AIService._truncate_text(str(incident_data.get('description', 'N/A')), 600)

            prompt = f"""Analyze incident:

Title: {incident_data.get('title', 'N/A')}
Description: {description}
Severity: {incident_data.get('severity', 'N/A')}
Location: {incident_data.get('location', 'N/A')}
Date: {incident_data.get('incident_date', 'N/A')}
Witnesses: {len(incident_data.get('witnesses', []))} | Documents: {len(incident_data.get('documents', []))}

Provide:
1. Immediate causes
2. Observable facts
3. Investigation areas
4. Risk level

Format as JSON with keys: immediate_causes, observable_facts, investigation_areas, risk_level"""

            response = await openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800
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
            description = AIService._truncate_text(str(incident_data.get('description', 'N/A')), 500)
            first_analysis = AIService._truncate_text(str(first_pass.get('analysis', 'N/A')), 600)
            feedback = AIService._truncate_text(str(human_feedback), 400)

            prompt = f"""Deep root cause analysis:

Incident: {incident_data.get('title', 'N/A')}
Description: {description}
Severity: {incident_data.get('severity', 'N/A')}

First Pass: {first_analysis}
Expert Feedback: {feedback}

Provide:
1. Root causes (systemic issues)
2. Contributing factors
3. Control failures
4. Corrective actions
5. Preventive measures
6. Implementation timeline

Format as JSON with keys: root_causes, contributing_factors, control_failures, corrective_actions, preventive_measures, implementation_timeline"""

            response = await openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1500
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
            description = AIService._truncate_text(str(incident.get('description', 'N/A')), 500)
            reviewer_notes = AIService._truncate_text(str(review.get('reviewer_notes', 'None')), 300)

            hazards = first_pass.get('identified_hazards', [])[:5]
            causes = first_pass.get('potential_causes', [])[:5]

            prompt = f"""HSE RCA for: {incident.get('title', 'N/A')}
Severity: {incident.get('severity', 'N/A')} | Date: {incident.get('incident_date', 'N/A')}
Description: {description}

First Pass Hazards: {hazards}
First Pass Causes: {causes}

Expert Review: {reviewer_notes}

Produce RCA with "5 Whys" and "Fishbone" analysis. Return JSON with:
1. refinedAnalysis: {{executiveSummary, incidentSequence, evidenceReview}}
2. rootCauseAnalysis: {{fiveWhysAnalysis (5 items), fishboneDiagram (People, Process, Equipment, Environment, Management)}}
3. contributingFactors: 5-8 factors
4. immediateCauses: 3-5 causes
5. rootCauses: 2-4 root causes
6. correctiveActions: 5-8 actions with action, responsibility, timeline, priority
7. preventiveActions: 5-8 measures

Return ONLY valid JSON."""

            response = await openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an HSE investigator. Return only valid JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=2500,
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

            description = AIService._truncate_text(str(incident_data.get('description', 'N/A')), 400)
            first_analysis = AIService._truncate_text(str(first_pass.get('findings', {}).get('analysis', 'N/A') if first_pass else 'N/A'), 500)
            second_analysis = AIService._truncate_text(str(second_pass.get('findings', {}).get('analysis', 'N/A') if second_pass else 'N/A'), 800)

            prompt = f"""Generate HSE RCA report:

Incident: {incident_data.get('title', 'N/A')}
Date: {incident_data.get('incident_date', 'N/A')} | Location: {incident_data.get('location', 'N/A')}
Severity: {incident_data.get('severity', 'N/A')}
Description: {description}

Initial Analysis: {first_analysis}
Deep Analysis: {second_analysis}

Witnesses: {len(incident_data.get('witnesses', []))} | Documents: {len(incident_data.get('documents', []))}

Generate professional Markdown report with sections:
1. Executive Summary
2. Incident Overview
3. Investigation Methodology
4. Immediate Causes
5. Root Causes
6. Contributing Factors
7. Timeline of Events
8. Corrective Actions (priorities & timelines)
9. Preventive Measures
10. Recommendations
11. Lessons Learned
12. Sign-off Section"""

            response = await openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=3000
            )

            return response.choices[0].message.content or "Unable to generate report"
        except Exception as e:
            print(f"Error generating RCA report: {e}")
            raise
