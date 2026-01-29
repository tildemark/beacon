'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, FormEvent } from 'react';

export default function EmployeeDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [logs, setLogs] = useState<any[]>([]);
    const [invalidRequests, setInvalidRequests] = useState<any[]>([]);
    const [manualRequests, setManualRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'logs' | 'invalid' | 'manual'>('logs');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Invalid log form
    const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
    const [invalidReason, setInvalidReason] = useState('');

    // Manual log form
    const [manualTimestamp, setManualTimestamp] = useState('');
    const [manualNodeId, setManualNodeId] = useState('');
    const [manualPunchType, setManualPunchType] = useState('0');
    const [manualReason, setManualReason] = useState('');
    const [manualProof, setManualProof] = useState<File | null>(null);
    const [nodes, setNodes] = useState<any[]>([]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchData();
        }
    }, [status, router]);

    const fetchData = async () => {
        try {
            const [logsRes, invalidRes, manualRes, nodesRes] = await Promise.all([
                fetch('/api/employee/logs?limit=50'),
                fetch('/api/employee/requests/invalid'),
                fetch('/api/employee/requests/manual'),
                fetch('/api/beacon/sync').catch(() => ({ json: () => ({ nodes: [] }) })), // Fallback if endpoint doesn't exist
            ]);

            const logsData = await logsRes.json();
            const invalidData = await invalidRes.json();
            const manualData = await manualRes.json();

            setLogs(logsData.logs || []);
            setInvalidRequests(invalidData.requests || []);
            setManualRequests(manualData.requests || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleInvalidLogSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedLogId) return;

        try {
            const res = await fetch('/api/employee/requests/invalid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ log_id: selectedLogId, reason: invalidReason }),
            });

            if (res.ok) {
                showToast('Invalid log request submitted successfully', 'success');
                setSelectedLogId(null);
                setInvalidReason('');
                fetchData();
            } else {
                showToast('Failed to submit request', 'error');
            }
        } catch (error) {
            showToast('An error occurred', 'error');
        }
    };

    const handleManualLogSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('timestamp', manualTimestamp);
        formData.append('node_id', manualNodeId);
        formData.append('punch_type', manualPunchType);
        formData.append('reason', manualReason);
        if (manualProof) formData.append('proof', manualProof);

        try {
            const res = await fetch('/api/employee/requests/manual', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                showToast('Manual log request submitted successfully', 'success');
                setManualTimestamp('');
                setManualNodeId('');
                setManualPunchType('0');
                setManualReason('');
                setManualProof(null);
                fetchData();
            } else {
                showToast('Failed to submit request', 'error');
            }
        } catch (error) {
            showToast('An error occurred', 'error');
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <p>Loading...</p>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '2rem',
                    right: '2rem',
                    padding: '1rem 1.5rem',
                    background: toast.type === 'success' ? '#28a745' : '#dc3545',
                    color: 'white',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    animation: 'slideIn 0.3s ease-out',
                }}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <header style={{
                background: 'white',
                borderBottom: '1px solid #e0e0e0',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>🚢 Project BEACON</h1>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Welcome, {session.user.name}</p>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    style={{
                        padding: '0.5rem 1rem',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                    }}
                >
                    Sign Out
                </button>
            </header>

            {/* Main Content */}
            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setActiveTab('logs')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'logs' ? '#667eea' : 'white',
                            color: activeTab === 'logs' ? 'white' : '#333',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500',
                        }}
                    >
                        My Logs ({logs.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('invalid')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'invalid' ? '#667eea' : 'white',
                            color: activeTab === 'invalid' ? 'white' : '#333',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500',
                        }}
                    >
                        Report Invalid Log
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'manual' ? '#667eea' : 'white',
                            color: activeTab === 'manual' ? 'white' : '#333',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500',
                        }}
                    >
                        Submit Manual Log
                    </button>
                </div>

                {/* Attendance Logs Tab */}
                {activeTab === 'logs' && (
                    <div style={{ background: 'white', borderRadius: '8px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                            Attendance Logs
                        </h2>

                        {logs.length === 0 ? (
                            <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                                No attendance logs found
                            </p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Date & Time</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Node</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Type</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log) => (
                                            <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </td>
                                                <td style={{ padding: '1rem' }}>{log.node?.name || 'Unknown'}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        background: '#e3f2fd',
                                                        color: '#1976d2',
                                                        borderRadius: '12px',
                                                        fontSize: '0.85rem',
                                                    }}>
                                                        {log.node?.type || 'N/A'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLogId(log.id);
                                                            setActiveTab('invalid');
                                                        }}
                                                        style={{
                                                            padding: '0.25rem 0.75rem',
                                                            background: '#fff3cd',
                                                            color: '#856404',
                                                            border: '1px solid #ffeaa7',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.85rem',
                                                        }}
                                                    >
                                                        Report Issue
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Invalid Log Request Tab */}
                {activeTab === 'invalid' && (
                    <div style={{ background: 'white', borderRadius: '8px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                            Report Invalid Log
                        </h2>

                        <form onSubmit={handleInvalidLogSubmit} style={{ marginBottom: '2rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Select Log
                                </label>
                                <select
                                    value={selectedLogId || ''}
                                    onChange={(e) => setSelectedLogId(Number(e.target.value))}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                    }}
                                >
                                    <option value="">Choose a log to report...</option>
                                    {logs.map((log) => (
                                        <option key={log.id} value={log.id}>
                                            {new Date(log.timestamp).toLocaleString()} - {log.node?.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Reason (min 10 characters)
                                </label>
                                <textarea
                                    value={invalidReason}
                                    onChange={(e) => setInvalidReason(e.target.value)}
                                    required
                                    minLength={10}
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                        fontFamily: 'inherit',
                                    }}
                                    placeholder="Explain why this log is incorrect..."
                                />
                            </div>

                            <button
                                type="submit"
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: '#667eea',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                }}
                            >
                                Submit Request
                            </button>
                        </form>

                        <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
                            My Invalid Log Requests
                        </h3>
                        {invalidRequests.length === 0 ? (
                            <p style={{ color: '#666' }}>No requests yet</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {invalidRequests.map((req) => (
                                    <div key={req.id} style={{ border: '1px solid #e0e0e0', borderRadius: '6px', padding: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <strong>{new Date(req.log.timestamp).toLocaleString()}</strong>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                background: req.status === 'PENDING' ? '#fff3cd' : req.status === 'APPROVED' ? '#d4edda' : '#f8d7da',
                                                color: req.status === 'PENDING' ? '#856404' : req.status === 'APPROVED' ? '#155724' : '#721c24',
                                                borderRadius: '12px',
                                                fontSize: '0.85rem',
                                            }}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <p style={{ color: '#666', fontSize: '0.9rem' }}>{req.reason}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Log Request Tab */}
                {activeTab === 'manual' && (
                    <div style={{ background: 'white', borderRadius: '8px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                            Submit Manual Log
                        </h2>

                        <form onSubmit={handleManualLogSubmit} style={{ marginBottom: '2rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={manualTimestamp}
                                    onChange={(e) => setManualTimestamp(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Node ID (ask IT if unsure)
                                </label>
                                <input
                                    type="text"
                                    value={manualNodeId}
                                    onChange={(e) => setManualNodeId(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                    }}
                                    placeholder="Enter node ID"
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Punch Type
                                </label>
                                <select
                                    value={manualPunchType}
                                    onChange={(e) => setManualPunchType(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                    }}
                                >
                                    <option value="0">Check In</option>
                                    <option value="1">Check Out</option>
                                    <option value="2">Break Start</option>
                                    <option value="3">Break End</option>
                                    <option value="4">Overtime In</option>
                                    <option value="5">Overtime Out</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Reason (min 10 characters)
                                </label>
                                <textarea
                                    value={manualReason}
                                    onChange={(e) => setManualReason(e.target.value)}
                                    required
                                    minLength={10}
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                        fontFamily: 'inherit',
                                    }}
                                    placeholder="Explain why you need this manual entry..."
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Proof (optional - image or PDF)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => setManualProof(e.target.files?.[0] || null)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: '#667eea',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                }}
                            >
                                Submit Request
                            </button>
                        </form>

                        <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
                            My Manual Log Requests
                        </h3>
                        {manualRequests.length === 0 ? (
                            <p style={{ color: '#666' }}>No requests yet</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {manualRequests.map((req) => (
                                    <div key={req.id} style={{ border: '1px solid #e0e0e0', borderRadius: '6px', padding: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <strong>{new Date(req.timestamp).toLocaleString()}</strong>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                background: req.status === 'PENDING' ? '#fff3cd' : req.status === 'APPROVED' ? '#d4edda' : '#f8d7da',
                                                color: req.status === 'PENDING' ? '#856404' : req.status === 'APPROVED' ? '#155724' : '#721c24',
                                                borderRadius: '12px',
                                                fontSize: '0.85rem',
                                            }}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{req.reason}</p>
                                        <p style={{ color: '#999', fontSize: '0.85rem' }}>
                                            Node: {req.node.name} | Type: {req.punch_type}
                                            {req.proof_url && <> | <a href={req.proof_url} target="_blank" style={{ color: '#667eea' }}>View Proof</a></>}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
