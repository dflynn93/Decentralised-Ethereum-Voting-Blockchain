import React, { useState, useEffect} from "react";
import DigitalBallot from "../src/DigitalBallot";

const VoterPanel = React.memo(({ candidates, hasVoted, onSubmitRanking, votingClosed, walletAddress }) => {
    const [rankings, setRankings] = useState({});
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
    const [pendingVote, setPendingVote] = useState(null);

    // Vote recovery - check for interrupted votes on component mount
    useEffect(() => {
        const checkForPendingVote = () => {
            const pendingVoteKey = `pendingVote_${walletAddress}`;
            const storedVote = localStorage.getItem(pendingVoteKey);
            
            if (storedVote && !hasVoted) {
                const voteData = JSON.parse(storedVote);
                // Check if the pending vote is recent (within last 30 minutes)
                const voteTime = new Date(voteData.timestamp);
                const now = new Date();
                const minutesSince = (now - voteTime) / (1000 * 60);
                
                if (minutesSince < 30) {
                    setPendingVote(voteData);
                    setRankings(voteData.rankings);
                    setMessage("We found an interrupted vote from your previous session. Your rankings have been restored.");
                    setSuccess(null);
                }
            }
        };

        checkForPendingVote();
    }, [walletAddress, hasVoted]);

    const handleRankingChange = (candidateId, rank) => {
        const newRankings = { ...rankings };
        // Prevent duplicate rankings
        for (const id in newRankings) {
            if (newRankings[id] === rank) {
                delete newRankings[id];
            }
        }
        newRankings[candidateId] = rank;
        setRankings(newRankings);

        // Save to localStorage for recovery
        const pendingVoteKey = `pendingVote_${walletAddress}`;
        localStorage.setItem(pendingVoteKey, JSON.stringify({
            rankings: newRankings,
            timestamp: new Date().toISOString(),
            walletAddress: walletAddress
        }));
    };

    const handleSubmit = async () => {
        // Validate rankings
        const rankedCandidates = Object.keys(rankings).length;
        if (rankedCandidates === 0) {
            setMessage("Please rank at least one candidate before submitting.");
            setSuccess(false);
            return;
        }

        // Show final confirmation modal
        setShowFinalConfirmation(true);
    };

    const confirmFinalSubmission = async () => {
        setShowFinalConfirmation(false);
        setIsSubmitting(true);
        
        try {
            const cleanedRanks = Object.entries(rankings)
                .sort((a, b) => a[1] - b[1])
                .map(([id]) => parseInt(id));
            
            await onSubmitRanking(cleanedRanks);
            
            // Clear pending vote from localStorage
            const pendingVoteKey = `pendingVote_${walletAddress}`;
            localStorage.removeItem(pendingVoteKey);
            
            // Show success message with formal confirmation
            setMessage("");
            setSuccess(true);
            
        } catch (error) {
            console.error("Error submitting rankings:", error);
            setMessage("Failed to submit rankings. Please try again.");
            setSuccess(false);
        } finally {
            setIsSubmitting(false);
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
                    onRankingChange={() => {}}
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
                
                {/* Formal Thank You Message */}
                <div style={{
                    padding: "2rem",
                    border: "2px solid #28a745",
                    backgroundColor: "#d4edda",
                    borderRadius: "8px",
                    textAlign: "center",
                    marginBottom: "2rem"
                }}>
                    <h3 style={{ color: "#155724", margin: "0 0 1rem 0", fontSize: "1.5rem" }}>
                        🗳️ Vote Successfully Recorded
                    </h3>
                    <div style={{ color: "#155724", fontSize: "1.1rem", lineHeight: "1.6" }}>
                        <p style={{ margin: "0 0 1rem 0" }}>
                            <strong>On behalf of the Electoral Commission, we would like to thank you for voting in this election.</strong>
                        </p>
                        <p style={{ margin: "0 0 1rem 0" }}>
                            Your vote has been securely recorded on the blockchain and cannot be changed or deleted.
                        </p>
                        <p style={{ margin: "0 0 1rem 0" }}>
                            <strong>Voter Address:</strong> {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                        </p>
                        <p style={{ margin: "0", fontSize: "1rem" }}>
                            Results will be made available after the election period closes. Thank you for your participation in the democratic process.
                        </p>
                    </div>
                </div>

                <DigitalBallot
                    candidates={candidates}
                    rankings={rankings}
                    onRankingChange={() => {}}
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
            
            {pendingVote && (
                <div style={{
                    padding: "1rem",
                    backgroundColor: "#fff3cd",
                    border: "1px solid #ffeaa7",
                    borderRadius: "4px",
                    marginBottom: "1rem"
                }}>
                    <h4 style={{ color: "#856404", margin: "0 0 0.5rem 0" }}>
                         Vote Recovery
                    </h4>
                    <p style={{ margin: "0", color: "#856404" }}>
                        We detected an interrupted voting session from {new Date(pendingVote.timestamp).toLocaleString()}. 
                        Your previous rankings have been restored. You can modify them or continue where you left off.
                    </p>
                </div>
            )}

            <div style={{
                padding: "1rem",
                backgroundColor: "#e3f2fd",
                border: "1px solid #2196f3",
                borderRadius: "4px",
                marginBottom: "1rem"
            }}>
                <h3 style={{ color: "#1976d2", margin: "0 0 0.5rem 0" }}>Ready to Vote</h3>
                <p style={{ margin: "0", color: "#666" }}>
                    Rank your preferred candidates below (1 = highest preference). Your vote will be permanently recorded on the blockchain.
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
                isSubmitting={isSubmitting}
            />

            {/* Final Confirmation Modal */}
            {showFinalConfirmation && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        <h3 style={{ color: '#d32f2f', margin: '0 0 1rem 0' }}>
                            Final Vote Confirmation
                        </h3>
                        <p style={{ margin: '0 0 1rem 0' }}>
                            <strong>IMPORTANT:</strong> Once submitted, your vote cannot be changed or withdrawn. 
                            Please review your rankings carefully:
                        </p>
                        
                        <div style={{ 
                            backgroundColor: '#f8f9fa', 
                            padding: '1rem', 
                            borderRadius: '4px',
                            marginBottom: '1rem'
                        }}>
                            {Object.entries(rankings)
                                .sort((a, b) => a[1] - b[1])
                                .map(([candidateId, rank]) => {
                                    const candidate = candidates.find(c => c.id === parseInt(candidateId));
                                    return (
                                        <div key={candidateId} style={{ marginBottom: '0.5rem' }}>
                                            <strong>#{rank}:</strong> {candidate?.name} ({candidate?.party || 'Independent'})
                                        </div>
                                    );
                                })
                            }
                        </div>
                        
                        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                            Your vote will be permanently recorded on the blockchain and associated with wallet: 
                            <br/><code>{walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}</code>
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowFinalConfirmation(false)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmFinalSubmission}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Submit Vote Permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}

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