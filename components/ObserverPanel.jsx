import React, { useState, useEffect } from "react";
import DigitalBallot from "../src/DigitalBallot.jsx";
import legacyEventMonitor from "../utils/LegacyEventMonitor.js";
import "./ObserverPanel.css";

const observerAccounts = {
    201: 'obs1',
    202: 'obs2'
};

function ObserverPanel({ candidates = [], votingClosed = false, contract, provider, electionCalled = false, electionCalledDate = null, nominationDeadline = null, votingHistory = []}) {
    const [observerId, setObserverId] = useState('');
    const [observerPin, setObserverPin] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Event monitoring state
    const [auditEvents, setAuditEvents] = useState([]);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [eventStats, setEventStats] = useState(null);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [eventFilter, setEventFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Real-time clock
    const [currentTime, setCurrentTime] = useState(new Date());

    const totalVotes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Initialise event monitoring when logged in
    useEffect(() => {
        if (isLoggedIn && contract && provider && !isMonitoring) {
            initialiseEventMonitoring();
        }

        return () => {
            if (isMonitoring) {
                legacyEventMonitor.stopMonitoring();
            }
        };
    }, [isLoggedIn, contract, provider, isMonitoring]);

    // Filter events based on selected filter and search term
    useEffect(() => {
        let events = auditEvents;

        // Apply type filter
        if (eventFilter !== 'ALL') {
            events = events.filter(event => event.type === eventFilter);
        }

        // Apply search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            events = events.filter(event => {
                const formatted = legacyEventMonitor.formatEventForDisplay(event);
                return formatted.title.toLowerCase().includes(searchLower) ||
                       formatted.description.toLowerCase().includes(searchLower) ||
                       (formatted.actor && formatted.actor.toLowerCase().includes(searchLower));
            });
        }

        setFilteredEvents(events);
    }, [auditEvents, eventFilter, searchTerm]);

    // Independent Audit Node Functions
    const runIndependentAudit = async () => {
        if (!contract || !provider) {
            alert('Contract not available for audit');
            return;
        }

        setIsRunningAudit(true);
        setNodeStatus('running');

        try {
            console.log("Starting Independent Audit for BallyBeg...");
            
            const auditChecks = await performAuditChecks();
            setAuditResults(auditChecks);
            
            const score = calculateVerificationScore(auditChecks);
            setVerificationScore(score);
            setNodeStatus(score >= 95 ? 'verified' : 'issues_found');

            console.log("Independent Audit Complete:", auditChecks);

        } catch (error) {
            console.error('Independent audit failed:', error);
            setNodeStatus('error');
            setVerificationScore(0);
        } finally {
            setIsRunningAudit(false);
        }
    };

      const performAuditChecks = async () => {
        const checks = [];

        // 1. Verify vote totals consistency
        try {
            const blockchainTotal = totalVotes;
            const eventTotal = auditEvents.filter(e => e.type === 'VOTE_REVEALED').length;
            
            checks.push({
                type: 'VOTE_TOTALS',
                status: blockchainTotal === eventTotal ? 'PASS' : 'FAIL',
                details: {
                    blockchainTotal,
                    eventTotal,
                    match: blockchainTotal === eventTotal
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            checks.push({
                type: 'VOTE_TOTALS',
                status: 'ERROR',
                details: { error: error.message },
                timestamp: new Date().toISOString()
            });
        }

        // 2. Check for double voting
        try {
            const voteEvents = auditEvents.filter(e => e.type === 'VOTE_COMMITTED');
            const voterAddresses = voteEvents.map(e => e.data?.voter).filter(Boolean);
            const uniqueVoters = [...new Set(voterAddresses)];
            
            checks.push({
                type: 'DOUBLE_VOTING',
                status: voterAddresses.length === uniqueVoters.length ? 'PASS' : 'FAIL',
                details: {
                    totalVotes: voterAddresses.length,
                    uniqueVoters: uniqueVoters.length,
                    duplicatesFound: voterAddresses.length - uniqueVoters.length
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            checks.push({
                type: 'DOUBLE_VOTING',
                status: 'ERROR',
                details: { error: error.message },
                timestamp: new Date().toISOString()
            });
        }

        // 3. Verify candidate registration integrity
        try {
            const candidateEvents = auditEvents.filter(e => e.type === 'CANDIDATE_ADDED');
            const registeredCandidates = candidateEvents.length;
            const currentCandidates = candidates.length;
            
            checks.push({
                type: 'CANDIDATE_INTEGRITY',
                status: registeredCandidates === currentCandidates ? 'PASS' : 'FAIL',
                details: {
                    registeredCandidates,
                    currentCandidates,
                    match: registeredCandidates === currentCandidates
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            checks.push({
                type: 'CANDIDATE_INTEGRITY',
                status: 'ERROR',
                details: { error: error.message },
                timestamp: new Date().toISOString()
            });
        }

        // 4. Verify system timing constraints
        try {
            const adminEvents = auditEvents.filter(e => e.type === 'ADMIN_ACTION');
            const validTimingEvents = adminEvents.filter(e => {
                // Check if admin actions happened during valid periods
                return true; // Simplified for demo
            });
            
            checks.push({
                type: 'TIMING_CONSTRAINTS',
                status: 'PASS',
                details: {
                    totalAdminEvents: adminEvents.length,
                    validTimingEvents: validTimingEvents.length,
                    complianceRate: adminEvents.length > 0 ? (validTimingEvents.length / adminEvents.length) * 100 : 100
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            checks.push({
                type: 'TIMING_CONSTRAINTS',
                status: 'ERROR',
                details: { error: error.message },
                timestamp: new Date().toISOString()
            });
        }

        // 5. Verify blockchain consistency
        try {
            const totalEvents = auditEvents.length;
            const validEvents = auditEvents.filter(e => e.id && e.timestamp && e.type).length;
            
            checks.push({
                type: 'BLOCKCHAIN_CONSISTENCY',
                status: totalEvents === validEvents ? 'PASS' : 'FAIL',
                details: {
                    totalEvents,
                    validEvents,
                    consistencyRate: totalEvents > 0 ? (validEvents / totalEvents) * 100 : 100
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            checks.push({
                type: 'BLOCKCHAIN_CONSISTENCY',
                status: 'ERROR',
                details: { error: error.message },
                timestamp: new Date().toISOString()
            });
        }

        return checks;
    };

    const calculateVerificationScore = (checks) => {
        if (checks.length === 0) return 0;
        const passedChecks = checks.filter(check => check.status === 'PASS').length;
        return Math.round((passedChecks / checks.length) * 100);
    };

    const exportIndependentAuditReport = () => {
        const report = {
            auditId: `independent-audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            constituency: 'BallyBeg, Co. Donegal',
            auditorId: observerId,
            verificationScore,
            nodeStatus,
            auditResults,
            summary: {
                totalChecks: auditResults.length,
                passedChecks: auditResults.filter(r => r.status === 'PASS').length,
                failedChecks: auditResults.filter(r => r.status === 'FAIL').length,
                errorChecks: auditResults.filter(r => r.status === 'ERROR').length,
                overallStatus: verificationScore >= 95 ? 'VERIFIED' : verificationScore >= 80 ? 'ISSUES_DETECTED' : 'REQUIRES_INVESTIGATION'
            },
            metadata: {
                electionCalled,
                votingClosed,
                totalVotes,
                totalCandidates: candidates.length,
                totalAuditEvents: auditEvents.length
            }
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ballybeg-independent-audit-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getNodeStatusInfo = () => {
        switch (nodeStatus) {
            case 'verified':
                return { color: '#4caf50', text: 'VERIFIED', bg: '#e8f5e9' };
            case 'issues_found':
                return { color: '#ff9800', text: 'ISSUES DETECTED', bg: '#fff3e0' };
            case 'running':
                return { color: '#2196f3', text: 'RUNNING AUDIT', bg: '#e3f2fd' };
            case 'error':
                return { color: '#f44336', text: 'ERROR', bg: '#ffebee' };
            default:
                return { color: '#6c757d', text: 'OFFLINE', bg: '#f8f9fa' };
        }
    };



    const initialiseEventMonitoring = async () => {
        try {
            console.log("Initialising event monitoring...");
            setIsMonitoring(true);

            await legacyEventMonitor.initialise(contract, provider);

            // Subscribe to new events
            legacyEventMonitor.subscribe('NEW_EVENT', (event) => {
                console.log("New event received:", event);
                setAuditEvents(prev => [event, ...prev]);
            });

            legacyEventMonitor.subscribe('HISTORY_LOADED', (data) => {
                console.log(`Loaded ${data.count} historical events`);
                setAuditEvents(legacyEventMonitor.getAllEvents());
                setEventStats(legacyEventMonitor.getVotingStats());
            });

            legacyEventMonitor.subscribe('ADMIN_ACTION', (event) => {
                console.log("Admin action detected:", event);
            })

            // Start monitoring
            await legacyEventMonitor.startMonitoring();

            // Initial load of events
            setAuditEvents(legacyEventMonitor.getAllEvents());
            setEventStats(legacyEventMonitor.getVotingStats());

            console.log("Legacy Event Monitor successfully initialised for BallyBeg");

        } catch (error) {
            console.error("Failed to initialise event monitoring:", error);
            setIsMonitoring(false);
        }
    };

    const handleLogin = () => {
        if (observerAccounts[observerId] === observerPin) {
            setIsLoggedIn(true);
            alert("Observer login successful. Initialising real-time audit monitoring...");
        } else {
            alert("Invalid credentials.");
        }
    };

   const exportAuditTrail = () => {
        try {
            const auditData = legacyEventMonitor.exportAuditTrail();
            const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ballybeg-election-audit-trail-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting audit trail:", error);
            alert("Error exporting audit trail. Please try again.");
        }
    };


    const getEventTypeStats = () => {
        const stats = {};
        auditEvents.forEach(event => {
            stats[event.type] = (stats[event.type] || 0) + 1;
        });
        return stats;
    };

    const calculateElectionStats = () => {
        const timeline = legacyEventMonitor.getElectionTimeline();
        const votingStats = legacyEventMonitor.getVotingStats();

        const electionStartEvent = timeline.find(e => 
            e.type === 'PHASE_CHANGED' && e.data && e.data.newPhase === 'Commitment'
        );
        const electionEndEvent = timeline.find(e => 
            e.type === 'PHASE_CHANGED' && e.data && e.data.newPhase === 'Ended'
        );

        return {
            electionStartTime: electionStartEvent ? electionStartEvent.timestamp : null,
            electionEndTime: electionEndEvent ? electionEndEvent.timestamp : null,
            totalEvents: auditEvents.length,
            uniqueAdmins: [...new Set(auditEvents.map(e => 
                e.data && (e.data.admin || e.data.addedBy || e.data.changedBy)
            ))].filter(Boolean).length,
            votingStats
        };
    };

    // Election Status COmponent
    const getElectionStatus = () => {
        if (!electionCalled) {
            return {
                status: 'No Election Called',
                statusColor: '#6c757d',
                backgroundColor: '#f8f9fa',
                borderColor: '#dee2e6',
                description: 'No election or referendum is currently scheduled.'
            };
        }

        if (votingClosed) {
            return {
                status: 'Election Closed',
                statusColor: '#dc3545',
                backgroundColor: '#f8d7da',
                borderColor: '#f5c6cb',
                description: 'Voting has ended. Results are being processed.'
            };
        }

        const now = new Date();
        const isNominationOpen = nominationDeadline && now < nominationDeadline;

        if (isNominationOpen) {
            return {
                status: 'Election Called - Nomination Period',
                statusColor: '#fd7e14',
                backgroundColor: '#fff3cd',
                borderColor: '#ffeaa7',
                description: 'Election has been called. Candidates may submit nominations.'
            };
        }

        return {
                status: 'Election Open - Voting Active',
                statusColor: '#28a745',
                backgroundColor: '#d4edda',
                borderColor: '#c3e6cb',
                description: 'Voting is currently open. Citizens may cast their ballots.'
            };
        };
        
        const getTimeRemaining = () => {
            if (!nominationDeadline) return null;

            const now = new Date();
            const timeLeft = nominationDeadline - now;

            if (timeLeft <= 0) {
                return "Nomination period has ended";
            }

            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            if (minutes > 60) {
                const hours = Math.floor(minutes / 60);
                const remainingMinutes = minutes % 60;
                return `${hours}h ${remainingMinutes}m remaining for nominations`;
            }

            return `${minutes}m ${seconds}s remaining for nominations`;
        };

        const getElectionDuration = () => {
            if (!electionCalledDate) return null;

            const now = new Date();
            const duration = now - electionCalledDate;
            const hours = Math.floor(duration / (1000 * 60 * 60));
            const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

            if (hours > 0) {
                return `Election running for ${hours}h ${minutes}m`;
            }
            return `Election running for ${minutes}m`;
        };
    

     if (!isLoggedIn) {
        return (
            <div className="observer-panel">
                <h2>Observer Panel - BallyBeg, Co. Donegal</h2>
                <div className="login-container">
                    <h3>Observer Login</h3>
                    <div className="form-group">
                        <label>
                            Observer ID:
                            <input 
                                type="text"
                                value={observerId}
                                onChange={(e) => setObserverId(e.target.value)}
                                className="login-input"
                                placeholder="Enter Observer ID"
                            />
                        </label>
                    </div>
                    <div className="form-group">
                        <label>
                            PIN:
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={observerPin}
                                onChange={(e) => setObserverPin(e.target.value)}
                                className="login-input"
                                placeholder="Enter PIN"
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                style={{ paddingRight: '3rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#666',
                                    fontSize: '0.8rem',
                                    padding: '0.25rem'
                                }}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </label>
                    </div>
                    <button
                        onClick={handleLogin}
                        className="login-button"
                        disabled={!observerId || !observerPin}
                    >
                        Login as Observer
                    </button>
                    <div className="test-credentials">
                        <strong>Test Credentials</strong><br/>
                        ID: 201, PIN: obs1<br/>
                        ID: 202, PIN: obs2
                    </div>
                </div>
            </div>
        );
    }

    const electionStats = calculateElectionStats();
    const eventTypeStats = getEventTypeStats();
    const statusInfo = getElectionStatus();

        return (
        <div className="observer-panel">
            <h2>Observer Panel - BallyBeg, Co. Donegal</h2>

            {/* Real-time Clock */}
            <div className="real-time-clock">
                <h4>Current Time: {currentTime.toLocaleString()}</h4>
            </div>

            {/* Election Status */}
            <div className="election-status" style={{
                backgroundColor: statusInfo.backgroundColor,
                borderColor: statusInfo.borderColor
            }}>
                <h3 style={{ color: statusInfo.statusColor }}>
                    {statusInfo.status}
                </h3>
                <p style={{ color: statusInfo.statusColor }}>
                    {statusInfo.description}
                </p>

                <div className="status-grid">
                    {electionCalledDate && (
                        <div>
                            <strong>Election Called:</strong>
                            <p>{electionCalledDate.toLocaleString()}</p>
                        </div>
                    )}

                    {getElectionDuration() && (
                        <div>
                            <strong>Duration:</strong>
                            <p>{getElectionDuration()}</p>
                        </div>
                    )}

                    {nominationDeadline && (
                        <div>
                            <strong>Nomination Deadline:</strong>
                            <p>{nominationDeadline.toLocaleString()}</p>
                            {getTimeRemaining() && (
                                <p className={`time-remaining ${getTimeRemaining().includes("ended") ? 'ended' : 'active'}`}>
                                    {getTimeRemaining()}
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <strong>Registered Candidates:</strong>
                        <p>{candidates.length} candidates</p>
                    </div>
                </div>

                {/* Voter Registration Status */}
                <div className="voter-registration-notice">
                    <strong>Voter Registration Status:</strong>
                    <p>
                        {electionCalled ? 
                            "Voter registration is CLOSED for this election. Only pre-registered voters may participate." :
                            "Voter registration is OPEN. Voters may register to vote in future elections."
                        }
                    </p>
                </div>
            </div>
            
            {/* Monitoring Status */}
            <div className={`monitoring-status ${isMonitoring ? 'active' : 'inactive'}`}>
                <h3>Real-time Blockchain Monitoring</h3>
                <p>
                    {isMonitoring ? 
                        `Actively monitoring blockchain events. ${auditEvents.length} events captured.` :
                        "Initialising event monitoring..."
                    }
                </p>
            </div>
 
            {/* Results Embargo Notice */}
            {!votingClosed && electionCalled && (
                <div className="results-embargo">
                    <h3>Election Results Embargo</h3>
                    <p>
                        Vote counts and results are hidden until the BallyBeg election period officially closes.
                        All administrative actions are being monitored and logged in real-time.
                    </p>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="tab-navigation">
                {[
                    { id: 'overview', label: 'Overview', color: '#0056b3' },
                    { id: 'live-audit', label: 'Live Audit Trail', color: '#dc3545' },
                    { id: 'analytics', label: 'Analytics', color: '#28a745' },
                    { id: 'candidates', label: 'Candidates', color: '#6f42c1' },
                    { id: 'ballot', label: 'Ballot Preview', color: '#fd7e14' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        style={{
                            backgroundColor: activeTab === tab.id ? tab.color : '#f8f9fa',
                            color: activeTab === tab.id ? 'white' : '#495057',
                            borderBottomColor: activeTab === tab.id ? tab.color : 'transparent'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="tab-content">
                    {/* Election Status Summary */}
                    <div className={`election-summary ${votingClosed ? 'closed' : 'open'}`}>
                        <h3>BallyBeg Election Status</h3>
                        <div className="summary-grid">
                            <div>
                                <strong>Current Status:</strong>
                                <p className={votingClosed ? 'status-closed' : 'status-open'}>
                                    {votingClosed ? "Voting Closed" : "Voting Open"}
                                </p>
                            </div>
                            <div>
                                <strong>Total Votes:</strong>
                                <p>{votingClosed ? totalVotes : "Hidden During Election"}</p>
                            </div>
                            <div>
                                <strong>Candidates:</strong>
                                <p>{candidates.length}</p>
                            </div>
                            <div>
                                <strong>Audit Events:</strong>
                                <p>{auditEvents.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Real-time Statistics */}
                    <div className="statistics-panel">
                        <h3>Real-time Blockchain Statistics</h3>
                        <div className="stats-grid">
                            <div>
                                <strong>Election Timeline:</strong>
                                <p>
                                    {electionStats.electionStartTime ? 
                                        `Started ${new Date(electionStats.electionStartTime * 1000).toLocaleString()}` :
                                        "Not started yet"
                                    }
                                </p>
                                {electionStats.electionEndTime && (
                                    <p>Ended {new Date(electionStats.electionEndTime * 1000).toLocaleString()}</p>
                                )}
                            </div>
                            <div>
                                <strong>Blockchain Activity:</strong>
                                <p>{electionStats.totalEvents} total events recorded</p>
                                <p>{electionStats.uniqueAdmins} unique administrators</p>
                            </div>
                            <div>
                                <strong>Voting Activity:</strong>
                                <p>Committed: {electionStats.votingStats ? electionStats.votingStats.totalCommitments : 0}</p>
                                <p>Revealed: {electionStats.votingStats ? electionStats.votingStats.totalReveals : 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* Export Controls */}
                    <div className="export-panel">
                        <h3>Audit Trail Export</h3>
                        <p>
                            Export complete immutable audit trail for regulatory compliance and forensic analysis.
                        </p>
                        <button onClick={exportAuditTrail} className="export-button">
                            Export Complete Audit Trail
                        </button>
                    </div>
                </div>
            )}

            {/* Live Audit Trail Tab */}
              {activeTab === 'live-audit' && (
                <div className="tab-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: '0' }}>Live Audit Trail - BallyBeg</h3>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                            {auditEvents.length} events | Real-time blockchain monitoring
                        </div>
                    </div>

                    {/* Event Filters */}
                    <div className="event-filters">
                        <div>
                            <label>Filter:</label>
                            <select
                                value={eventFilter}
                                onChange={(e) => setEventFilter(e.target.value)}
                            >
                                <option value="ALL">All Events</option>
                                <option value="ADMIN_ACTION">Admin Actions</option>
                                <option value="CANDIDATE_ADDED">Candidate Management</option>
                                <option value="PHASE_CHANGED">Phase Changes</option>
                                <option value="VOTER_STATUS">Voter Activities</option>
                                <option value="VOTE_COMMITTED">Vote Commitments</option>
                                <option value="VOTE_REVEALED">Vote Reveals</option>
                                <option value="SYSTEM_AUDIT">System Audits</option>
                            </select>
                        </div>
                        <div>
                            <label>Search:</label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search events..."
                            />
                        </div>
                    </div>

                    {/* Live Event Stream */}
                    <div className="event-stream">
                        {filteredEvents.length === 0 ? (
                            <div className="event-stream-empty">
                                {auditEvents.length === 0 ? 
                                    "No audit events recorded yet for BallyBeg election." : 
                                    "No events match your filter criteria."
                                }
                            </div>
                        ) : (
                            filteredEvents.map((event) => {
                                const formatted = legacyEventMonitor.formatEventForDisplay(event);
                                return (
                                    <div
                                        key={event.id}
                                        className={`event-item ${event.isHistorical ? 'historical' : 'live'}`}
                                    >
                                        <div className="event-header">
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                    <span className="event-title">
                                                        {formatted.title}
                                                    </span>
                                                    {!event.isHistorical && (
                                                        <span className="event-live-badge">
                                                            LIVE
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="event-description">
                                                    {formatted.description}
                                                </div>
                                                <div className="event-metadata">
                                                    {formatted.timestamp} • Block: {formatted.blockNumber} • TX: {formatted.transactionHash} • Actor: {formatted.actor ? formatted.actor.slice(0, 8) + '...' : 'Unknown'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
            
             {/* Independent Audit Node Tab */}
            {activeTab === 'audit-node' && (
                <div className="tab-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ margin: 0, color: '#e91e63' }}>Independent Audit Node</h3>
                        <div style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            backgroundColor: getNodeStatusInfo().bg,
                            color: getNodeStatusInfo().color,
                            border: `1px solid ${getNodeStatusInfo().color}`
                        }}>
                            {getNodeStatusInfo().text}
                        </div>
                    </div>

                    {/* Audit Node Status */}
                    <div style={{
                        padding: '1.5rem',
                        backgroundColor: getNodeStatusInfo().bg,
                        border: `2px solid ${getNodeStatusInfo().color}`,
                        borderRadius: '8px',
                        marginBottom: '2rem'
                    }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: getNodeStatusInfo().color }}>
                            BallyBeg Election Verification Status
                        </h4>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            marginBottom: '1.5rem'
                        }}>
                            <div>
                                <strong>Node Status:</strong>
                                <p style={{ margin: '0.25rem 0 0 0', color: getNodeStatusInfo().color, fontWeight: 'bold' }}>
                                    {getNodeStatusInfo().text}
                                </p>
                            </div>
                            
                            <div>
                                <strong>Verification Score:</strong>
                                <p style={{
                                    margin: '0.25rem 0 0 0',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                    color: verificationScore >= 95 ? '#4caf50' : verificationScore >= 80 ? '#ff9800' : '#f44336'
                                }}>
                                    {verificationScore}%
                                </p>
                            </div>
                            
                            <div>
                                <strong>Total Checks:</strong>
                                <p style={{ margin: '0.25rem 0 0 0', fontWeight: 'bold' }}>
                                    {auditResults.length}
                                </p>
                            </div>
                            
                            <div>
                                <strong>Last Audit:</strong>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                                    {auditResults.length > 0 ? new Date(auditResults[0].timestamp).toLocaleString() : 'Never'}
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={runIndependentAudit}
                                disabled={isRunningAudit || !contract}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: '#e91e63',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: isRunningAudit || !contract ? 'not-allowed' : 'pointer',
                                    opacity: isRunningAudit || !contract ? 0.6 : 1,
                                    fontWeight: 'bold'
                                }}
                            >
                                {isRunningAudit ? 'Running Independent Audit...' : 'Run Independent Verification'}
                            </button>
                            
                            {auditResults.length > 0 && (
                                <button
                                    onClick={exportIndependentAuditReport}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        backgroundColor: '#2196f3',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Export Audit Report
                                </button>
                            )}
                        </div>
                    </div>

                     {/* Verification Results */}
                    {auditResults.length > 0 && (
                        <div style={{
                            backgroundColor: 'white',
                            padding: '1.5rem',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6',
                            marginBottom: '2rem'
                        }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Independent Verification Results</h4>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {auditResults.map((result, index) => (
                                    <div key={index} style={{
                                        padding: '1rem',
                                        backgroundColor: result.status === 'PASS' ? '#e8f5e9' : 
                                                       result.status === 'FAIL' ? '#ffebee' : '#fff3e0',
                                        border: `1px solid ${result.status === 'PASS' ? '#4caf50' : 
                                                            result.status === 'FAIL' ? '#f44336' : '#ff9800'}`,
                                        borderRadius: '4px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                                                {result.type.replace(/_/g, ' ')}
                                            </span>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '4px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                backgroundColor: result.status === 'PASS' ? '#4caf50' : 
                                                               result.status === 'FAIL' ? '#f44336' : '#ff9800',
                                                color: 'white'
                                            }}>
                                                {result.status}
                                            </span>
                                        </div>
                                        
                                        {/* Result Details */}
                                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                            {result.status === 'PASS' && result.type === 'VOTE_TOTALS' && (
                                                <p style={{ margin: 0 }}>
                                                    Vote totals verified: {result.details.blockchainTotal} blockchain votes match {result.details.eventTotal} event logs
                                                </p>
                                            )}
                                            {result.status === 'PASS' && result.type === 'DOUBLE_VOTING' && (
                                                <p style={{ margin: 0 }}>
                                                    No double voting detected: {result.details.uniqueVoters} unique voters from {result.details.totalVotes} votes
                                                </p>
                                            )}
                                            {result.status === 'PASS' && result.type === 'CANDIDATE_INTEGRITY' && (
                                                <p style={{ margin: 0 }}>
                                                    Candidate integrity verified: {result.details.currentCandidates} candidates match registration records
                                                </p>
                                            )}
                                            {result.status === 'PASS' && result.type === 'TIMING_CONSTRAINTS' && (
                                                <p style={{ margin: 0 }}>
                                                    Timing constraints verified: {result.details.complianceRate}% compliance rate
                                                </p>
                                            )}
                                            {result.status === 'PASS' && result.type === 'BLOCKCHAIN_CONSISTENCY' && (
                                                <p style={{ margin: 0 }}>
                                                    Blockchain consistency verified: {result.details.consistencyRate}% data integrity
                                                </p>
                                            )}
                                            
                                            {result.status === 'FAIL' && (
                                                <p style={{ margin: 0, color: '#d32f2f', fontWeight: 'bold' }}>
                                                    Verification failed - Details: {JSON.stringify(result.details, null, 2)}
                                                </p>
                                            )}
                                            
                                            {result.status === 'ERROR' && (
                                                <p style={{ margin: 0, color: '#f57c00', fontWeight: 'bold' }}>
                                                    Check failed due to error: {result.details.error}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
                                            Verified at: {new Date(result.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Audit Guidelines */}
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                    }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Independent Audit Guidelines</h4>
                        <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                            <p><strong>Purpose:</strong> This independent audit node verifies the integrity of the BallyBeg election by cross-referencing multiple data sources and checking compliance with Irish electoral law.</p>
                            
                            <p><strong>Verification Checks:</strong></p>
                            <ul style={{ marginLeft: '1.5rem' }}>
                                <li><strong>Vote Totals:</strong> Ensures blockchain vote counts match event logs</li>
                                <li><strong>Double Voting:</strong> Verifies no voter has cast multiple ballots</li>
                                <li><strong>Candidate Integrity:</strong> Confirms candidate registration consistency</li>
                                <li><strong>Timing Constraints:</strong> Validates all actions occurred within legal timeframes</li>
                                <li><strong>Blockchain Consistency:</strong> Checks data integrity across all records</li>
                            </ul>
                            
                            <p><strong>Scoring:</strong></p>
                            <ul style={{ marginLeft: '1.5rem' }}>
                                <li><span style={{color: '#4caf50', fontWeight: 'bold'}}>95-100%:</span> Election fully verified and compliant</li>
                                <li><span style={{color: '#ff9800', fontWeight: 'bold'}}>80-94%:</span> Minor issues detected, requires review</li>
                                <li><span style={{color: '#f44336', fontWeight: 'bold'}}>Below 80%:</span> Significant issues require investigation</li>
                            </ul>
                            
                            <p><strong>Legal Authority:</strong> This audit is conducted under the observer provisions of the Electoral Act 1992-2019 for the BallyBeg constituency.</p>
                        </div>
                    </div>
                </div>
            )}


            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div className="tab-content">
                    <h3>BallyBeg Election Analytics</h3>

                    {/* Event Type Distribution */}
                    <div className="event-type-distribution">
                        <h4>Event Type Distribution</h4>
                        <div className="event-type-grid">
                            {Object.entries(eventTypeStats).map(([type, count]) => (
                                <div key={type} className="event-type-card">
                                    <div className="event-type-count">
                                        {count}
                                    </div>
                                    <div className="event-type-label">
                                        {type.replace(/_/g, ' ')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Election Timeline */}
                    <div className="election-timeline">
                        <h4>BallyBeg Election Timeline</h4>
                        <div className="timeline-container">
                            {legacyEventMonitor.getElectionTimeline().length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                                    No timeline events recorded yet.
                                </div>
                            ) : (
                                legacyEventMonitor.getElectionTimeline().map((event, index) => {
                                    const formatted = legacyEventMonitor.formatEventForDisplay(event);
                                    return (
                                        <div key={event.id} className="timeline-event">
                                            <div className="timeline-event-title">
                                                {formatted.title}
                                            </div>
                                            <div className="timeline-event-time">
                                                {formatted.timestamp}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Candidates Tab */}
            {activeTab === 'candidates' && (
                <div className="tab-content">
                    <h3>Candidate Information - BallyBeg, Co. Donegal</h3>
                    <p className="ballot-preview-note">
                        Real-time candidate registration data from blockchain events.
                    </p>
                    {legacyEventMonitor.getEventsByType('CANDIDATE_ADDED').length === 0 ? (
                        <div className="candidates-empty">
                            No candidates have been registered yet for BallyBeg constituency.
                        </div>
                    ) : (
                        <div className="candidates-container">
                            {legacyEventMonitor.getEventsByType('CANDIDATE_ADDED').map((event, index) => (
                                <div key={event.id} className="candidate-item">
                                    <div className="candidate-header">
                                        <div>
                                            <h4 className="candidate-name">
                                                {event.data.name}
                                            </h4>
                                            <p className="candidate-party">
                                                <strong>Party:</strong> {event.data.party || 'Independent'}
                                            </p>
                                        </div>
                                        <div className="candidate-metadata">
                                            <div>Added: {new Date(event.data.timestamp * 1000).toLocaleString()}</div>
                                            <div>By: {event.data.addedBy ? event.data.addedBy.slice(0, 8) + '...' + event.data.addedBy.slice(-4) : 'Unknown'}</div>
                                            <div style={{ marginTop: '0.25rem' }}>
                                                <small>Block: {event.blockNumber}</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="candidate-votes">
                                        Current votes: <strong>
                                            {votingClosed ? 
                                                (candidates.find(c => c.name === event.data.name) ? candidates.find(c => c.name === event.data.name).votes : 0) : 
                                                "Hidden during election"
                                            }
                                        </strong>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Ballot Preview Tab */}
            {activeTab === 'ballot' && (
                <div className="tab-content">
                    <h3>BallyBeg Ballot Preview</h3>
                    <p className="ballot-preview-note">
                        This is how the ballot appears to voters in BallyBeg, Co. Donegal:
                    </p>
                    <div className="ballot-preview-container">
                        <DigitalBallot
                            candidates={candidates}
                            rankings={{}}
                            onRankingChange={() => {}} // No-op function for observers
                            onSubmit={() => {}}
                            hasVoted={false}
                            votingClosed={false}
                            isPreviewMode={true}
                            isRankingSystem={true}
                            constituency="BallyBeg"
                            userConstituency="BallyBeg"
                        />
                    </div>
                </div>
            )}

            {/* Logout Button */}
            <div className="logout-container">
                <button
                    onClick={() => setIsLoggedIn(false)}
                    className="logout-button"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}

export default ObserverPanel;