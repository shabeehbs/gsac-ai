import { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, Loader, Pencil, X, Save, Plus, Trash2 } from 'lucide-react';
import { supabase, type AIAnalysisSecondPass, type RCAReport, type CorrectiveAction } from '../lib/supabase';
import { Button } from './ui/Button';

interface RCAReportViewerProps {
  incidentId: string;
  secondPassAnalysis: AIAnalysisSecondPass | null;
  existingReport: RCAReport | null;
  userId: string;
  onReportGenerated: () => void;
}

interface EditableCorrectiveAction {
  action: string;
  responsibility: string;
  timeline: string;
  priority: 'high' | 'medium' | 'low';
}

function parseCorrectiveAction(actionItem: string | CorrectiveAction): EditableCorrectiveAction {
  if (typeof actionItem === 'string') {
    try {
      const parsed = JSON.parse(actionItem);
      return {
        action: parsed?.action || actionItem,
        responsibility: parsed?.responsibility || '',
        timeline: parsed?.timeline || '',
        priority: parsed?.priority || 'medium',
      };
    } catch {
      return { action: actionItem, responsibility: '', timeline: '', priority: 'medium' };
    }
  }
  return {
    action: actionItem.action,
    responsibility: actionItem.responsibility || '',
    timeline: actionItem.timeline || '',
    priority: actionItem.priority || 'medium',
  };
}

function parsePreventiveAction(actionItem: string | { action: string }): string {
  if (typeof actionItem === 'string') {
    try {
      const parsed = JSON.parse(actionItem);
      return parsed?.action || actionItem;
    } catch {
      return actionItem;
    }
  }
  return actionItem.action;
}

export function RCAReportViewer({
  incidentId,
  secondPassAnalysis,
  existingReport,
  userId,
  onReportGenerated,
}: RCAReportViewerProps) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<RCAReport | null>(existingReport);
  const [isEditing, setIsEditing] = useState(false);

  const [editExecutiveSummary, setEditExecutiveSummary] = useState('');
  const [editRootCauses, setEditRootCauses] = useState<string[]>([]);
  const [editContributingFactors, setEditContributingFactors] = useState<string[]>([]);
  const [editCorrectiveActions, setEditCorrectiveActions] = useState<EditableCorrectiveAction[]>([]);
  const [editPreventiveActions, setEditPreventiveActions] = useState<string[]>([]);
  const [editComplianceRefs, setEditComplianceRefs] = useState<string[]>([]);

  useEffect(() => {
    if (report && secondPassAnalysis) {
      setEditExecutiveSummary(report.executive_summary || '');
      setEditRootCauses([...secondPassAnalysis.root_causes]);
      setEditContributingFactors([...secondPassAnalysis.contributing_factors]);
      setEditCorrectiveActions(secondPassAnalysis.corrective_actions.map(parseCorrectiveAction));
      setEditPreventiveActions(secondPassAnalysis.preventive_actions.map(parsePreventiveAction));
      setEditComplianceRefs([...report.compliance_references]);
    }
  }, [report, secondPassAnalysis]);

  const generateReport = async () => {
    if (!secondPassAnalysis) return;

    setGenerating(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-rca-report`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secondPassId: secondPassAnalysis.id }),
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const { data: reportData } = await supabase
        .from('rca_reports')
        .select('*')
        .eq('incident_id', incidentId)
        .single();

      if (reportData) {
        setReport(reportData);
        onReportGenerated();
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const startEditing = () => {
    if (report && secondPassAnalysis) {
      setEditExecutiveSummary(report.executive_summary || '');
      setEditRootCauses([...secondPassAnalysis.root_causes]);
      setEditContributingFactors([...secondPassAnalysis.contributing_factors]);
      setEditCorrectiveActions(secondPassAnalysis.corrective_actions.map(parseCorrectiveAction));
      setEditPreventiveActions(secondPassAnalysis.preventive_actions.map(parsePreventiveAction));
      setEditComplianceRefs([...report.compliance_references]);
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveChanges = async () => {
    if (!report || !secondPassAnalysis) return;

    setSaving(true);
    try {
      const { error: reportError } = await supabase
        .from('rca_reports')
        .update({
          executive_summary: editExecutiveSummary,
          compliance_references: editComplianceRefs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      if (reportError) throw reportError;

      const formattedCorrectiveActions = editCorrectiveActions.map(a => JSON.stringify(a));

      const { error: analysisError } = await supabase
        .from('ai_analysis_second_pass')
        .update({
          root_causes: editRootCauses,
          contributing_factors: editContributingFactors,
          corrective_actions: formattedCorrectiveActions,
          preventive_actions: editPreventiveActions,
        })
        .eq('id', secondPassAnalysis.id);

      if (analysisError) throw analysisError;

      setReport({ ...report, executive_summary: editExecutiveSummary, compliance_references: editComplianceRefs });
      setIsEditing(false);
      onReportGenerated();
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = async () => {
    if (!report) return;

    setExporting(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/pdf/export-rca-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ incident_id: incidentId }),
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RCA_Report_${report.report_number.replace('/', '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const addRootCause = () => setEditRootCauses([...editRootCauses, '']);
  const removeRootCause = (index: number) => setEditRootCauses(editRootCauses.filter((_, i) => i !== index));
  const updateRootCause = (index: number, value: string) => {
    const updated = [...editRootCauses];
    updated[index] = value;
    setEditRootCauses(updated);
  };

  const addContributingFactor = () => setEditContributingFactors([...editContributingFactors, '']);
  const removeContributingFactor = (index: number) => setEditContributingFactors(editContributingFactors.filter((_, i) => i !== index));
  const updateContributingFactor = (index: number, value: string) => {
    const updated = [...editContributingFactors];
    updated[index] = value;
    setEditContributingFactors(updated);
  };

  const addCorrectiveAction = () => setEditCorrectiveActions([...editCorrectiveActions, { action: '', responsibility: '', timeline: '', priority: 'medium' }]);
  const removeCorrectiveAction = (index: number) => setEditCorrectiveActions(editCorrectiveActions.filter((_, i) => i !== index));
  const updateCorrectiveAction = (index: number, field: keyof EditableCorrectiveAction, value: string) => {
    const updated = [...editCorrectiveActions];
    updated[index] = { ...updated[index], [field]: value };
    setEditCorrectiveActions(updated);
  };

  const addPreventiveAction = () => setEditPreventiveActions([...editPreventiveActions, '']);
  const removePreventiveAction = (index: number) => setEditPreventiveActions(editPreventiveActions.filter((_, i) => i !== index));
  const updatePreventiveAction = (index: number, value: string) => {
    const updated = [...editPreventiveActions];
    updated[index] = value;
    setEditPreventiveActions(updated);
  };

  const addComplianceRef = () => setEditComplianceRefs([...editComplianceRefs, '']);
  const removeComplianceRef = (index: number) => setEditComplianceRefs(editComplianceRefs.filter((_, i) => i !== index));
  const updateComplianceRef = (index: number, value: string) => {
    const updated = [...editComplianceRefs];
    updated[index] = value;
    setEditComplianceRefs(updated);
  };

  if (!secondPassAnalysis) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg">
        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600">Complete the second-pass analysis first</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Generate Formal RCA Report</h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          Create a comprehensive Root Cause Analysis report based on the AI analysis and human review.
        </p>
        <button
          onClick={generateReport}
          disabled={generating}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
        >
          {generating ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Generating Report...</span>
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              <span>Generate RCA Report</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-900">Report Generated</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-green-700 font-mono">{report.report_number}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            report.report_status === 'published'
              ? 'bg-green-100 text-green-800'
              : report.report_status === 'approved'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-slate-100 text-slate-700'
          }`}>
            {report.report_status.toUpperCase()}
          </span>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800">
            <Pencil className="w-4 h-4" />
            <span className="font-medium">Editing Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={saveChanges} loading={saving} className="bg-emerald-600 hover:bg-emerald-500">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          Root Cause Analysis Report
        </h2>

        <section className="mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
            Executive Summary
          </h3>
          {isEditing ? (
            <textarea
              value={editExecutiveSummary}
              onChange={(e) => setEditExecutiveSummary(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg text-slate-700 leading-relaxed min-h-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-slate-700 leading-relaxed">{report.executive_summary}</p>
          )}
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Root Causes</h3>
            {isEditing && (
              <button onClick={addRootCause} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {(isEditing ? editRootCauses : secondPassAnalysis.root_causes).map((cause, i) => (
              <li key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <span className="font-bold text-red-600">{i + 1}.</span>
                {isEditing ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={cause}
                      onChange={(e) => updateRootCause(i, e.target.value)}
                      className="flex-1 p-2 border border-slate-300 rounded text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => removeRootCause(i)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-700">{cause}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Contributing Factors</h3>
            {isEditing && (
              <button onClick={addContributingFactor} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>
          <ul className={isEditing ? "space-y-2" : "grid grid-cols-1 md:grid-cols-2 gap-2"}>
            {(isEditing ? editContributingFactors : secondPassAnalysis.contributing_factors).map((factor, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-700 bg-slate-50 p-2 rounded">
                {isEditing ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={factor}
                      onChange={(e) => updateContributingFactor(i, e.target.value)}
                      className="flex-1 p-2 border border-slate-300 rounded text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => removeContributingFactor(i)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-amber-600">•</span>
                    <span className="text-sm">{factor}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Corrective Actions</h3>
            {isEditing && (
              <button onClick={addCorrectiveAction} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>
          <div className="space-y-3">
            {(isEditing ? editCorrectiveActions : secondPassAnalysis.corrective_actions.map(parseCorrectiveAction)).map((action, i) => (
              <div key={i} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-blue-900">Action {i + 1}</span>
                      <button onClick={() => removeCorrectiveAction(i)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={action.action}
                      onChange={(e) => updateCorrectiveAction(i, 'action', e.target.value)}
                      placeholder="Action description"
                      className="w-full p-2 border border-slate-300 rounded text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">Responsibility</label>
                        <input
                          type="text"
                          value={action.responsibility}
                          onChange={(e) => updateCorrectiveAction(i, 'responsibility', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">Timeline</label>
                        <input
                          type="text"
                          value={action.timeline}
                          onChange={(e) => updateCorrectiveAction(i, 'timeline', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">Priority</label>
                        <select
                          value={action.priority}
                          onChange={(e) => updateCorrectiveAction(i, 'priority', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-blue-900">Action {i + 1}</span>
                      {action.priority && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          action.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : action.priority === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {action.priority.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700">{action.action}</p>
                    {(action.timeline || action.responsibility) && (
                      <div className="mt-2 text-sm text-slate-600 space-y-1">
                        {action.timeline && <div>Timeline: {action.timeline}</div>}
                        {action.responsibility && <div>Responsibility: {action.responsibility}</div>}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Preventive Actions</h3>
            {isEditing && (
              <button onClick={addPreventiveAction} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {(isEditing ? editPreventiveActions : secondPassAnalysis.preventive_actions.map(parsePreventiveAction)).map((actionText, i) => (
              <li key={i} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                {isEditing ? (
                  <div className="flex-1 flex gap-2">
                    <span className="text-green-600 font-semibold">{i + 1}.</span>
                    <input
                      type="text"
                      value={actionText}
                      onChange={(e) => updatePreventiveAction(i, e.target.value)}
                      className="flex-1 p-2 border border-slate-300 rounded text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => removePreventiveAction(i)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-green-600 font-semibold">{i + 1}.</span>
                    <span className="text-slate-700">{actionText}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Compliance References</h3>
            {isEditing && (
              <button onClick={addComplianceRef} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              {editComplianceRefs.map((ref, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={ref}
                    onChange={(e) => updateComplianceRef(i, e.target.value)}
                    className="flex-1 p-2 border border-slate-300 rounded text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., OSHA 1910.132"
                  />
                  <button onClick={() => removeComplianceRef(i)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {report.compliance_references.map((ref, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                >
                  {ref}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="flex gap-3">
        <button
          onClick={exportPDF}
          disabled={exporting}
          className="flex-1 bg-slate-600 text-white py-3 rounded-lg font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {exporting ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Export as PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
