import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';

interface IncidentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export function IncidentForm({ onClose, onSuccess, userId }: IncidentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'moderate',
    incident_type: 'near_miss',
    incident_date: new Date().toISOString().split('T')[0],
    location: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('incidents').insert({
        ...formData,
        incident_date: new Date(formData.incident_date).toISOString(),
        reported_by: userId,
        assigned_investigator: userId,
        status: 'reported',
      });

      if (insertError) throw insertError;

      await supabase.from('audit_logs').insert({
        action_type: 'INCIDENT_CREATED',
        action_details: { title: formData.title, severity: formData.severity },
        entity_type: 'incident',
        performed_by: userId,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  };

  const severityOptions = [
    { value: 'minor', label: 'Minor' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'serious', label: 'Serious' },
    { value: 'critical', label: 'Critical' },
  ];

  const typeOptions = [
    { value: 'injury', label: 'Injury' },
    { value: 'near_miss', label: 'Near Miss' },
    { value: 'property_damage', label: 'Property Damage' },
    { value: 'environmental', label: 'Environmental' },
    { value: 'process_safety', label: 'Process Safety' },
  ];

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <DialogTitle>Report New Incident</DialogTitle>
            <DialogDescription>
              Provide details about the safety incident for investigation
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-5">
          <Input
            label="Incident Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="Brief description of the incident"
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows={4}
            placeholder="Detailed description of what happened, including circumstances and immediate actions taken..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Severity"
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              options={severityOptions}
            />

            <Select
              label="Incident Type"
              value={formData.incident_type}
              onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
              options={typeOptions}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Incident Date"
              type="date"
              value={formData.incident_date}
              onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
              required
            />

            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
              placeholder="Building, area, or site"
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </DialogContent>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Incident
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
