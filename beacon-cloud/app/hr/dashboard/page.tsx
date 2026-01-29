'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, FormEvent } from 'react';
import EnrollmentModal from '@/components/EnrollmentModal';
import DeviceList from '@/components/DeviceList';

export default function HRDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [requests, setRequests] = useState<any>({ invalidRequests: [], manualRequests: [] });
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'requests' | 'employees' | 'add' | 'devices'>('requests');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Add employee form
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('EMPLOYEE');

    // Devices
    const [devices, setDevices] = useState<any[]>([]);

    // Enrollment modal
    const [enrollmentModal, setEnrollmentModal] = useState<{ id: string; name: string; email: string } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            if (session.user.role !== 'HR' && session.user.role !== 'IT') {
                router.push('/employee/dashboard');
            } else {
                fetchData();
            }
        }
    }, [status, session, router]);

    const fetchData = async () => {
        try {
            const [reqRes, empRes, devRes] = await Promise.all([
                fetch('/api/hr/requests?status=PENDING'),
                fetch('/api/hr/employees'),
                fetch('/api/hr/biometric/devices'),
            ]);

            const reqData = await reqRes.json();
            const empData = await empRes.json();
            const devData = await devRes.json();

            setRequests(reqData);
            setEmployees(empData.employees || []);
            setDevices(devData.devices || []);
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

    const handleApprove = async (id: string, type: 'invalid' | 'manual') => {
        try {
            const res = await fetch(`/api/hr/requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'APPROVED', type }),
            });

            if (res.ok) {
                showToast('Request approved successfully', 'success');
                fetchData();
            } else {
                showToast('Failed to approve request', 'error');
            }
        } catch (error) {
            showToast('An error occurred', 'error');
        }
    };

    const handleReject = async (id: string, type: 'invalid' | 'manual') => {
        try {
            const res = await fetch(`/api/hr/requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'REJECTED', type }),
            });

            if (res.ok) {
                showToast('Request rejected', 'success');
                fetchData();
            } else {
                showToast('Failed to reject request', 'error');
            }
        } catch (error) {
            showToast('An error occurred', 'error');
        }
    };

    const handleAddEmployee = async (e: FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch('/api/hr/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail,
                    password: newPassword,
                    name: newName,
                    role: newRole,
                }),
            });

            if (res.ok) {
                showToast('Employee created successfully', 'success');
                setNewEmail('');
                setNewPassword('');
                setNewName('');
                setNewRole('EMPLOYEE');
                fetchData();
                setActiveTab('employees');
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to create employee', 'error');
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

    const totalPending = requests.invalidRequests.length + requests.manualRequests.length;

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentEmployees = employees.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(employees.length / itemsPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

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
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>🚢 Project BEACON - HR Portal</h1>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Welcome, {session.user.name} ({session.user.role})</p>
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
            <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Pending Requests</p>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{totalPending}</p>
                    </div>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Employees</p>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{employees.length}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setActiveTab('requests')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'requests' ? '#667eea' : 'white',
                            color: activeTab === 'requests' ? 'white' : '#333',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500',
                        }}
                    >
                        Pending Requests ({totalPending})
                    </button>
                    <button
                        onClick={() => setActiveTab('employees')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'employees' ? '#667eea' : 'white',
                            color: activeTab === 'employees' ? 'white' : '#333',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500',
                        }}
                    >
                        Employees ({employees.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('devices')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'devices' ? '#667eea' : 'white',
                            color: activeTab === 'devices' ? 'white' : '#333',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500',
                        }}
                    >
                        Devices ({devices.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('add')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'add' ? '#28a745' : 'white',
                            color: activeTab === 'add' ? 'white' : '#333',
                            border: activeTab === 'add' ? 'none' : '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500',
                        }}
                    >
                        + Add Employee
                    </button>
                </div>

                {/* Devices Tab */}
                {activeTab === 'devices' && (
                    <DeviceList
                        devices={devices}
                        employees={employees}
                        onRefresh={fetchData}
                    />
                )}

                {/* Pending Requests Tab */}
                {activeTab === 'requests' && (
                    <div style={{ background: 'white', borderRadius: '8px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                            Pending Requests
                        </h2>

                        {totalPending === 0 ? (
                            <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                                No pending requests
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {requests.manualRequests.map((req: any) => (
                                    <div key={req.id} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                            <div>
                                                <span style={{ background: '#ffc107', color: '#000', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600' }}>
                                                    MANUAL LOG
                                                </span>
                                                <h3 style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>{req.user.name}</h3>
                                                <p style={{ color: '#666', fontSize: '0.9rem' }}>{req.user.email}</p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleApprove(req.id, 'manual')}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        background: '#28a745',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(req.id, 'manual')}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        background: '#dc3545',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                                            <div>
                                                <strong>Timestamp:</strong> {new Date(req.timestamp).toLocaleString()}
                                            </div>
                                            <div>
                                                <strong>Node:</strong> {req.node.name} ({req.node.type})
                                            </div>
                                            <div>
                                                <strong>Reason:</strong> {req.reason}
                                            </div>
                                            {req.proof_url && (
                                                <div>
                                                    <strong>Proof:</strong> <a href={req.proof_url} target="_blank" style={{ color: '#667eea' }}>View File</a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {requests.invalidRequests.map((req: any) => (
                                    <div key={req.id} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                            <div>
                                                <span style={{ background: '#dc3545', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600' }}>
                                                    INVALID LOG
                                                </span>
                                                <h3 style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>{req.user.name}</h3>
                                                <p style={{ color: '#666', fontSize: '0.9rem' }}>{req.user.email}</p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleApprove(req.id, 'invalid')}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        background: '#28a745',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(req.id, 'invalid')}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        background: '#dc3545',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                                            <div>
                                                <strong>Log Time:</strong> {new Date(req.log.timestamp).toLocaleString()}
                                            </div>
                                            <div>
                                                <strong>Node:</strong> {req.log.node.name}
                                            </div>
                                            <div>
                                                <strong>Reason:</strong> {req.reason}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Employees Tab */}
                {activeTab === 'employees' && (
                    <div style={{ background: 'white', borderRadius: '8px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                            Employee List
                        </h2>

                        {employees.length === 0 ? (
                            <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                                No employees found
                            </p>
                        ) : (
                            <>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Role</th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Biometric</th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentEmployees.map((emp) => (
                                                <tr key={emp.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                    <td style={{ padding: '1rem' }}>{emp.name}</td>
                                                    <td style={{ padding: '1rem' }}>{emp.email}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{
                                                            padding: '0.25rem 0.75rem',
                                                            background: emp.role === 'HR' ? '#e3f2fd' : emp.role === 'IT' ? '#fff3e0' : '#f3e5f5',
                                                            color: emp.role === 'HR' ? '#1976d2' : emp.role === 'IT' ? '#f57c00' : '#7b1fa2',
                                                            borderRadius: '12px',
                                                            fontSize: '0.85rem',
                                                        }}>
                                                            {emp.role}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        {emp.fingerprintEnrolled ? (
                                                            <span style={{
                                                                padding: '0.25rem 0.75rem',
                                                                background: '#d4edda',
                                                                color: '#155724',
                                                                borderRadius: '12px',
                                                                fontSize: '0.85rem',
                                                            }}>
                                                                ✓ ID: {emp.biometricId}
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                padding: '0.25rem 0.75rem',
                                                                background: '#fff3cd',
                                                                color: '#856404',
                                                                borderRadius: '12px',
                                                                fontSize: '0.85rem',
                                                            }}>
                                                                ⚠ Not Enrolled
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <button
                                                            onClick={() => setEnrollmentModal({ id: emp.id, name: emp.name, email: emp.email })}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                background: emp.fingerprintEnrolled ? '#6c757d' : '#667eea',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.85rem',
                                                            }}
                                                        >
                                                            {emp.fingerprintEnrolled ? 'Re-enroll' : 'Enroll'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {employees.length > itemsPerPage && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1.5rem', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => paginate(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px',
                                                background: currentPage === 1 ? '#f5f5f5' : 'white',
                                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            Previous
                                        </button>
                                        <span style={{ margin: '0 1rem', color: '#666' }}>
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => paginate(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px',
                                                background: currentPage === totalPages ? '#f5f5f5' : 'white',
                                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )
                }

                {/* Add Employee Tab */}
                {
                    activeTab === 'add' && (
                        <div style={{ background: 'white', borderRadius: '8px', padding: '2rem', maxWidth: '600px' }}>
                            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                                Add New Employee
                            </h2>

                            <form onSubmit={handleAddEmployee}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #ddd',
                                            borderRadius: '6px',
                                            fontSize: '1rem',
                                        }}
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #ddd',
                                            borderRadius: '6px',
                                            fontSize: '1rem',
                                        }}
                                        placeholder="john.doe@company.com"
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #ddd',
                                            borderRadius: '6px',
                                            fontSize: '1rem',
                                        }}
                                        placeholder="Minimum 6 characters"
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                        Role
                                    </label>
                                    <select
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid #ddd',
                                            borderRadius: '6px',
                                            fontSize: '1rem',
                                        }}
                                    >
                                        <option value="EMPLOYEE">Employee</option>
                                        <option value="HR">HR</option>
                                        <option value="IT">IT</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem',
                                        background: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Create Employee
                                </button>
                            </form>
                        </div>
                    )
                }
            </main >

            {/* Enrollment Modal */}
            {
                enrollmentModal && (
                    <EnrollmentModal
                        employee={enrollmentModal}
                        onClose={() => setEnrollmentModal(null)}
                        onSuccess={() => {
                            fetchData();
                            setEnrollmentModal(null);
                        }}
                    />
                )
            }
        </div >
    );
}
