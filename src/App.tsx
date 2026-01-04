import { useState, useEffect } from 'react';
import {
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { Auth } from './components/Auth';
import { IncidentList } from './components/IncidentList';
import { IncidentForm } from './components/IncidentForm';
import { IncidentDetail } from './components/IncidentDetail';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Card, CardContent } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { supabase, type Incident } from './lib/supabase';

function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [activeView, setActiveView] = useState('incidents');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [stats, setStats] = useState({
    active: 0,
    pending: 0,
    completed: 0,
    total: 0
  });

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, refreshKey]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('status');

      if (error) throw error;

      const incidents = data || [];
      setIncidentCount(incidents.length);
      setStats({
        active: incidents.filter(i => ['under_investigation', 'reported'].includes(i.status)).length,
        pending: incidents.filter(i => i.status === 'pending_review').length,
        completed: incidents.filter(i => i.status === 'closed').length,
        total: incidents.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onSignIn={signIn} onSignUp={signUp} />;
  }

  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncident(incident);
  };

  const handleBack = () => {
    setSelectedIncident(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleFormSuccess = () => {
    setShowCreateForm(false);
    setRefreshKey((prev) => prev + 1);
  };

  const getHeaderInfo = () => {
    if (selectedIncident) {
      return {
        title: 'Incident Details',
        subtitle: selectedIncident.incident_number
      };
    }

    switch (activeView) {
      case 'dashboard':
        return { title: 'Dashboard', subtitle: 'Overview of all incidents' };
      case 'incidents':
        return { title: 'Incidents', subtitle: `${incidentCount} total incidents` };
      case 'reports':
        return { title: 'RCA Reports', subtitle: 'Generated investigation reports' };
      default:
        return { title: 'Dashboard', subtitle: '' };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="min-h-screen bg-zinc-100">
      <Sidebar
        user={user}
        onSignOut={signOut}
        onNewIncident={() => setShowCreateForm(true)}
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          setSelectedIncident(null);
        }}
        incidentCount={incidentCount}
      />

      <div className="pl-64">
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          actions={
            activeView === 'incidents' && !selectedIncident && (
              <Button onClick={() => setShowCreateForm(true)} size="sm">
                Report Incident
              </Button>
            )
          }
        />

        <main className="p-6">
          {selectedIncident ? (
            <IncidentDetail
              incident={selectedIncident}
              onBack={handleBack}
              userId={user.id}
            />
          ) : activeView === 'dashboard' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-sky-500 to-sky-600 text-white border-0">
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sky-100 text-sm font-medium">Active</p>
                        <p className="text-3xl font-bold mt-1">{stats.active}</p>
                        <p className="text-sky-200 text-xs mt-1">Under Investigation</p>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <Activity className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-amber-100 text-sm font-medium">Pending</p>
                        <p className="text-3xl font-bold mt-1">{stats.pending}</p>
                        <p className="text-amber-200 text-xs mt-1">Awaiting Review</p>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <Clock className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm font-medium">Completed</p>
                        <p className="text-3xl font-bold mt-1">{stats.completed}</p>
                        <p className="text-emerald-200 text-xs mt-1">Investigations Closed</p>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-zinc-700 to-zinc-800 text-white border-0">
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-zinc-300 text-sm font-medium">Total</p>
                        <p className="text-3xl font-bold mt-1">{stats.total}</p>
                        <p className="text-zinc-400 text-xs mt-1">All Time</p>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <div className="p-4 border-b border-zinc-100">
                    <h3 className="font-semibold text-zinc-900">Recent Incidents</h3>
                  </div>
                  <div className="p-4">
                    <IncidentList key={refreshKey} onSelectIncident={handleSelectIncident} />
                  </div>
                </Card>

                <Card>
                  <div className="p-4 border-b border-zinc-100">
                    <h3 className="font-semibold text-zinc-900">AI Investigation Pipeline</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 text-sm">Evidence Upload</p>
                        <p className="text-xs text-zinc-500">Documents processed with OCR</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 text-sm">First-Pass Analysis</p>
                        <p className="text-xs text-zinc-500">AI identifies hazards and causes</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 text-sm">Expert Review</p>
                        <p className="text-xs text-zinc-500">Human verification and input</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 flex-shrink-0">
                        4
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 text-sm">RCA Report</p>
                        <p className="text-xs text-zinc-500">Professional documentation</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : activeView === 'incidents' ? (
            <IncidentList key={refreshKey} onSelectIncident={handleSelectIncident} />
          ) : activeView === 'reports' ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="font-semibold text-zinc-900 mb-1">No Reports Yet</h3>
                <p className="text-sm text-zinc-500 text-center max-w-sm">
                  Complete incident investigations to generate RCA reports. Reports will appear here once generated.
                </p>
              </div>
            </Card>
          ) : null}
        </main>
      </div>

      {showCreateForm && (
        <IncidentForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleFormSuccess}
          userId={user.id}
        />
      )}
    </div>
  );
}

export default App;
