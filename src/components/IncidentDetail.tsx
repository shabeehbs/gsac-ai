import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  Play,
  Eye,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  ChevronRight,
  MoreHorizontal,
  Download,
  Trash2,
  Sparkles
} from 'lucide-react';
import { supabase, type Incident, type IncidentDocument, type AIAnalysisFirstPass, type HumanReview, type AIAnalysisSecondPass, type RCAReport } from '../lib/supabase';
import { HumanReviewForm } from './HumanReviewForm';
import { RCAReportViewer } from './RCAReportViewer';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';

interface IncidentDetailProps {
  incident: Incident;
  onBack: () => void;
  userId: string;
}

function SecondPassTrigger({ reviewId, onComplete }: { reviewId: string; onComplete: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerSecondPass = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analysis-second-pass`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Second pass analysis failed');
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to run second pass analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-amber-900">Second-Pass Analysis Pending</p>
          <p className="text-sm text-amber-700 mt-1">
            The deep analysis didn't complete automatically. Click below to retry.
          </p>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
          <Button
            onClick={triggerSecondPass}
            loading={loading}
            className="mt-3 bg-amber-600 hover:bg-amber-500"
            size="sm"
          >
            <Sparkles className="h-4 w-4" />
            Run Deep Analysis
          </Button>
        </div>
      </div>
    </div>
  );
}

export function IncidentDetail({ incident, onBack, userId }: IncidentDetailProps) {
  const [documents, setDocuments] = useState<IncidentDocument[]>([]);
  const [firstPassAnalysis, setFirstPassAnalysis] = useState<AIAnalysisFirstPass | null>(null);
  const [humanReview, setHumanReview] = useState<HumanReview | null>(null);
  const [secondPassAnalysis, setSecondPassAnalysis] = useState<AIAnalysisSecondPass | null>(null);
  const [rcaReport, setRcaReport] = useState<RCAReport | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIncidentData();
  }, [incident.id]);

  useEffect(() => {
    const hasProcessingDocs = documents.some(doc => doc.ocr_status === 'processing' || doc.ocr_status === 'pending');
    if (!hasProcessingDocs) return;

    const interval = setInterval(() => {
      loadIncidentData();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  const loadIncidentData = async () => {
    try {
      const [docsData, firstPassData, reviewData, secondPassData, reportData] = await Promise.all([
        supabase.from('incident_documents').select('*').eq('incident_id', incident.id),
        supabase.from('ai_analysis_first_pass').select('*').eq('incident_id', incident.id).maybeSingle(),
        supabase.from('human_reviews').select('*').eq('incident_id', incident.id).maybeSingle(),
        supabase.from('ai_analysis_second_pass').select('*').eq('incident_id', incident.id).maybeSingle(),
        supabase.from('rca_reports').select('*').eq('incident_id', incident.id).maybeSingle(),
      ]);

      if (docsData.data) setDocuments(docsData.data);
      if (firstPassData.data) setFirstPassAnalysis(firstPassData.data);
      if (reviewData.data) setHumanReview(reviewData.data);
      if (secondPassData.data) setSecondPassAnalysis(secondPassData.data);
      if (reportData.data) setRcaReport(reportData.data);
    } catch (error) {
      console.error('Error loading incident data:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setError(null);

    try {
      for (const file of files) {
        const fileName = `${incident.id}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('incident-documents')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        const { data: docData, error: docError } = await supabase
          .from('incident_documents')
          .insert({
            incident_id: incident.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: fileName,
            uploaded_by: userId,
            ocr_status: 'pending',
          })
          .select()
          .single();

        if (docError) {
          console.error('Database insert error:', docError);
          throw new Error(`Failed to save document record: ${docError.message}`);
        }

        await loadIncidentData();

        const processUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`;
        const { data: { session } } = await supabase.auth.getSession();

        fetch(processUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId: docData.id,
            fileType: file.type,
          }),
        })
          .then(async (response) => {
            if (response.ok) {
              await loadIncidentData();
            } else {
              console.error('Process document failed:', await response.text());
            }
          })
          .catch((err) => console.error('Process document error:', err));
      }
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const runFirstPassAnalysis = async () => {
    setProcessing(true);
    setError(null);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analysis-first-pass`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ incidentId: incident.id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Analysis API error response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `Analysis failed (${response.status})`);
        } catch {
          throw new Error(`Analysis failed (${response.status}): ${errorText.substring(0, 200)}`);
        }
      }

      const result = await response.json();
      console.log('Analysis completed successfully:', result);
      await loadIncidentData();
    } catch (err: any) {
      console.error('Error running analysis:', err);
      setError(err.message || 'Failed to run analysis');
    } finally {
      setProcessing(false);
    }
  };

  const getSeverityBadge = (severity: string): 'error' | 'warning' | 'info' => {
    const variants: Record<string, 'error' | 'warning' | 'info'> = {
      critical: 'error',
      serious: 'error',
      moderate: 'warning',
      minor: 'info',
    };
    return variants[severity] || 'info';
  };

  const getWorkflowStep = () => {
    if (rcaReport) return 5;
    if (secondPassAnalysis) return 4;
    if (humanReview?.review_status === 'approved') return 3;
    if (firstPassAnalysis) return 2;
    if (documents.length > 0) return 1;
    return 0;
  };

  const workflowSteps = [
    { id: 1, label: 'Evidence', description: 'Upload documents' },
    { id: 2, label: 'First Analysis', description: 'AI initial review' },
    { id: 3, label: 'Expert Review', description: 'Human verification' },
    { id: 4, label: 'Deep Analysis', description: 'AI root cause' },
    { id: 5, label: 'Report', description: 'Final RCA report' },
  ];

  const currentStep = getWorkflowStep();

  return (
    <div className="max-w-6xl mx-auto">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-6 transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Incidents
      </button>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card padding="none" className="overflow-hidden">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 px-6 py-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`
                    h-10 w-10 rounded-lg flex items-center justify-center
                    ${incident.severity === 'critical' || incident.severity === 'serious'
                      ? 'bg-red-500/20 text-red-400'
                      : incident.severity === 'moderate'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-sky-500/20 text-sky-400'
                    }
                  `}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-mono text-xs text-zinc-400">{incident.incident_number}</span>
                    <h1 className="text-xl font-semibold">{incident.title}</h1>
                  </div>
                </div>
                <Badge
                  variant={incident.status === 'closed' ? 'success' : 'default'}
                  className="bg-white/10 border-white/20 text-white"
                >
                  {incident.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">{incident.description}</p>
            </div>

            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-zinc-600">
                  <Badge variant={getSeverityBadge(incident.severity)}>
                    {incident.severity}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-600">
                  <MapPin className="h-4 w-4" />
                  {incident.location}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-600">
                  <Calendar className="h-4 w-4" />
                  {new Date(incident.incident_date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-600 capitalize">
                  <AlertTriangle className="h-4 w-4" />
                  {incident.incident_type.replace(/_/g, ' ')}
                </div>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="documents">
            <TabsList className="w-full justify-start bg-white border border-zinc-200 rounded-xl p-1">
              <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
              <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
              <TabsTrigger value="review">Expert Review</TabsTrigger>
              <TabsTrigger value="report">RCA Report</TabsTrigger>
            </TabsList>

            <TabsContent value="documents">
              <Card>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center transition-all
                    ${dragActive
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50'
                    }
                  `}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center">
                      <Upload className={`h-6 w-6 ${dragActive ? 'text-emerald-600' : 'text-zinc-400'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-700">
                        {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
                      </p>
                      <p className="text-sm text-zinc-500 mt-1">
                        PDF, Images up to 10MB
                      </p>
                    </div>
                  </div>
                </div>

                {documents.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100 group hover:bg-zinc-100 transition-colors"
                      >
                        <div className={`
                          h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0
                          ${doc.file_type.startsWith('image/') ? 'bg-sky-100 text-sky-600' : 'bg-red-100 text-red-600'}
                        `}>
                          {doc.file_type.startsWith('image/') ? (
                            <ImageIcon className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900 truncate">{doc.file_name}</p>
                          <p className="text-xs text-zinc-500">
                            {(doc.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {doc.ocr_status === 'completed' ? (
                            <Badge variant="success" size="sm">Processed</Badge>
                          ) : doc.ocr_status === 'processing' ? (
                            <Badge variant="info" size="sm" className="gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Processing
                            </Badge>
                          ) : doc.ocr_status === 'failed' ? (
                            <Badge variant="error" size="sm">Failed</Badge>
                          ) : (
                            <Badge variant="default" size="sm">Pending</Badge>
                          )}

                          <button className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Error</p>
                      <p>{error}</p>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="ml-auto text-red-400 hover:text-red-600"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {documents.length > 0 && !firstPassAnalysis && (
                  <Button
                    onClick={runFirstPassAnalysis}
                    loading={processing}
                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500"
                  >
                    <Sparkles className="h-4 w-4" />
                    Run AI Analysis
                  </Button>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="analysis">
              <Card>
                {firstPassAnalysis ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span className="font-medium text-emerald-900">Analysis Complete</span>
                      </div>
                      <Badge variant="success">
                        {(firstPassAnalysis.confidence_score * 100).toFixed(0)}% Confidence
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Identified Hazards
                      </h3>
                      <ul className="space-y-2">
                        {firstPassAnalysis.identified_hazards.map((hazard, i) => (
                          <li key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg text-sm text-red-800">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            {hazard}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Potential Causes
                      </h3>
                      <ul className="space-y-2">
                        {firstPassAnalysis.potential_causes.map((cause, i) => (
                          <li key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                            <ChevronRight className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            {cause}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-sky-500" />
                        Recommended Actions
                      </h3>
                      <ul className="space-y-2">
                        {firstPassAnalysis.recommended_actions.map((action, i) => (
                          <li key={i} className="flex items-start gap-3 p-3 bg-sky-50 rounded-lg text-sm text-sky-800">
                            <CheckCircle2 className="h-4 w-4 text-sky-600 mt-0.5 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-zinc-400" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 mb-1">No Analysis Yet</h3>
                    <p className="text-sm text-zinc-500">
                      Upload documents first, then run the AI analysis
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="review">
              <Card>
                {!humanReview && firstPassAnalysis ? (
                  <HumanReviewForm
                    incidentId={incident.id}
                    analysis={firstPassAnalysis}
                    userId={userId}
                    onComplete={loadIncidentData}
                  />
                ) : humanReview ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="font-medium text-emerald-900">Review Completed</p>
                        <p className="text-sm text-emerald-700 capitalize">
                          Status: {humanReview.review_status}
                        </p>
                      </div>
                    </div>
                    {humanReview.reviewer_notes && (
                      <div className="p-4 bg-zinc-50 rounded-xl">
                        <h4 className="font-medium text-zinc-900 mb-2">Reviewer Notes</h4>
                        <p className="text-sm text-zinc-700">{humanReview.reviewer_notes}</p>
                      </div>
                    )}
                    {humanReview.review_status === 'approved' && !secondPassAnalysis && (
                      <SecondPassTrigger
                        reviewId={humanReview.id}
                        onComplete={loadIncidentData}
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                      <Eye className="h-8 w-8 text-zinc-400" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 mb-1">Pending Analysis</h3>
                    <p className="text-sm text-zinc-500">
                      Complete the AI analysis first
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="report">
              <Card>
                <RCAReportViewer
                  incidentId={incident.id}
                  secondPassAnalysis={secondPassAnalysis}
                  existingReport={rcaReport}
                  userId={userId}
                  onReportGenerated={loadIncidentData}
                />
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Investigation Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflowSteps.map((step, index) => {
                  const isCompleted = currentStep >= step.id;
                  const isCurrent = currentStep === step.id - 1;

                  return (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="relative">
                        <div className={`
                          h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                          ${isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                              ? 'bg-zinc-900 text-white'
                              : 'bg-zinc-100 text-zinc-400'
                          }
                        `}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            step.id
                          )}
                        </div>
                        {index < workflowSteps.length - 1 && (
                          <div className={`
                            absolute left-1/2 top-8 w-0.5 h-6 -translate-x-1/2
                            ${isCompleted ? 'bg-emerald-500' : 'bg-zinc-200'}
                          `} />
                        )}
                      </div>
                      <div className="pt-1">
                        <p className={`text-sm font-medium ${isCompleted || isCurrent ? 'text-zinc-900' : 'text-zinc-400'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-zinc-500">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!firstPassAnalysis && documents.length > 0 && (
                <Button
                  onClick={runFirstPassAnalysis}
                  loading={processing}
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                  size="sm"
                >
                  <Sparkles className="h-4 w-4" />
                  Run Analysis
                </Button>
              )}
              <Button variant="outline" className="w-full" size="sm">
                <Download className="h-4 w-4" />
                Export Data
              </Button>
              <Button variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" size="sm">
                <Trash2 className="h-4 w-4" />
                Delete Incident
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
