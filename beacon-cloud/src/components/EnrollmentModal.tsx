'use client';

import { useState, useEffect, FormEvent } from 'react';

interface EnrollmentModalProps {
    employee: {
        id: string;
        name: string;
        email: string;
    };
    onClose: () => void;
    onSuccess: () => void;
}

export default function EnrollmentModal({ employee, onClose, onSuccess }: EnrollmentModalProps) {
    const [deviceIp, setDeviceIp] = useState('');
    const [biometricId, setBiometricId] = useState('');
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [error, setError] = useState('');
    const [loadingDevices, setLoadingDevices] = useState(true);
    const [instructions, setInstructions] = useState('');
    const [showVerify, setShowVerify] = useState(false);
    const [assignedBiometricId, setAssignedBiometricId] = useState<number | null>(null);

    const fetchDevices = async () => {
        try {
            console.log('[MODAL] Fetching devices...');
            const res = await fetch('/api/hr/biometric/devices');
            console.log('[MODAL] Response status:', res.status);
            const data = await res.json();
            console.log('[MODAL] Response data:', data);
            console.log('[MODAL] Devices array:', data.devices);
            setDevices(data.devices || []);
            if (data.devices?.length > 0) {
                setDeviceIp(data.devices[0].ip);
                console.log('[MODAL] Set default device IP:', data.devices[0].ip);
            } else {
                console.warn('[MODAL] No devices found in response');
            }
        } catch (error) {
            console.error('[MODAL] Error fetching devices:', error);
        } finally {
            setLoadingDevices(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const handleEnroll = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setEnrolling(true);
        setInstructions('');

        try {
            const payload: any = { deviceIp };
            if (biometricId) {
                payload.biometricId = parseInt(biometricId);
            }

            console.log('[ENROLL] Starting enrollment with payload:', payload);

            const res = await fetch(`/api/hr/employees/${employee.id}/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            console.log('[ENROLL] Response status:', res.status);
            const data = await res.json();
            console.log('[ENROLL] Response data:', data);

            if (res.ok) {
                if (data.needsManualEnrollment) {
                    // Show manual enrollment instructions
                    setInstructions(data.instructions || 'Please enroll fingerprint via device menu');
                    setShowVerify(true);
                    setAssignedBiometricId(data.employee.biometricId);
                    alert(data.message);
                } else {
                    // Already enrolled
                    onSuccess();
                    alert(data.message || 'Enrollment successful!');
                    onClose();
                }
            } else {
                const errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                setError(errorMsg);
                console.error('[ENROLL] Error:', data);
            }
        } catch (error: any) {
            const errorMsg = error.message || 'An error occurred during enrollment';
            setError(errorMsg);
            console.error('[ENROLL] Exception:', error);
        } finally {
            setEnrolling(false);
        }
    };

    const handleVerify = async () => {
        if (!assignedBiometricId) return;

        setEnrolling(true);
        setError('');

        try {
            const res = await fetch('/api/hr/biometric/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    biometricId: assignedBiometricId,
                    deviceIp,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                onSuccess();
                alert('Fingerprint verified and retrieved successfully!');
                onClose();
            } else {
                setError(data.message || 'Fingerprint not found. Please complete enrollment on device first.');
            }
        } catch (error: any) {
            setError('Verification failed: ' + error.message);
        } finally {
            setEnrolling(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '2rem',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
            }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '600' }}>
                    Enroll Fingerprint
                </h2>

                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f5f5f5', borderRadius: '6px' }}>
                    <p style={{ fontWeight: '600' }}>{employee.name}</p>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>{employee.email}</p>
                </div>

                {loadingDevices ? (
                    <p>Loading devices...</p>
                ) : (
                    <form onSubmit={handleEnroll}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                Enrollment Device
                            </label>
                            <select
                                value={deviceIp}
                                onChange={(e) => setDeviceIp(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                }}
                            >
                                {devices.map((device) => (
                                    <option key={device.ip} value={device.ip}>
                                        {device.name} - {device.location} ({device.ip})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                Biometric ID (optional - auto-assigned if empty)
                            </label>
                            <input
                                type="number"
                                value={biometricId}
                                onChange={(e) => setBiometricId(e.target.value)}
                                min="1"
                                max="9999"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                }}
                                placeholder="Leave empty for auto-assignment"
                            />
                            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                                Valid range: 1-9999. System will auto-assign next available ID if left empty.
                            </p>
                        </div>

                        {error && (
                            <div style={{
                                padding: '0.75rem',
                                background: '#fee',
                                color: '#c33',
                                borderRadius: '6px',
                                marginBottom: '1rem',
                                fontSize: '0.9rem',
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '6px', marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '0.9rem', color: '#1976d2', fontWeight: '500', marginBottom: '0.5rem' }}>
                                📌 Enrollment Process
                            </p>
                            <ol style={{ fontSize: '0.85rem', color: '#555', marginLeft: '1.5rem', lineHeight: '1.6' }}>
                                <li>Click "Start Enrollment"</li>
                                <li>Place finger on device scanner</li>
                                <li>Lift and place again (3 times total)</li>
                                <li>Wait for confirmation</li>
                            </ol>
                        </div>

                        {instructions && (
                            <div style={{
                                padding: '1rem',
                                background: '#fff3cd',
                                border: '2px solid #ff9800',
                                borderRadius: '6px',
                                marginBottom: '1.5rem',
                                whiteSpace: 'pre-line',
                                fontSize: '0.9rem',
                                lineHeight: '1.6',
                            }}>
                                <strong style={{ color: '#f57c00', display: 'block', marginBottom: '0.5rem' }}>
                                    📝 Manual Enrollment Steps
                                </strong>
                                <div style={{ marginBottom: '1rem' }}>
                                    {instructions.split('\n').filter(line => !line.includes('MANUAL ENROLLMENT REQUIRED')).join('\n')}
                                </div>

                                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ffcc80' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#e65100' }}>
                                        Confirm ID Used on Device:
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input
                                            type="number"
                                            value={assignedBiometricId || ''}
                                            onChange={(e) => setAssignedBiometricId(parseInt(e.target.value) || null)}
                                            style={{
                                                padding: '0.5rem',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px',
                                                width: '100px',
                                                fontWeight: 'bold',
                                                fontSize: '1.1rem'
                                            }}
                                        />
                                        <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                            (Update this if device auto-generated a different ID)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={enrolling}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem',
                                    background: '#f5f5f5',
                                    color: '#333',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: enrolling ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {showVerify ? 'Close' : 'Cancel'}
                            </button>
                            {!showVerify ? (
                                <button
                                    type="submit"
                                    disabled={enrolling || !deviceIp}
                                    style={{
                                        flex: 1,
                                        padding: '0.875rem',
                                        background: enrolling ? '#999' : '#667eea',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: enrolling || !deviceIp ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {enrolling ? 'Processing...' : 'Prepare Enrollment'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleVerify}
                                    disabled={enrolling}
                                    style={{
                                        flex: 1,
                                        padding: '0.875rem',
                                        background: enrolling ? '#999' : '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: enrolling ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {enrolling ? 'Verifying...' : '✓ Verify Enrollment'}
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
