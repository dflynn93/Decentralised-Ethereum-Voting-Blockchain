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

function App() {
    const [voteData, setVoteData] = React.useState([...candidates]);
    const [voterId, setVoterId] = React.useState('');
    const [pin, setPin] = React.useState('');
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);
    const [hasVoted, setHasVoted] = React.useState(false);
    const [showResults, setShowResults] = React.useState(false);

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

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Simple Voting</h1>
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

            {!isLoggedIn ? (
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
            ) : (
                <div>
                    <p>Welcome, voter {voterId}!</p>
                    <ul>
                        {voteData.map((c) => (
                            <li key={c.id}>
                                {c.name} - {c.votes} votes
                                <button onClick={() => castVote(c.id)}
                                style={{ marginLeft: '1rem' }}
                                disabled={hasVoted}
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
        </div>
    );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
