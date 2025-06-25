import React, { useState } from "react";
import DigitalBallot from "../src/DigitalBallot";

const observerAccounts = {
    201: 'obs1',
    202: 'obs2'
};

function ObserverPanel({ candidates, votingClosed, electionLog = [] }) {
    const [observerId, setObserverId] = useState('');
    const [observerPin, setObserverPin] = useState('');                 
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);

    // Calculate election statistics
    const calculateElectionStats = () => {
        const votingOpenedEvent = electionLog.find(e => e.eventType === 'voting_opened');
        const votingClosedEvent = electionLog.find(e => e.eventType === 'voting_closed');
        
        const stats = {
            electionStartTime: votingOpenedEvent?.timestamp || null,
            electionEndTime: votingClosedEvent?.timestamp || null,
            electionDuration: null,
            candidatesAdded: electionLog.filter(e => e.eventType === 'candidate_added').length,
            adminActions: electionLog.length,
            uniqueAdmins: [...new Set(electionLog.map(e => e.adminAddress))].filter(addr => addr).length
        };

        if (stats.electionStartTime && stats.electionEndTime) {
            const start = new Date(stats.electionStartTime);
            const end = new Date(stats.electionEndTime);
            const durationMs = end - start;
            
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            
            stats.electionDuration = `${hours}h ${minutes}m`;
        } else if (stats.electionStartTime && !stats.electionEndTime) {
            const start = new Date(stats.electionStartTime);
            const now = new Date();
            const durationMs = now - start;
            
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            
            stats.electionDuration = `${hours}h ${minutes}m (ongoing)`;
        }

        return stats;
    };

    const formatAdminAddress = (address) => {
        if (!address) return 'Unknown Admin';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatEventType = (eventType) => {
        const eventMap = {
            'candidate_added': '👤 Candidate Added',
            'voting_opened': '🗳️ Voting Opened',
            'voting_closed': '🔒 Voting Closed',
            'election_created': '📋 Election Created'
        };
        return eventMap[eventType] || eventType;
    };

    const formatEventDetails = (event) => {
        switch (event.eventType) {
            case 'candidate_added':
                return `${event.details.candidateName} (${event.details.candidateParty || 'Independent'})`;
            case 'voting_opened':
                return 'Election voting period began';
            case 'voting_closed':
                return 'Election voting period ended';
            default:
                return 'Election activity';
        }
    };

    const electionStats = calculateElectionStats();

    return (
        <div style={{ marginTop: '2rem'}}>
            <h2>Observer Panel</h2>

            {!isLoggedIn ? (
                <div style={{
                    padding: '2rem',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa',
                    maxWidth: '400px'
                }}>
                    <h3 style={{ marginTop: '0' }}>Observer Login</h3>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem'}}>
                            Observer ID:
                            <input 
                                type="text"
                                value={observerId}
                                onChange={(e) => setObserverId(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    marginTop: '0.25rem',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px'
                                }}
                            />
                        </label>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem'}}>
                            PIN:
                            <input 
                                type="password"
                                value={observerPin}
                                onChange={(e) => setObserverPin(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    marginTop: '0.25rem',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px'
                                }}
                            />
                        </label>                    
                    </div>
                    <button
                        onClick={() => {
                            if (observerAccounts[observerId] === observerPin) {
                                setIsLoggedIn(true);
                                alert("Observer login successful.");
                            } else {
                                alert("Invalid credentials.");
                            }
                        }}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            backgroundColor: '#0056b3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Login as Observer
                    </button>
                    <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666'}}>
                        <strong>Test Credentials</strong><br/>
                        ID: 201, PIN: obs1<br/>
                        ID: 202, PIN: obs2
                    </div>
                </div>
            ) : (
                <div>
                    {/* Results Embargo Notice */}
                    {!votingClosed && (
                        <div style={{
                            padding: "1.5rem",
                            backgroundColor: "#fff3cd",
                            border: "2px solid #ffc107",
                            borderRadius: "8px",
                            marginBottom: "2rem",
                            textAlign: "center"
                        }}>
                            <h3 style={{ color: "#856404", margin: "0 0 0.5rem 0" }}>
                                Election Results Embargo
                            </h3>
                            <p style={{ color: "#856404", margin: "0", fontWeight: "bold" }}>
                                Vote counts and results are hidden until the election period officially closes.
                                This ensures electoral integrity and prevents influence on ongoing voting.
                            </p>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div style={{
                        marginBottom: '2rem',
                        borderBottom: '2px solid #dee2e6'
                    }}>
                        <div style={{ display: 'flex', gap: '0' }}>
                            {[
                                { id: 'overview', label: '📊 Overview' },
                                { id: 'candidates', label: '👥 Candidates' },
                                { id: 'activity', label: '📋 Activity Log' },
                                { id: 'ballot', label: '🗳️ Ballot Preview' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        padding: '1rem 1.5rem',
                                        border: 'none',
                                        backgroundColor: activeTab === tab.id ? '#0056b3' : '#f8f9fa',
                                        color: activeTab === tab.id ? 'white' : '#495057',
                                        cursor: 'pointer',
                                        borderRadius: '8px 8px 0 0',
                                        fontWeight: activeTab === tab.id ? 'bold' : 'normal'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div>
                            {/* Election Status */}
                            <div style={{
                                marginBottom: '2rem',
                                padding: '1.5rem',
                                border: '1px solid #ccc',
                                backgroundColor: votingClosed ? '#ffebee' : '#e8f5e9',
                                borderRadius: '8px'
                            }}>
                                <h3 style={{ margin: "0 0 1rem 0", color: '#333'}}>Election Status</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <strong>Current Status:</strong>
                                        <p style={{ margin: "0.5rem 0 0 0", color: votingClosed ? '#d32f2f' : '#388e3c', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                            {votingClosed ? " Voting Closed" : " Voting Open"}
                                        </p>
                                    </div>
                                    <div>
                                        <strong>Total Votes:</strong>
                                        <p style={{ margin: "0.5rem 0 0 0", fontSize: '1.1rem', fontWeight: 'bold' }}>
                                            {votingClosed ? totalVotes : "Hidden During Election"}
                                        </p>
                                    </div>
                                    <div>
                                        <strong>Candidates:</strong>
                                        <p style={{ margin: "0.5rem 0 0 0", fontSize: '1.1rem', fontWeight: 'bold' }}>
                                            {candidates.length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Election Timeline */}
                            <div style={{
                                marginBottom: '2rem',
                                padding: '1.5rem',
                                border: '1px solid #ccc',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px'
                            }}>
                                <h3 style={{ margin: "0 0 1rem 0"}}>Election Timeline</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <strong>Election Started:</strong>
                                        <p style={{ margin: "0.5rem 0 0 0" }}>
                                            {electionStats.electionStartTime ? 
                                                new Date(electionStats.electionStartTime).toLocaleString() : 
                                                'Not started yet'
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <strong>Election Duration:</strong>
                                        <p style={{ margin: "0.5rem 0 0 0" }}>
                                            {electionStats.electionDuration || 'Not determined'}
                                        </p>
                                    </div>
                                    <div>
                                        <strong>Admin Actions:</strong>
                                        <p style={{ margin: "0.5rem 0 0 0" }}>
                                            {electionStats.adminActions} total
                                        </p>
                                    </div>
                                    <div>
                                        <strong>Active Admins:</strong>
                                        <p style={{ margin: "0.5rem 0 0 0" }}>
                                            {electionStats.uniqueAdmins}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Results Summary - Hidden During Election */}
                            <div style={{
                                padding: '1.5rem',
                                border: '1px solid #ccc',
                                backgroundColor: '#fff',
                                borderRadius: '8px'
                            }}>
                                <h3 style={{ margin: "0 0 1rem 0"}}>Results Summary</h3>
                                {!votingClosed ? (
                                    <div style={{
                                        padding: '2rem',
                                        backgroundColor: '#f8f9fa',
                                        border: '2px dashed #ccc',
                                        borderRadius: 'center'
                                    }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>Locked</div>
                                        <h4 style={{ color: '#666', margin: '0 0 0.5rem 0'}}>
                                            Results Sealed Until Election Closes
                                        </h4>
                                        <p style={{ color: '#666', margin: '0', fontSize: '0.9rem' }}>
                                            Vote counts and candidate rankings will be revealed once the election period officially ends.
                                            This protects the integrity of the democratic process.
                                        </p>
                                    </div>
                
                                ) : candidates.length === 0 ? (
                                    <p style={{ color: '#666', fontStyle: 'italic' }}>No candidates registered yet.</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        {candidates
                                            .sort((a, b) => b.votes - a.votes)
                                            .slice(0, 3)
                                            .map((candidate, index) => (
                                                <div key={candidate.id} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    padding: '0.75rem',
                                                    backgroundColor: index === 0 ? '#e8f5e9' : '#f8f9fa',
                                                    borderRadius: '4px',
                                                    border: index === 0 ? '1px solid #4caf50' : '1px solid #dee2e6'
                                                }}>
                                                    <span>
                                                        {index === 0 && '🏆 '}
                                                        <strong>{candidate.name}</strong> ({candidate.party || 'Independent'})
                                                    </span>
                                                    <span style={{ fontWeight: 'bold' }}>
                                                        {candidate.votes} votes
                                                        {totalVotes > 0 && (
                                                            <> ({((candidate.votes / totalVotes) * 100).toFixed(1)}%)</>
                                                        )}
                                                    </span>
                                                </div>
                                            ))
                                        }
                                        {candidates.length > 3 && (
                                            <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                                                ...and {candidates.length - 3} more candidates
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Candidates Tab */}
                    {activeTab === 'candidates' && (
                        <div>
                            <h3>Candidate Registration Details</h3>
                            {electionLog.filter(e => e.eventType === 'candidate_added').length === 0 ? (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>No candidates have been added yet.</p>
                            ) : (
                                <div style={{
                                    border: '1px solid #ccc',
                                    borderRadius: '8px',
                                    backgroundColor: '#fff'
                                }}>
                                    {electionLog
                                        .filter(e => e.eventType === 'candidate_added')
                                        .map((event, index) => (
                                            <div
                                                key={event.id}
                                                style={{
                                                    padding: '1.5rem',
                                                    borderBottom: index < electionLog.filter(e => e.eventType === 'candidate_added').length - 1 ? '1px solid #dee2e6' : 'none'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                    <div>
                                                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#0056b3' }}>
                                                            {event.details.candidateName}
                                                        </h4>
                                                        <p style={{ margin: '0', color: '#666' }}>
                                                            <strong>Party:</strong> {event.details.candidateParty || 'Independent'}
                                                        </p>
                                                    </div>
                                                    <div style={{ textAlign: 'right', fontSize: '0.9rem', color: '#666' }}>
                                                        <div>Added: {new Date(event.timestamp).toLocaleString()}</div>
                                                        <div>By: {formatAdminAddress(event.adminAddress)}</div>
                                                        {event.details.txHash && (
                                                            <div style={{ marginTop: '0.25rem' }}>
                                                                <small>TX: {event.details.txHash.slice(0, 10)}...</small>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.9rem', color: '#28a745' }}>
                                                    Current votes: <strong>
                                                        {votingClosed ?
                                                            (candidates.find(c => c.name === event.details.candidateName)?.votes || 0) :
                                                            'Hidden'
                                                        }
                                                    </strong>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    )}

                    {/* Activity Log Tab */}
                    {activeTab === 'activity' && (
                        <div>
                            <h3>Complete Election Activity Log</h3>
                            {electionLog.length === 0 ? (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>No election activity recorded yet.</p>
                            ) : (
                                <div style={{
                                    maxHeight: '500px',
                                    overflowY: 'auto',
                                    border: '1px solid #ccc',
                                    borderRadius: '8px',
                                    backgroundColor: '#fff'
                                }}>
                                    {electionLog
                                        .slice()
                                        .reverse()
                                        .map((event, index) => (
                                            <div
                                                key={event.id}
                                                style={{
                                                    padding: '1rem',
                                                    borderBottom: index < electionLog.length - 1 ? '1px solid #dee2e6' : 'none',
                                                    backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#fff'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                            <span style={{ fontSize: '1rem', fontWeight: 'bold', marginRight: '0.5rem' }}>
                                                                {formatEventType(event.eventType)}
                                                            </span>
                                                            <span style={{ fontSize: '0.9rem', color: '#666' }}>
                                                                {new Date(event.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div style={{ color: '#495057', marginBottom: '0.25rem' }}>
                                                            {formatEventDetails(event)}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                                                            Admin: {formatAdminAddress(event.adminAddress)}
                                                            {event.details.txHash && (
                                                                <> • TX: {event.details.txHash.slice(0, 12)}...</>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ballot Preview Tab */}
                    {activeTab === 'ballot' && (
                        <div>
                            <h3>Ballot Preview</h3>
                            <p style={{ color: "#666", marginBottom: "1rem" }}>
                                This is how the ballot appears to voters:
                            </p>
                            <DigitalBallot
                                candidates={candidates}
                                rankings={{}}
                                onRankingChange={() => {}} // No-op function for observers
                                onSubmit={() => {}}
                                hasVoted={false}
                                votingClosed={false}
                                isPreviewMode={true}
                                isRankingSystem={true}
                            />
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <button
                            onClick={() => setIsLoggedIn(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        > 
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );            
}

export default ObserverPanel;