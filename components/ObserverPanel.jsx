import React, { useState, useEffect } from "react";
import DigitalBallot from "../src/DigitalBallot.jsx";
import legacyEventMonitor from "../utils/LegacyEventMonitor.js";
import "./ObserverPanel.css";

const observerAccounts = {
    201: 'obs1',
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

    // Audit node state 
    const [isRunningAudit, setIsRunningAudit] = useState(false);
    const [nodeStatus, setNodeStatus] = useState('offline');
    const [auditResults, setAuditResults] = useState([]);

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

    // Audit Functions
    const runIndependentAudit = async () => {
        setIsRunningAudit(true);
        
        try {
            console.log("Running basic audit check...");
            
            // Checks
            const checks = [];
            
            // Candidate count check
            const candidateCheck = candidates.length > 0 ? 'PASS' : 'FAIL';
            checks.push({
                name: 'Candidate Count',
                status: candidateCheck,
                info: `${candidates.length} candidates found`
            });
            
            // Event count check  
            const eventCheck = auditEvents.length > 0 ? 'PASS' : 'FAIL';
            checks.push({
                name: 'Event Monitoring',
                status: eventCheck,
                info: `${auditEvents.length} events recorded`
            });
            
            setAuditResults(checks);
            setNodeStatus('completed');
            
        } catch (error) {
            console.error('Audit failed:', error);
            setNodeStatus('error');
        } finally {
            setIsRunningAudit(false);
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

    // Election Status Component
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
                        ID: 201, PIN: obs1
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
                    { id: 'audit-node', label: 'Basic Audit', color: '#e91e63' },
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
                                <p>{votingClosed ? candidates.reduce((sum, c) => sum + (c.votes || 0), 0) : "Hidden During Election"}</p>
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
            
            {/* Basic Audit Tab */}
            {activeTab === 'audit-node' && (
                <div className="tab-content">
                    <h3>Basic Audit Check</h3>
                    
                    <div style={{ padding: '1rem', border: '1px solid #ccc', marginBottom: '1rem' }}>
                        <h4>Audit Status: {nodeStatus}</h4>
                        <p>Run basic checks on the election data</p>
                        
                        <button
                            onClick={runIndependentAudit}
                            disabled={isRunningAudit}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: isRunningAudit ? '#ccc' : '#007bff',
                                color: 'white',
                                border: 'none',
                                cursor: isRunningAudit ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isRunningAudit ? 'Running...' : 'Run Basic Audit'}
                        </button>
                    </div>

                    {/* Results */}
                    {auditResults.length > 0 && (
                        <div style={{ padding: '1rem', border: '1px solid #ccc' }}>
                            <h4>Audit Results</h4>
                            {auditResults.map((result, index) => (
                                <div key={index} style={{ 
                                    padding: '0.5rem', 
                                    margin: '0.5rem 0',
                                    backgroundColor: result.status === 'PASS' ? '#d4edda' : '#f8d7da',
                                    border: '1px solid #ccc'
                                }}>
                                    <strong>{result.name}:</strong> {result.status}
                                    <br />
                                    <small>{result.info}</small>
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