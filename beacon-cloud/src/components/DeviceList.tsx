'use client';

import { useState } from 'react';

interface DeviceListProps {
    devices: any[];
    employees: any[];
    onRefresh: () => void;
}

export default function DeviceList({ devices, employees, onRefresh }: DeviceListProps) {
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
    const [deviceUsers, setDeviceUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Pagination
    const [userPage, setUserPage] = useState(1);
    const [usersPerPage] = useState(10);

    // Pagination Logic
    const indexOfLastUser = userPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = deviceUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalUserPages = Math.ceil(deviceUsers.length / usersPerPage);

    const paginateUsers = (page: number) => setUserPage(page);

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh();
        setRefreshing(false);
    };

    const handleViewUsers = async (ip: string) => {
        console.log('[DEVICE_LIST] handleViewUsers called with IP:', ip, typeof ip);
        if (selectedDevice === ip) {
            setSelectedDevice(null);
            return;
        }

        setSelectedDevice(ip);
        setUserPage(1); // Reset to page 1
        setLoadingUsers(true);
        try {
            const url = `/api/hr/biometric/devices/${ip}/users`;
            console.log('[DEVICE_LIST] Fetching users from URL:', url);
            const res = await fetch(url);

            if (!res.ok) {
                const errText = await res.text();
                console.error('Fetch failed:', res.status, errText);
                throw new Error(`Server returned ${res.status}: ${errText}`);
            }

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            console.log('Users data:', data);
            setDeviceUsers(data.users || []);

            if (!data.users || data.users.length === 0) {
                console.warn('Received empty users array');
            }

        } catch (error: any) {
            console.error('Error fetching device users:', error);
            // Optionally set an error state here instead of alerting
        } finally {
            setLoadingUsers(false);
        }
    };

    // Add helper function to find linked employee
    const getLinkedEmployee = (uid: number) => {
        return employees.find(emp => emp.biometricId === uid);
    };

    const handleLinkEmployee = async (uid: number, employeeId: string) => {
        if (!confirm('Are you sure you want to link this user? This will update the employee record.')) return;

        try {
            // 1. Update employee record with biometric ID
            const res = await fetch(`/api/hr/employees/${employeeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    biometricId: uid,
                    fingerprintEnrolled: true, // we assume if they are on device, they are enrolled
                    enrolledAt: new Date().toISOString()
                })
            });

            if (res.ok) {
                alert('Employee linked successfully!');
                // Refresh everything
                handleRefresh();
            } else {
                const err = await res.json();
                alert('Failed to link: ' + (JSON.stringify(err.error) || 'Unknown error'));
            }
        } catch (e: any) {
            alert('Error linking: ' + e.message);
        }
    };

    const handleSyncFingerprint = async (uid: number, employeeId: string, deviceIp: string) => {
        if (!confirm('Sync fingerprint from device to employee record?')) return;

        try {
            // Use the enroll endpoint which handles fetching template from device
            const res = await fetch(`/api/hr/employees/${employeeId}/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceIp: deviceIp,
                    biometricId: uid
                })
            });

            if (res.ok) {
                alert('Fingerprint synced successfully!');
                handleRefresh();
                onRefresh(); // Refresh parent to update Employee list status
            } else {
                const err = await res.json();
                alert('Failed to sync: ' + (JSON.stringify(err.error) || 'Unknown error'));
            }
        } catch (e: any) {
            alert('Error syncing: ' + e.message);
        }
    };

    return (
        <div style={{ background: 'white', borderRadius: '8px', padding: '2rem' }}>
            {/* Header ... */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                    Biometric Devices
                </h2>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    style={{
                        padding: '0.5rem 1rem',
                        background: '#f8f9fa',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        cursor: refreshing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}
                >
                    {refreshing ? 'Refreshing...' : '↻ Refresh Status'}
                </button>
            </div>

            {devices.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                    No devices configured
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {devices.map((device) => (
                        <div key={device.ip} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ padding: '1.5rem', background: '#fff' }}>
                                {/* Device Header Info ... */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
                                                {device.name}
                                            </h3>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                background: device.status === 'online' ? '#d4edda' : '#f8d7da',
                                                color: device.status === 'online' ? '#155724' : '#721c24',
                                                borderRadius: '12px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.35rem'
                                            }}>
                                                <span style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: device.status === 'online' ? '#28a745' : '#dc3545',
                                                    display: 'block'
                                                }} />
                                                {device.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                                            </span>
                                        </div>
                                        <p style={{ color: '#666', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            📍 {device.location}
                                            <span style={{ color: '#ddd' }}>|</span>
                                            🌐 {device.ip}
                                        </p>
                                        <div style={{ fontSize: '0.6rem', color: '#999', marginTop: '0.5rem' }}>
                                            Debug IP: {String(device.ip)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleViewUsers(device.ip)}
                                        disabled={device.status !== 'online'}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: selectedDevice === device.ip ? '#e2e8f0' : '#f8f9fa',
                                            color: '#333',
                                            border: '1px solid #ddd',
                                            borderRadius: '6px',
                                            cursor: device.status === 'online' ? 'pointer' : 'not-allowed',
                                            opacity: device.status === 'online' ? 1 : 0.6,
                                        }}
                                    >
                                        {selectedDevice === device.ip ? 'Hide Users' : 'View Users'}
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Users</p>
                                        <p style={{ fontSize: '1.25rem', fontWeight: '600' }}>{device.users_count || '-'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Fingerprints</p>
                                        <p style={{ fontSize: '1.25rem', fontWeight: '600' }}>{device.templates_count || '-'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Model</p>
                                        <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>{device.device_name || '-'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Firmware</p>
                                        <p style={{ fontSize: '0.9rem', fontWeight: '500', fontFamily: 'monospace' }}>{device.firmware || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Device Users List */}
                            {selectedDevice === device.ip && (
                                <div style={{ background: '#f8f9fa', borderTop: '1px solid #e0e0e0', padding: '1.5rem' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
                                        Users on Device ({deviceUsers.length})
                                    </h4>

                                    {loadingUsers ? (
                                        <p style={{ color: '#666' }}>Loading users...</p>
                                    ) : deviceUsers.length === 0 ? (
                                        <p style={{ color: '#666' }}>No users found on device.</p>
                                    ) : (
                                        <>
                                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                    <thead>
                                                        <tr style={{ background: '#eee' }}>
                                                            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>UID</th>
                                                            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Name</th>
                                                            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Linked To</th>
                                                            <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Fingerprint</th>
                                                            <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {currentUsers.map((user: any) => {
                                                            const linkedEmp = getLinkedEmployee(user.uid);
                                                            return (
                                                                <tr key={user.uid} style={{ background: 'white', borderBottom: '1px solid #e0e0e0' }}>
                                                                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>{user.uid}</td>
                                                                    <td style={{ padding: '0.75rem' }}>{user.name || '-'}</td>
                                                                    <td style={{ padding: '0.75rem' }}>
                                                                        {linkedEmp ? (
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                <span style={{ color: '#28a745', fontWeight: '500' }}>
                                                                                    ✓ {linkedEmp.name}
                                                                                </span>
                                                                                {user.has_fingerprint && !linkedEmp.fingerprintEnrolled && (
                                                                                    <button
                                                                                        onClick={() => handleSyncFingerprint(user.uid, linkedEmp.id, device.ip)}
                                                                                        title="Sync fingerprint from device to database"
                                                                                        style={{
                                                                                            padding: '0.1rem 0.5rem',
                                                                                            background: '#ffc107',
                                                                                            color: '#000',
                                                                                            border: 'none',
                                                                                            borderRadius: '4px',
                                                                                            cursor: 'pointer',
                                                                                            fontSize: '0.7rem'
                                                                                        }}
                                                                                    >
                                                                                        📥 Sync
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span style={{ color: '#dc3545', fontSize: '0.8rem' }}>
                                                                                Not Linked
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                                        {user.has_fingerprint ? '✅' : '❌'}
                                                                    </td>
                                                                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                                            {!linkedEmp && (
                                                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                                    <select
                                                                                        onChange={(e) => {
                                                                                            if (e.target.value) {
                                                                                                handleLinkEmployee(user.uid, e.target.value);
                                                                                                e.target.value = ""; // reset
                                                                                            }
                                                                                        }}
                                                                                        style={{
                                                                                            padding: '0.25rem',
                                                                                            borderRadius: '4px',
                                                                                            border: '1px solid #ddd',
                                                                                            fontSize: '0.8rem',
                                                                                            maxWidth: '120px'
                                                                                        }}
                                                                                    >
                                                                                        <option value="">🔗 Link...</option>
                                                                                        {employees
                                                                                            .filter(e => !e.fingerprintEnrolled) // only show unenrolled
                                                                                            .map(e => (
                                                                                                <option key={e.id} value={e.id}>{e.name}</option>
                                                                                            ))}
                                                                                    </select>
                                                                                </div>
                                                                            )}
                                                                            <button
                                                                                onClick={async () => {
                                                                                    if (confirm(`Are you sure you want to delete user ${user.uid} (${user.name})?`)) {
                                                                                        try {
                                                                                            const res = await fetch(`/api/hr/biometric/devices/${device.ip}/users/${user.uid}`, { method: 'DELETE' });
                                                                                            if (res.ok) {
                                                                                                handleViewUsers(device.ip);
                                                                                                alert('User deleted successfully');
                                                                                            } else {
                                                                                                const err = await res.json();
                                                                                                alert('Failed: ' + (err.error || 'Unknown error'));
                                                                                            }
                                                                                        } catch (e: any) { alert('Error: ' + e.message); }
                                                                                    }
                                                                                }}
                                                                                style={{
                                                                                    padding: '0.25rem 0.5rem',
                                                                                    background: '#dc3545',
                                                                                    color: 'white',
                                                                                    borderRadius: '4px',
                                                                                    border: 'none',
                                                                                    cursor: 'pointer',
                                                                                    fontSize: '0.8rem'
                                                                                }}
                                                                            >
                                                                                🗑️ Delete
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Pagination Controls */}
                                            {deviceUsers.length > usersPerPage && (
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => paginateUsers(userPage - 1)}
                                                        disabled={userPage === 1}
                                                        style={{
                                                            padding: '0.25rem 0.5rem',
                                                            border: '1px solid #ddd',
                                                            borderRadius: '4px',
                                                            background: userPage === 1 ? '#f5f5f5' : 'white',
                                                            cursor: userPage === 1 ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        Previous
                                                    </button>
                                                    <span style={{ margin: '0 0.5rem', color: '#666', fontSize: '0.8rem' }}>
                                                        Page {userPage} of {totalUserPages}
                                                    </span>
                                                    <button
                                                        onClick={() => paginateUsers(userPage + 1)}
                                                        disabled={userPage === totalUserPages}
                                                        style={{
                                                            padding: '0.25rem 0.5rem',
                                                            border: '1px solid #ddd',
                                                            borderRadius: '4px',
                                                            background: userPage === totalUserPages ? '#f5f5f5' : 'white',
                                                            cursor: userPage === totalUserPages ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
