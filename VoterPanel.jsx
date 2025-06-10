import React, { useState} from "react";

const VoterPanel = React.memo(({ candidates, hasVoted, onSubmitRanking, votingClosed }) => {
    const [rankings, setRankings] = useState({});
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(null); // true = green, false = red

    const handleRankingChange = (candidateId, rank) => {
        const newRankings = { ...rankings };
        // Prevent duplicate rankings
        for (const id in newRankings) {
            if (newRankings[id] === rank) {
                delete newRankings[id]; // Remove existing rank if it's the same
            }
        }
       newRankings[candidateId] = rank;
        setRankings(newRankings);
        };

        const handleSubmit = async () => {
              try {
                    const cleanedRanks = Object.entries(rankings)
                    .sort((a, b) => a[1] - b[1])
                    .map(([id]) => parseInt(id));
                    await onSubmitRanking(cleanedRanks);
                    setMessage("Vote submitted successfully.");
                    setSuccess(true);
                } catch (error) {
                    console.error("Error submitting rankings:", error);
                    setMessage("Failed to submit rankings. Please try again.");
                    setSuccess(false);
                }
            };

            if (votingClosed) {
                return (
                    <div style={{ marginTop: "2rem"}}>
                        <h2>Voter Panel</h2>
                        <div style={{
                            padding: "1rem",
                            border: "1px solid #f5c6cb",
                            backgroundColor: "#f8d7da",
                            borderRadius: "4px"
                        }}>
                            <p style={{ color: "#721c24", margin: "0" }}>
                                The voting period is closed. No votes can be submitted at this time.
                        </p>
                    </div>
                </div>
                );
            }

            if (hasVoted) {
                return (
                <div style={{ marginTop: "2rem" }}>
                    <h2>Voter Panel</h2>
                    <div style={{
                        padding: "1rem",
                        border: "1px solid #c3e6cb",
                        backgroundColor: "#d4edda",
                        borderRadius: "4px"
                    }}>
                        <p style={{ color: "#155724", margin: "0" }}>
                            You have already voted. Thank you for your participation!
                        </p>
                    </div>
                    </div>
                );
            }

    // Main voting interface    
    return (
        <div className="voter-panel">
            <h2>Rank Your Candidates (1 is highest)</h2>
            {candidates.length === 0 ? (
                <p>No candidates available to vote for.</p>
            ) : (
                <>
                    {candidates.map((candidate) => (
                        <div key={candidate.id} style={{ marginBottom: '1rem' }}>
                            <label>
                                {candidate.name} ({candidate.party}):
                                <input
                                    type="number"
                                    min="1"
                                    max={candidates.length}
                                    value={rankings[candidate.id] || ""}
                                    onChange={(e) => handleRankingChange(candidate.id, parseInt(e.target.value))}
                                style={{ marginLeft: '0.5rem', width: '60px' }}
                                />  
                    </label>
                </div>
            ))}
           
            <button onClick={handleSubmit} style={{ marginTop: '15px'}}>
                Submit Ranked Vote
            </button>
            </>
            )}
            {message && (
                <p style={{ color: success ? "green" : "red", marginTop: "1rem"}}>
                    {message}
                    </p>
    )}
        </div>
    );
});

export default VoterPanel;
