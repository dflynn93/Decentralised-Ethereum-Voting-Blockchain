import React, {useState} from "react";

const observerAccounts = {
    201: 'obs1',
    202: 'obs2'
};

function ObserverPanel({ candidates }) {
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

       



