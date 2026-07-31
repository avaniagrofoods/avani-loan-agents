'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Phone, 
  MessageSquare, 
  Database,
  ArrowLeft,
  ExternalLink,
  Play,
  Share2,
  FileText,
  FileSpreadsheet,
  HelpCircle,
  Mic,
  PhoneForwarded,
  Link as LinkIcon,
  Settings,
  Workflow
} from 'lucide-react';

interface Lead {
  id: number;
  name: string;
  email?: string;
  phone: string;
  loan_type: string;
  loan_amount: number;
  monthly_income: number;
  employment_type: string;
  eligibility_status: 'Qualified' | 'Needs Review' | 'Disqualified';
  eligibility_reason: string;
  source: 'Web Chat' | 'Voice Call' | 'WhatsApp';
  call_sid?: string;
  transcript?: string;
  recording_url?: string;
  hubspot_synced: number;
  sheets_synced: number;
  make_synced: number;
  pabbly_synced: number;
  pickyassist_synced: number;
  employment_history?: string;
  created_at: string;
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [mockingCall, setMockingCall] = useState(false);

  // Fetch leads
  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      const json = await res.json();
      if (json.success) {
        setLeads(json.data);
        // If a lead is currently selected, refresh its reference
        if (selectedLead) {
          const updated = json.data.find((l: Lead) => l.id === selectedLead.id);
          if (updated) setSelectedLead(updated);
        }
      }
    } catch (e) {
      console.error("Error fetching leads:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Manual integration retry
  const handleRetrySync = async (leadId: number) => {
    setRetrying(leadId);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      });
      const data = await res.json();
      if (data.success) {
        alert("Sync successfully triggered for all channels!");
        await fetchLeads();
      } else {
        alert("Sync failed: " + data.error);
      }
    } catch (e: any) {
      alert("Network error: " + e.message);
    } finally {
      setRetrying(null);
    }
  };

  // Trigger Mock Vapi Webhook Call
  const handleTriggerMockCall = async () => {
    setMockingCall(true);
    const mockPayload = {
      message: {
        type: "end-of-call-report",
        call: {
          id: `vapi-mock-${Math.floor(Math.random() * 100000)}`,
          transcript: "Hi, this is Rajesh Kulkarni. I am a Chartered Accountant practicing in Latur. I need a Home Loan of 45 Lakhs. My monthly income is 1.2 Lakhs and I am self-employed. My email is rajesh.ca@example.com.",
          recordingUrl: "https://api.vapi.ai/recordings/sample-ca-home-loan.wav",
          summary: "Customer Rajesh Kulkarni is a self-employed CA seeking a Home Loan of 45 Lakhs with monthly income of 1.2 Lakhs.",
          customer: {
            number: "+919876543210"
          }
        },
        analysis: {
          summary: "Rajesh Kulkarni qualifies for a home loan of 45 Lakhs based on a monthly income of 1.2 Lakhs.",
          structuredData: {
            name: "Rajesh Kulkarni",
            email: "rajesh.ca@example.com",
            loanType: "Home Loan",
            loanAmount: 4500000,
            monthlyIncome: 120000,
            employmentType: "Self-Employed Professional",
            employmentHistory: "Self-Employed CA Practice (10 years)"
          }
        }
      }
    };

    try {
      const res = await fetch('/api/vapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayload)
      });
      const data = await res.json();
      if (data.success) {
        alert("Mock Voice Call Webhook received!\n\n1. Qualifed lead was created in DB.\n2. HubSpot contact form submission, Google Sheets logging, Make, Pabbly Connect, and Pickyassist / Twilio notifications were all triggered.");
        await fetchLeads();
      } else {
        alert("Webhook processing error: " + data.error);
      }
    } catch (e: any) {
      alert("Error sending webhook: " + e.message);
    } finally {
      setMockingCall(false);
    }
  };

  // Compute Stats
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(l => l.eligibility_status === 'Qualified').length;
  const reviewLeads = leads.filter(l => l.eligibility_status === 'Needs Review').length;
  const disqualifiedLeads = leads.filter(l => l.eligibility_status === 'Disqualified').length;
  
  const totalSyncs = leads.length * 5; // 5 channels tracked: hubspot, sheets, make, pabbly, pickyassist
  const successfulSyncs = leads.reduce((acc, l) => 
    acc + l.hubspot_synced + l.sheets_synced + l.make_synced + l.pabbly_synced + l.pickyassist_synced, 0
  );
  const syncRate = totalSyncs > 0 ? Math.round((successfulSyncs / totalSyncs) * 100) : 100;

  return (
      <main className="dashboard-main h-full">
        
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 style={{ fontSize: '2rem', color: 'var(--primary-color)', marginBottom: '0.25rem' }}>Leads Control Center</h1>
            <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>Monitor and orchestrate client acquisitions from Vapi Call agents and Web Chat.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={handleTriggerMockCall} 
              disabled={mockingCall}
              className="btn btn-accent"
              style={{ fontSize: '0.85rem' }}
            >
              <Phone size={16} /> {mockingCall ? 'Triggering...' : 'Simulate Voice Call Webhook'}
            </button>
            <button 
              onClick={fetchLeads} 
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card">
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>TOTAL ACQUISITIONS</div>
              <div className="stat-value">{totalLeads}</div>
            </div>
            <div style={{ color: 'var(--primary-color)', background: 'var(--primary-extralight)', padding: '0.75rem', borderRadius: '50%' }}>
              <Users size={24} />
            </div>
          </div>

          <div className="stat-card">
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase' }}>QUALIFIED (CRM READY)</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{qualifiedLeads}</div>
            </div>
            <div style={{ color: 'var(--success)', background: 'var(--success-bg)', padding: '0.75rem', borderRadius: '50%' }}>
              <CheckCircle size={24} />
            </div>
          </div>

          <div className="stat-card">
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600, textTransform: 'uppercase' }}>NEEDS REVIEW</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>{reviewLeads}</div>
            </div>
            <div style={{ color: 'var(--warning)', background: 'var(--warning-bg)', padding: '0.75rem', borderRadius: '50%' }}>
              <HelpCircle size={24} />
            </div>
          </div>

          <div className="stat-card">
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>INTEGRATION HEALTH</div>
              <div className="stat-value">{syncRate}%</div>
            </div>
            <div style={{ color: 'var(--accent-color)', background: 'var(--accent-light)', padding: '0.75rem', borderRadius: '50%' }}>
              <Share2 size={24} />
            </div>
          </div>
        </section>

        {/* Workspace Table and Detail Panel split */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedLead ? '1fr 400px' : '1fr', gap: '2rem', transition: 'all 0.3s' }}>
          
          {/* Table Container */}
          <div className="table-container">
            {loading ? (
              <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexDirection: 'column' }}>
                <div className="spinner"></div>
                <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Loading Leads Database...</span>
              </div>
            ) : leads.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center' }}>
                <Users size={48} style={{ color: 'var(--text-light)', marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem' }}>No Leads Captured Yet</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Interact with the AI Advisor Chat or trigger a mock voice call to capture leads.</p>
                <Link href="/chat" className="btn btn-primary">Start AI Chat</Link>
              </div>
            ) : (
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>Lead Details</th>
                    <th>Loan Request</th>
                    <th>Financial Profile</th>
                    <th>Source</th>
                    <th>Eligibility</th>
                    <th>Integrations Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)}
                      style={{ 
                        cursor: 'pointer',
                        background: selectedLead?.id === lead.id ? 'var(--primary-extralight)' : 'inherit',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{lead.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>{lead.phone}</div>
                        {lead.email && <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>{lead.email}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>₹{lead.loan_amount.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>{lead.loan_type}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>₹{lead.monthly_income.toLocaleString('en-IN')}/mo</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>{lead.employment_type}</div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 500, color: 'var(--primary-color)' }}>
                          {lead.source === 'Voice Call' ? <Phone size={12} /> : <MessageSquare size={12} />}
                          {lead.source}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          lead.eligibility_status === 'Qualified' ? 'badge-qualified' :
                          lead.eligibility_status === 'Needs Review' ? 'badge-review' : 'badge-disqualified'
                        }`}>
                          {lead.eligibility_status}
                        </span>
                      </td>
                      <td>
                        <div className="sync-grid">
                          <span className={`sync-badge ${lead.hubspot_synced ? 'success' : 'fail'}`}>HubSpot</span>
                          <span className={`sync-badge ${lead.sheets_synced ? 'success' : 'fail'}`}>Sheets</span>
                          <span className={`sync-badge ${lead.make_synced ? 'success' : 'fail'}`}>Make</span>
                          <span className={`sync-badge ${lead.pabbly_synced ? 'success' : 'fail'}`}>Pabbly</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Details Panel */}
          {selectedLead && (
            <div className="card-glass" style={{ background: 'var(--white)', padding: '2rem', alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '80vh', overflowY: 'auto', border: '1.5px solid var(--primary-color)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: 700, textTransform: 'uppercase' }}>
                    LEAD PROFILE
                  </span>
                  <h3 style={{ fontSize: '1.3rem', color: 'var(--primary-color)', marginTop: '0.2rem' }}>{selectedLead.name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="btn btn-secondary" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', minWidth: 'auto' }}
                >
                  Close
                </button>
              </div>

              {/* Contact Info */}
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <div><strong>Phone:</strong> {selectedLead.phone}</div>
                {selectedLead.email && <div><strong>Email:</strong> {selectedLead.email}</div>}
                {selectedLead.employment_history && <div><strong>Employment History:</strong> {selectedLead.employment_history}</div>}
                <div><strong>Captured:</strong> {new Date(selectedLead.created_at).toLocaleString()}</div>
              </div>

              {/* Assessment details */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Eligibility Assessment</h4>
                <div className={`badge ${
                  selectedLead.eligibility_status === 'Qualified' ? 'badge-qualified' :
                  selectedLead.eligibility_status === 'Needs Review' ? 'badge-review' : 'badge-disqualified'
                }`} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', width: '100%', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  {selectedLead.eligibility_status}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-dark)', lineHeight: 1.4, background: '#f8fafc', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-color)' }}>
                  {selectedLead.eligibility_reason}
                </p>
              </div>

              {/* Audio Playback Section if Voice Call */}
              {selectedLead.source === 'Voice Call' && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Call Recording</h4>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--primary-extralight)', padding: '0.85rem 1.25rem', borderRadius: '8px' }}>
                    <div style={{ background: 'var(--primary-color)', color: 'var(--white)', padding: '0.5rem', borderRadius: '50%' }}>
                      <Play size={14} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-color)' }}>Recording.wav</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-light)' }}>SID: {selectedLead.call_sid?.substring(0, 12)}...</div>
                    </div>
                    {selectedLead.recording_url ? (
                      <a href={selectedLead.recording_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.7rem', minWidth: 'auto' }}>
                        Listen
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Mock Call</span>
                    )}
                  </div>
                </div>
              )}

              {/* Integrations Status */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Integration Sync Channels</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className={`sync-badge ${selectedLead.hubspot_synced ? 'success' : 'fail'}`} style={{ justifyContent: 'center', padding: '0.5rem' }}>
                    HubSpot CRM
                  </div>
                  <div className={`sync-badge ${selectedLead.sheets_synced ? 'success' : 'fail'}`} style={{ justifyContent: 'center', padding: '0.5rem' }}>
                    Google Sheets
                  </div>
                  <div className={`sync-badge ${selectedLead.make_synced ? 'success' : 'fail'}`} style={{ justifyContent: 'center', padding: '0.5rem' }}>
                    Make Webhook
                  </div>
                  <div className={`sync-badge ${selectedLead.pabbly_synced ? 'success' : 'fail'}`} style={{ justifyContent: 'center', padding: '0.5rem' }}>
                    Pabbly Connect
                  </div>
                  <div className={`sync-badge ${selectedLead.pickyassist_synced ? 'success' : 'fail'}`} style={{ justifyContent: 'center', padding: '0.5rem', gridColumn: 'span 2' }}>
                    WhatsApp Notifications
                  </div>
                </div>

                <button 
                  onClick={() => handleRetrySync(selectedLead.id)}
                  disabled={retrying === selectedLead.id}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1.25rem', fontSize: '0.8rem' }}
                >
                  <RefreshCw size={14} className={retrying === selectedLead.id ? 'animate-spin' : ''} /> 
                  {retrying === selectedLead.id ? 'Retransmitting Lead...' : 'Resync/Retry Integrations'}
                </button>
              </div>

              {/* Call Transcript / Text Query history */}
              {selectedLead.transcript && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    {selectedLead.source === 'Voice Call' ? 'Call Transcript' : 'Chat Transcript'}
                  </h4>
                  <div style={{ 
                    maxHeight: '180px', 
                    overflowY: 'auto', 
                    background: '#f8fafc', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    fontSize: '0.8rem', 
                    color: 'var(--text-dark)', 
                    lineHeight: 1.5,
                    border: '1px solid var(--border-color)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedLead.transcript}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </main>
  );
}
