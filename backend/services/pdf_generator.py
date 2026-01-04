from datetime import datetime
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import json


def generate_rca_pdf(report_data: dict, incident_data: dict, analysis_data: dict) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=1*inch,
        bottomMargin=0.75*inch,
    )

    story = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#334155'),
        spaceAfter=12,
        spaceBefore=20,
        fontName='Helvetica-Bold'
    )

    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=colors.HexColor('#475569'),
        spaceAfter=8,
        spaceBefore=12,
        fontName='Helvetica-Bold'
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        textColor=colors.HexColor('#334155'),
        alignment=TA_JUSTIFY,
        spaceAfter=12,
        leading=16
    )

    story.append(Paragraph("Root Cause Analysis Report", title_style))
    story.append(Spacer(1, 0.2*inch))

    metadata_data = [
        ['Report Number:', report_data.get('report_number', 'N/A')],
        ['Status:', report_data.get('report_status', 'N/A').upper()],
        ['Incident Title:', incident_data.get('title', 'N/A')],
        ['Incident Date:', incident_data.get('incident_date', 'N/A')],
        ['Severity:', incident_data.get('severity', 'N/A').upper()],
        ['Report Generated:', datetime.fromisoformat(report_data.get('created_at', '')).strftime('%Y-%m-%d %H:%M') if report_data.get('created_at') else 'N/A'],
    ]

    metadata_table = Table(metadata_data, colWidths=[2*inch, 4.5*inch])
    metadata_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f1f5f9')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#334155')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))

    story.append(metadata_table)
    story.append(Spacer(1, 0.3*inch))

    story.append(Paragraph("Executive Summary", heading_style))
    summary_text = report_data.get('executive_summary', 'No summary available.')
    story.append(Paragraph(summary_text, body_style))
    story.append(Spacer(1, 0.2*inch))

    story.append(Paragraph("Incident Description", heading_style))
    description = incident_data.get('description', 'No description available.')
    story.append(Paragraph(description, body_style))
    story.append(Spacer(1, 0.2*inch))

    root_causes = analysis_data.get('root_causes', [])
    if root_causes:
        story.append(Paragraph("Root Causes", heading_style))
        for idx, cause in enumerate(root_causes, 1):
            cause_text = f"<b>{idx}.</b> {cause}"
            story.append(Paragraph(cause_text, body_style))
        story.append(Spacer(1, 0.2*inch))

    contributing_factors = analysis_data.get('contributing_factors', [])
    if contributing_factors:
        story.append(Paragraph("Contributing Factors", heading_style))
        for factor in contributing_factors:
            factor_text = f"• {factor}"
            story.append(Paragraph(factor_text, body_style))
        story.append(Spacer(1, 0.2*inch))

    corrective_actions = analysis_data.get('corrective_actions', [])
    if corrective_actions:
        story.append(Paragraph("Corrective Actions", heading_style))
        for idx, action_item in enumerate(corrective_actions, 1):
            if isinstance(action_item, str):
                try:
                    action = json.loads(action_item)
                except:
                    action = {'action': action_item}
            else:
                action = action_item

            action_text = action.get('action', str(action_item))
            priority = action.get('priority', '').upper() if isinstance(action, dict) else ''
            timeline = action.get('timeline', '') if isinstance(action, dict) else ''
            responsibility = action.get('responsibility', '') if isinstance(action, dict) else ''

            story.append(Paragraph(f"<b>Action {idx}</b> {f'[{priority} PRIORITY]' if priority else ''}", subheading_style))
            story.append(Paragraph(action_text, body_style))

            if timeline or responsibility:
                details = []
                if timeline:
                    details.append(f"<b>Timeline:</b> {timeline}")
                if responsibility:
                    details.append(f"<b>Responsibility:</b> {responsibility}")
                story.append(Paragraph(" | ".join(details), body_style))

            story.append(Spacer(1, 0.1*inch))

    preventive_actions = analysis_data.get('preventive_actions', [])
    if preventive_actions:
        story.append(Paragraph("Preventive Actions", heading_style))
        for idx, action_item in enumerate(preventive_actions, 1):
            if isinstance(action_item, str):
                try:
                    action = json.loads(action_item)
                    action_text = action.get('action', action_item)
                except:
                    action_text = action_item
            else:
                action_text = action_item.get('action', str(action_item))

            story.append(Paragraph(f"<b>{idx}.</b> {action_text}", body_style))
        story.append(Spacer(1, 0.2*inch))

    compliance_refs = report_data.get('compliance_references', [])
    if compliance_refs:
        story.append(Paragraph("Compliance References", heading_style))
        refs_text = ", ".join(compliance_refs)
        story.append(Paragraph(refs_text, body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer
