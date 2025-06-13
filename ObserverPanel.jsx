import React, {useState} from "react";
import DigitalBallot from "./DigitalBallot";

const observerAccounts = {
    201: 'obs1',
    202: 'obs2'
};

function ObserverPanel({ candidates, votingClosed, votingHistory }) {
    const [observerId, setObserverId] = useState('');
    const [observerPin, setObserverPin] = useState('');                 
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);

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
                    <label style={{ display : 'block', marginBottom: '0.5rem'}}>
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
                {/* Voting Status */}
                <div style={{
                    marginBottom: '2rem',
                    padding: '1rem',
                    border: '1px solid #ccc',
                    backgroundColor: votingClosed ? '#ffebee' : '#e8f5e9',
                    borderRadius: '4px'
                }}>
                    <h3 style={{ margin: "0 0 0.5rem 0"}}>Election Status</h3>
                    <p style={{ margin: "0", color: votingClosed ? 'red' : 'green'}}>
                        <strong>{votingClosed ? "Voting is closed." : "Voting is open."}</strong>
                    </p>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", color: "#666"}}>
                        Total votes cast: <strong>{totalVotes}</strong>
                    </p>
                </div>

                {/* Voting History */}
                {votingHistory && votingHistory.length > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                        <h3>Voting Activity</h3>
                        <div style={{
                            maxHeight: '150px',
                            overflowY: 'auto',
                            border: '1px solid #ccc',
                            padding: '0.5rem',
                            backgroundColor: '#fafafa',
                            borderRadius: '4px'
                        }}>
                            {votingHistory.slice(-5).reverse().map((entry, index) => (
                                <div key={index} style={{ marginBottom: '0.5rem', fontSize: '0.9rem'}}>
                                    <strong>{entry.timestamp}</strong> Voting {entry.action} by {entry.admin.slice(0, 6)}...{entry.admin.slice(-4)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Live Results */}
                <div style={{ marginBottom: '2rem' }}>
                    <h3>Live Results</h3>
                    {candidates.length === 0 ? (
                        <p style={{ color: '#666' }}>No candidates registered yet.</p>
                    ) : (
                        <div style={{
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            backgroundColor: '#f8f9fa'
                        }}>
                            {candidates.map((c, index) => (
                                <div
                                    key={c.id}
                                    style={{
                                        padding: '1rem',
                                        borderBottom: index < candidates.length - 1 ? '1px solid #dee2e6' : 'none',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <strong>{c.name}</strong> ({c.party || 'Independent'})
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            {c.votes} votes
                                        </div>
                                        {totalVotes > 0 && (
                                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                                {((c.votes / totalVotes) * 100).toFixed(1)}%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ballot Preview */}
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


       



