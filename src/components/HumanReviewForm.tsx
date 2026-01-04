import { useState } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase, type AIAnalysisFirstPass } from '../lib/supabase';

interface HumanReviewFormProps {
  incidentId: string;
  analysis: AIAnalysisFirstPass;
  userId: string;
  onComplete: () => void;
}

export function HumanReviewForm({ incidentId, analysis, userId, onComplete }: HumanReviewFormProps) {
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [approvedHazards, setApprovedHazards] = useState<string[]>(analysis.identified_hazards);
  const [approvedCauses, setApprovedCauses] = useState<string[]>(analysis.potential_causes);
  const [additionalActions, setAdditionalActions] = useState<string[]>([]);
  const [newAction, setNewAction] = useState('');

  const handleSubmit = async (reviewStatus: 'approved' | 'rejected' | 'needs_revision') => {
    setLoading(true);
    try {
      const { data: review, error: reviewError } = await supabase
        .from('human_reviews')
        .insert({
          incident_id: incidentId,
          analysis_id: analysis.id,
          reviewer_id: userId,
          review_status: reviewStatus,
          reviewer_notes: reviewNotes,
          approved_hazards: approvedHazards,
          approved_causes: approvedCauses,
          additional_actions: additionalActions,
          reviewed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      await supabase.from('audit_logs').insert({
        incident_id: incidentId,
        action_type: 'HUMAN_REVIEW_COMPLETED',
        action_details: { review_id: review.id, status: reviewStatus },
        entity_type: 'human_review',
        entity_id: review.id,
        performed_by: userId,
      });

      if (reviewStatus === 'approved') {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analysis-second-pass`;
        const { data: { session } } = await supabase.auth.getSession();

        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reviewId: review.id }),
        }).catch(console.error);
      }

      onComplete();
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHazard = (hazard: string) => {
    setApprovedHazards((prev) =>
      prev.includes(hazard) ? prev.filter((h) => h !== hazard) : [...prev, hazard]
    );
  };

  const toggleCause = (cause: string) => {
    setApprovedCauses((prev) =>
      prev.includes(cause) ? prev.filter((c) => c !== cause) : [...prev, cause]
    );
  };

  const addAction = () => {
    if (newAction.trim()) {
      setAdditionalActions([...additionalActions, newAction.trim()]);
      setNewAction('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
        <h3 className="font-semibold text-amber-900 mb-2">Human Expert Review Required</h3>
        <p className="text-sm text-amber-800">
          Review the AI analysis findings and approve, modify, or reject them before proceeding to the second-pass RCA.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Review Identified Hazards</h3>
        <p className="text-sm text-slate-600 mb-3">Select hazards you approve:</p>
        <div className="space-y-2">
          {analysis.identified_hazards.map((hazard, i) => (
            <label
              key={i}
              className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <input
                type="checkbox"
                checked={approvedHazards.includes(hazard)}
                onChange={() => toggleHazard(hazard)}
                className="mt-1"
              />
              <span className="text-slate-700">{hazard}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Review Potential Causes</h3>
        <p className="text-sm text-slate-600 mb-3">Select causes you approve:</p>
        <div className="space-y-2">
          {analysis.potential_causes.map((cause, i) => (
            <label
              key={i}
              className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <input
                type="checkbox"
                checked={approvedCauses.includes(cause)}
                onChange={() => toggleCause(cause)}
                className="mt-1"
              />
              <span className="text-slate-700">{cause}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Additional Recommended Actions</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newAction}
            onChange={(e) => setNewAction(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addAction()}
            placeholder="Add additional action..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addAction}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
        </div>
        {additionalActions.length > 0 && (
          <ul className="space-y-2">
            {additionalActions.map((action, i) => (
              <li key={i} className="flex items-center gap-2 text-slate-700 bg-blue-50 p-2 rounded">
                <span>•</span>
                <span>{action}</span>
                <button
                  onClick={() =>
                    setAdditionalActions(additionalActions.filter((_, idx) => idx !== i))
                  }
                  className="ml-auto text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Review Notes</h3>
        <textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          rows={4}
          placeholder="Add your review comments, corrections, or additional context..."
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit('approved')}
          disabled={loading || approvedHazards.length === 0}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Approve & Continue to RCA</span>
            </>
          )}
        </button>
        <button
          onClick={() => handleSubmit('needs_revision')}
          disabled={loading}
          className="px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          Needs Revision
        </button>
        <button
          onClick={() => handleSubmit('rejected')}
          disabled={loading}
          className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <XCircle className="w-5 h-5" />
          <span>Reject</span>
        </button>
      </div>
    </div>
  );
}
