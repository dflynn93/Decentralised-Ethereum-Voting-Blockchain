import React, { useState} from "react";
import DigitalBallot from "./DigitalBallot";

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

                    <DigitalBallot
                        candidates={candidates}
                        rankings={rankings}
                        onRankingChange={() => {}} // Disabled for closed voting
                        onSubmit={() => {}}
                        hasVoted={hasVoted}
                        votingClosed={true}
                        isPreviewMode={false}
                        isRankingSystem={true}
                    />
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

                    <DigitalBallot
                        candidates={candidates}
                        rankings={rankings}
                        onRankingChange={() => {}} // Disabled for closed voting
                        onSubmit={() => {}}
                        hasVoted={true}
                        votingClosed={votingClosed}
                        isPreviewMode={false}
                        isRankingSystem={true}
                    />
                </div>
            );
        }

    // Main voting interface    
    return (
        <div className="voter-panel">
            <h2>Voter Panel</h2>
            <div style={{
                padding: "1rem",
                backgroundColor: "#e3f2fd",
                border: "1px solid #2196f3",
                borderRadius: "4px",
                marginBottom: "1rem"
            }}>
                <h3 style={{ color: "#1976d2", margin: "0 0 0.5rem 0" }}>Ready to Vote</h3>
                <p style={{ margin: "0", color: "#666" }}>
                    Rank your preferred candidates below (1 = highest preference).
                </p>
            </div>

            <DigitalBallot 
                candidates={candidates}
                rankings={rankings}
                onRankingChange={handleRankingChange}
                onSubmit={handleSubmit}
                hasVoted={hasVoted}
                votingClosed={votingClosed}
                isPreviewMode={false}
                isRankingSystem={true}
            />

            {message && (
                <div style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    backgroundColor: success ? "#d4edda" : "#f8d7da",
                    border: `1px solid ${success ? "#c3e6cb" : "#f5c6cb"}`,
                    borderRadius: "4px"
                }}>
                    <p style={{ 
                        color: success ? "#155724" : "#721c24", 
                        margin: "0",
                        fontWeight: "bold"
                    }}>
                        {message}
                    </p>
                </div>
            )}
        </div>
    );
});

export default VoterPanel;


