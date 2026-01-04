import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  MoreHorizontal,
  Circle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { supabase, type Incident } from '../lib/supabase';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';

interface IncidentListProps {
  onSelectIncident: (incident: Incident) => void;
}

export function IncidentList({ onSelectIncident }: IncidentListProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadIncidents();
  }, [filterStatus]);

  const loadIncidents = async () => {
    try {
      let query = supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string): 'error' | 'warning' | 'info' | 'success' => {
    const variants: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
      critical: 'error',
      serious: 'error',
      moderate: 'warning',
      minor: 'info',
    };
    return variants[severity] || 'info';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, typeof Circle> = {
      draft: Circle,
      reported: AlertCircle,
      under_investigation: Clock,
      pending_review: AlertCircle,
      closed: CheckCircle2,
    };
    return icons[status] || Circle;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'text-zinc-400',
      reported: 'text-emerald-500',
      under_investigation: 'text-sky-500',
      pending_review: 'text-amber-500',
      closed: 'text-zinc-500',
    };
    return colors[status] || 'text-zinc-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredIncidents = incidents;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded-xl p-4 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-zinc-100 rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-zinc-100 rounded w-1/3" />
                <div className="h-3 bg-zinc-100 rounded w-2/3" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-zinc-100 rounded" />
                  <div className="h-5 w-20 bg-zinc-100 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <Card padding="none">
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8" />}
          title="No incidents yet"
          description="Create your first incident to start tracking and investigating safety issues."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <SortAsc className="h-3.5 w-3.5" />
            Sort
          </Button>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 px-3 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="reported">Reported</option>
            <option value="under_investigation">Under Investigation</option>
            <option value="pending_review">Pending Review</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-2'}>
        {filteredIncidents.map((incident) => {
          const StatusIcon = getStatusIcon(incident.status);

          return (
            <div
              key={incident.id}
              onClick={() => onSelectIncident(incident)}
              className={`
                group bg-white border border-zinc-200 rounded-xl p-4
                hover:border-zinc-300 hover:shadow-md
                transition-all duration-200 cursor-pointer
                ${viewMode === 'list' ? 'flex items-start gap-4' : ''}
              `}
            >
              <div className={`
                h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${incident.severity === 'critical' || incident.severity === 'serious'
                  ? 'bg-red-50 text-red-600'
                  : incident.severity === 'moderate'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-sky-50 text-sky-600'
                }
              `}>
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-zinc-500">
                        {incident.incident_number}
                      </span>
                    </div>
                    <h3 className="font-medium text-zinc-900 truncate group-hover:text-zinc-700">
                      {incident.title}
                    </h3>
                    <p className="text-sm text-zinc-500 line-clamp-2 mt-0.5">
                      {incident.description}
                    </p>
                  </div>

                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                  </button>
                </div>

                <div className="flex items-center flex-wrap gap-3 mt-3">
                  <Badge variant={getSeverityBadge(incident.severity)}>
                    {incident.severity}
                  </Badge>

                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <StatusIcon className={`h-3.5 w-3.5 ${getStatusColor(incident.status)}`} />
                    <span className="capitalize">{incident.status.replace(/_/g, ' ')}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {incident.location}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(incident.incident_date)}
                  </div>
                </div>
              </div>

              <ChevronRight className="h-5 w-5 text-zinc-300 group-hover:text-zinc-400 transition-colors flex-shrink-0 self-center opacity-0 group-hover:opacity-100" />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
        <p className="text-sm text-zinc-500">
          Showing {filteredIncidents.length} of {incidents.length} incidents
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
