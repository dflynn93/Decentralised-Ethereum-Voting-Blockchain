// EmergencyControls.jsx - Basic emergency controls for admin use
import React, { useState, useEffect } from 'react';

const BasicEmergencyControls = ({ contract, provider, walletAddress, votingClosed, onVotingToggle }) => {
    const [systemStatus, setSystemStatus] = useState('NORMAL');
    const [emergencyLog, setEmergencyLog] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Basic monitoring metrics
    const [metrics, setMetrics] = useState({
        lastBlockTime: 0,
        votingRate: 0,
        activeVoters: 0
    });

    useEffect(() => {
        if (provider) {
            // Update basic metrics every 30 seconds
            const interval = setInterval(updateMetrics, 30000);
            updateMetrics(); // Initial update
            return () => clearInterval(interval);
        }
    }, [provider]);

    const updateMetrics = async () => {
        if (!provider) return;
        
        try {
            const currentBlock = await provider.getBlock('latest');
            const blockTime = Date.now() / 1000 - currentBlock.timestamp;
            
            setMetrics(prev => ({
                ...prev,
                lastBlockTime: blockTime
            }));
        } catch (error) {
            console.error('Error updating metrics:', error);
        }
    };

    const logEmergencyAction = (action, details) => {
        const logEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action,
            details,
            admin: walletAddress,
            systemStatus
        };
        
        setEmergencyLog(prev => [logEntry, ...prev.slice(0, 19)]); // Keep last 20 entries
        console.log('Emergency Action Logged:', logEntry);
    };

    const handleEmergencyPause = async () => {
        if (!window.confirm('EMERGENCY PAUSE\n\nThis will immediately stop all voting activities.\n\nAre you sure you want to proceed?')) {
            return;
        }

        setIsLoading(true);
        try {
            // If your contract has an emergency pause function
            if (contract && typeof contract.emergencyPause === 'function') {
                await contract.emergencyPause();
                logEmergencyAction('EMERGENCY_PAUSE', 'Voting paused by administrator via smart contract');
            } else {
                // Fallback: use existing voting toggle
                if (!votingClosed) {
                    onVotingToggle();
                    logEmergencyAction('EMERGENCY_PAUSE', 'Voting paused by administrator via UI toggle');
                }
            }
            
            setSystemStatus('EMERGENCY_PAUSED');
            alert('Emergency pause activated successfully');
            
        } catch (error) {
            console.error('Emergency pause failed:', error);
            alert('Emergency pause failed: ' + error.message);
            logEmergencyAction('EMERGENCY_PAUSE_FAILED', `Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResumeOperations = async () => {
        if (!window.confirm('Resume normal voting operations?\n\nThis will allow voters to cast ballots again.')) {
            return;
        }

        setIsLoading(true);
        try {
            // If your contract has a resume function
            if (contract && typeof contract.resumeOperations === 'function') {
                await contract.resumeOperations();
                logEmergencyAction('OPERATIONS_RESUMED', 'Voting resumed by administrator via smart contract');
            } else {
                // Fallback: use existing voting toggle
                if (votingClosed) {
                    onVotingToggle();
                    logEmergencyAction('OPERATIONS_RESUMED', 'Voting resumed by administrator via UI toggle');
                }
            }
            
            setSystemStatus('NORMAL');
            alert('Operations resumed successfully');
            
        } catch (error) {
            console.error('Resume operations failed:', error);
            alert('Resume failed: ' + error.message);
            logEmergencyAction('RESUME_FAILED', `Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForceVotingClose = async () => {
        if (!window.confirm('🚨 FORCE CLOSE VOTING\n\nThis will permanently close the voting period and begin result processing.\n\nThis action cannot be undone.\n\nProceed?')) {
            return;
        }

        setIsLoading(true);
        try {
            if (!votingClosed) {
                onVotingToggle();
                logEmergencyAction('FORCE_CLOSE', 'Voting forcibly closed by administrator');
                setSystemStatus('CLOSED');
                alert('Voting period forcibly closed');
            } else {
                alert('Voting is already closed');
            }
            
        } catch (error) {
            console.error('Force close failed:', error);
            alert('Force close failed: ' + error.message);
            logEmergencyAction('FORCE_CLOSE_FAILED', `Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const exportEmergencyLog = () => {
        const exportData = {
            exportTime: new Date().toISOString(),
            constituency: 'BallyBeg, Co. Donegal',
            systemStatus,
            adminWallet: walletAddress,
            totalActions: emergencyLog.length,
            actions: emergencyLog
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emergency-log-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getStatusColor = () => {
        switch (systemStatus) {
            case 'NORMAL': return '#4caf50';
            case 'EMERGENCY_PAUSED': return '#f44336';
            case 'CLOSED': return '#ff9800';
            default: return '#6c757d';
        }
    };

    const getStatusBackground = () => {
        switch (systemStatus) {
            case 'NORMAL': return '#e8f5e9';
            case 'EMERGENCY_PAUSED': return '#ffebee';
            case 'CLOSED': return '#fff3e0';
            default: return '#f8f9fa';
        }
    };

    return (
        <div style={{ 
            padding: '2rem',
            backgroundColor: '#fff5f5',
            border: '2px solid #f44336',
            borderRadius: '8px',
            marginTop: '2rem'
        }}>
            {/* Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '2rem' 
            }}>
                <h2 style={{ margin: 0, color: '#d32f2f' }}>
                    Emergency Controls
                </h2>
                <div style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    backgroundColor: getStatusBackground(),
                    color: getStatusColor(),
                    border: `1px solid ${getStatusColor()}`
                }}>
                    {systemStatus}
                </div>
            </div>

            {/* System Status */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Voting Status</h4>
                    <div style={{
                        fontWeight: 'bold',
                        color: votingClosed ? '#f44336' : '#4caf50'
                    }}>
                        {votingClosed ? 'CLOSED' : 'OPEN'}
                    </div>
                </div>

                <div style={{
                    padding: '1rem',
                    backgroundColor: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Block Delay</h4>
                    <div style={{
                        fontWeight: 'bold',
                        color: metrics.lastBlockTime > 60 ? '#f44336' : '#4caf50'
                    }}>
                        {Math.round(metrics.lastBlockTime)}s
                    </div>
                </div>

                <div style={{
                    padding: '1rem',
                    backgroundColor: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👤</div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Admin</h4>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                        {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
                    </div>
                </div>
            </div>

            {/* Emergency Actions */}
            <div style={{
                backgroundColor: '#ffebee',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '2px solid #f44336',
                marginBottom: '2rem'
            }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#d32f2f' }}>Emergency Actions</h3>
                
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '1rem' 
                }}>
                    <button
                        onClick={handleEmergencyPause}
                        disabled={isLoading || votingClosed}
                        style={{
                            padding: '1rem',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isLoading || votingClosed ? 'not-allowed' : 'pointer',
                            opacity: isLoading || votingClosed ? 0.6 : 1,
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}
                    >
                        {isLoading ? 'Processing...' : 'Emergency Pause'}
                    </button>
                    
                    <button
                        onClick={handleResumeOperations}
                        disabled={isLoading || !votingClosed}
                        style={{
                            padding: '1rem',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isLoading || !votingClosed ? 'not-allowed' : 'pointer',
                            opacity: isLoading || !votingClosed ? 0.6 : 1,
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}
                    >
                        {isLoading ? 'Processing...' : 'Resume Voting'}
                    </button>
                    
                    <button
                        onClick={handleForceVotingClose}
                        disabled={isLoading || votingClosed}
                        style={{
                            padding: '1rem',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isLoading || votingClosed ? 'not-allowed' : 'pointer',
                            opacity: isLoading || votingClosed ? 0.6 : 1,
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}
                    >
                        {isLoading ? 'Processing...' : 'Force Close'}
                    </button>
                </div>
            </div>

            {/* Action Log */}
            <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem' 
                }}>
                    <h3 style={{ margin: 0 }}>Emergency Action Log</h3>
                    {emergencyLog.length > 0 && (
                        <button
                            onClick={exportEmergencyLog}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            Export Log
                        </button>
                    )}
                </div>
                
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {emergencyLog.length === 0 ? (
                        <div style={{ 
                            textAlign: 'center', 
                            color: '#666', 
                            padding: '1rem',
                            fontStyle: 'italic'
                        }}>
                            No emergency actions recorded.
                        </div>
                    ) : (
                        emergencyLog.map(entry => (
                            <div
                                key={entry.id}
                                style={{
                                    padding: '0.75rem',
                                    marginBottom: '0.5rem',
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '4px'
                                }}
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    marginBottom: '0.25rem' 
                                }}>
                                    <span style={{ fontWeight: 'bold' }}>{entry.action}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                        {new Date(entry.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#333' }}>
                                    {entry.details}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
                                    Admin: {entry.admin ? `${entry.admin.slice(0, 8)}...` : 'Unknown'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default BasicEmergencyControls;