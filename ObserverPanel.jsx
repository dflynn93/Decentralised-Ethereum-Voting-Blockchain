import React, {useState} from "react";

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
            <>
             <label>
                 Observer ID:
                    <input 
                        type="text"
                        value={observerId}
                        onChange={(e) => setObserverId(e.target.value)}
                     />
                                </label>
                                <br />
                                <label>
                                    PIN:
                                    <input 
                                        type="password"
                                        value={observerPin}
                                        onChange={(e) => setObserverPin(e.target.value)}
                                    />
                                </label>
                                <br />
                                <button
                                    onClick={() => {
                                        if (observerAccounts[observerId] === observerPin) {
                                            setIsLoggedIn(true);
                                            alert("Observer login successful.");
                                        } else {
                                            alert("Invalid credentials.");
                                    }
                                }}
                                >
                                    Login
                                </button>
                                </>
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
                        }}>
                            {votingHistory.slice(-5).reverse().map((entry, index) => (
                                <div key={index} style={{ marginBottom: '0.5rem', fontSize: '0.9rem'}}>
                                    <strong>{entry.timestamp}</strong> Voting {enter.action} by {entry.admin.slice(0, 6)}...{entry.admin.slice(-4)}:
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                  <h2>Live Results</h2>
                            <ul>
                                {candidates.map((c) => (
                                    <li key={c.id}>
                                        {c.name} - {c.votes} votes
                                        {totalVotes > 0 && (
                                            <> ({((c.votes / totalVotes) * 100).toFixed(1)}%)</>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            </div>
                    )}
              </div>
         );            
}

export default ObserverPanel;
       


       



