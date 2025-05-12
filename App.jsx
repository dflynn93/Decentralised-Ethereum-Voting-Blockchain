// App/jsx
const {useState} = React;

const candidates = [
    { id: 1, name: 'Adam', votes: 0 },
    { id: 2, name: 'Ben', votes: 0 }
];

const voterAccounts = {
    101: '1234',
    102: '5678',
    103: 'abcd',
};

const observerAccounts = {
    201: 'obs1',
    202: 'obs2'
};

function App() {
    const [voteData, setVoteData] = React.useState([...candidates]);
    const [voterId, setVoterId] = React.useState('');
    const [pin, setPin] = React.useState('');
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);
    const [hasVoted, setHasVoted] = React.useState(false);
    const [showResults, setShowResults] = React.useState(false);

    const [observerId, setObserverId] = useState('');
    const [observerPin, setObserverPin] = useState('');
    const [observerLoggedIn, setObserverLoggedIn] = useState(false);

    const [newCandidateName, setNewCandidateName] = useState('');
    const [newCandidateParty, setNewCandidateParty] = useState('');

    const [walletAddress, setWalletAddress] = useState('');

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setWalletAddress(accounts[0]);
                alert('Wallet connected!');
            } catch (error) {
                alert('Connection failed. ');
                console.error(error);
            }
        } else {
            alert('MetaMask not detected.');
        }
    };

    const castVote = (id) => {
        const updated = voteData.map((c) =>
        c.id === id ? { ...c, votes: c.votes + 1 } : c
    );
    setVoteData(updated);
    localStorage.setItem(`voted_${voterId}`, 'true');
    setHasVoted(true);
    };

    const downloadResults = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(voteData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "voting_results.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    const resetElection = () => {
        localStorage.clear();
        setVoteData([...candidates]); //Reset votes in state
        setIsLoggedIn(false); //log out voter
        setHasVoted(false); // Reset vote block
        alert('Election has been reset!');
    };

    const clearVoterHistory = () => {
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith("voted_")) {
                localStorage.removeItem(key);
            }
        });
        a;ErrorEvent('Voter history cleared');
    };

    const simulateVotes = () => {
        const simulated = voteData.map(c => ({
            ...c,
            votes: Math.floor(Math.random() * 100)
        }));
        setVoteData(simulated);
        alert('Simulated vote data generated!');
    }

    const addCandidate = () => {
        if (!newCandidateName || !newCandidateParty) {
            alert('Please enter both name and party.');
            return;
        }

        const newId = voteData.length + 1;

        const newCandidate = {
            id: newId,
            name: newCandidateName,
            party: newCandidateParty,
            votes: 0
        };

        setVoteData([...voteData, newCandidate]);
        setNewCandidateName('');
        setNewCandidateParty('');
        alert(`Candidate ${newCandidateName} added!`);
    };

    

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Simple Voting</h1>

            {!walletAddress ? (
                <button onClick={connectWallet}>Connect Wallet</button>
            ) : (
                <p>Connected WalletL {walletAddress}</p>
            )}

            <button onClick={resetElection} style={{ marginLeft: '1rem', backgroundColor: 'red' }}>
                Reset Election
            </button>
            <button onClick={simulateVotes} style={{ marginLeft: '1rem' }}>
                Simulate Votes
            </button>
            <button onClick={clearVoterHistory} style={{ marginLeft: '1rem' }}>
                Clear Voter History
            </button>
            <button onClick={() => setShowResults(!showResults)}>
                {showResults ? 'Hide Results' : 'View Results'}
            </button>
            
            {showResults && (
                <div style={{ marginTop: '2rem' }}>
                    <h3>Live Results</h3>
                    <ul>
                        {voteData.map((c) => (
                            <li key={c.id}>
                                {c.name} - {c.votes} votes
                            </li>
                        ))}
                    </ul>

                    <hr />

                    {(() => {
                        const max = Math.max(...voteData.map(c => c.votes));
                        const winners = voteData.filter(c => c.votes === max);
                        return winners.length === 1 ? (
                            <p>Winner: {winners[0].name}</p>
                        ) : (
                            <div>
                                <p> It's a tie between:</p>
                            <ul>
                                {winners.map((w) => (
                                    <li key={w.id}>{w.name}</li>
                                ))}
                            </ul>
                            </div>
                        );
                    })()}
                    </div>
            )}

            {!isLoggedIn && (
                <div>
                    <h3>Voter Login</h3>
                    <label>
                        Voter ID:
                        <input
                        type="text"
                        value={voterId}
                        onChange={(e) => setVoterId(e.target.value)}
                        />
                    </label>
                    <br />
                    <label>
                        PIN:
                        <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        />
                    </label>
                    <br />
                    <button
                    onClick={() => {
                        if (voterAccounts[voterId] === pin) {
                            setIsLoggedIn(true);
                            setHasVoted(localStorage.getItem(`voted_${voterId}`) === 'true');
                            alert('Login successful!');
                        } else {
                            alert('Invalid credentials.');
                        }

                    }}
                >
                    Login
                </button>
                </div>     
            )} 
            {isLoggedIn && (
                <div>
                    <p>Welcome, voter {voterId}!</p>
                    <ul>
                        {voteData.map((c) => (
                            <li key={c.id}>
                                {c.name} - {c.votes} votes
                                <button onClick={() => castVote(c.id)}
                                style={{ marginLeft: '1rem' }}
                                disabled={hasVoted || !walletAddress}
                                > Vote
                                </button>

                            </li>
                        ))}
                    </ul>
                    <button onClick={downloadResults} style={{ marginTop: '1rem' }}>
                        Download Results
                    </button>
                 </div>
            )}

                    {!observerLoggedIn && (
                        <div style={{ marginTop: '2rem'}}>
                            <h3>Observer Login</h3>
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
                                            setObserverLoggedIn(true);
                                            alert('Observer logged in!');
                                        } else {
                                            alert('Invalid observer credentials.');
                                    }
                                }}
                                >
                                    Login as Observer
                                </button>
                                </div>
                    )}

                    {observerLoggedIn && (
                        <div style={{ marginTop: '2rem' }}>
                            <h3>Observer View: Live Results</h3>
                            <ul>
                                {voteData.map((c) => (
                                    <li key={c.id}>
                                        {c.name} - {c.votes} votes
                                    </li>
                                ))}
                            </ul>
                            </div>
                    )}

                    <div style={{ marginTop: '2rem' }}>
                        <h3>Admin Panel</h3>
                        <label>
                            Candidate Name:
                            <input
                                type="text"
                                value={newCandidateName}
                                onChange={(e) => setNewCandidateName(e.target.value)}
                                />                            
                        </label>
                        < br />
                        <label>
                            Party:
                            <input 
                            type="text"
                            value={newCandidateParty}
                            onChange={(e) => setNewCandidateParty(e.target.value)}
                            />
                        </label>
                        <br />
                        <button onClick={addCandidate}>Add Candidate</button>
                    </div>
        </div>
    );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
