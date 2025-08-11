import React, { useState, useEffect} from "react";
import DigitalBallot from "../src/DigitalBallot";
import { commitVoteWithZKP, revealVoteWithZKP, demonstrateZKP } from "../src/zkp/voteValidityZKP";

const VoterPanel = React.memo(({ candidates, hasVoted, onSubmitRanking, votingClosed, walletAddress, electionPhase = 'PRE_ELECTION', electionCalled = false, nominationDeadline= null }) => {
    const [rankings, setRankings] = useState({});
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
    const [pendingVote, setPendingVote] = useState(null);

    // ZKP-related state
    const [zkpEnabled, setZkpEnabled] = useState(true);
    const [zkpStatus, setZkpStatus] = useState('');
    const [zkpProof, setZkpProof] = useState(null);
    const [showZkpDemo, setShowZkpDemo] = useState(false);

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

                    // Check if ZKP was generated
                    if (voteData.zkpProof) {
                        setZkpProof(voteData.zkpProof);
                        setMessage("We found an interrupted vote with ZK proof from your previous session. Your rankings have been restored.");
                    } else {
                        setMessage("We found an interrupted vote from your previous session. You can continue where you left off.");
                    }                      
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
            walletAddress: walletAddress,
            zkpProof: zkpProof
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

            if (zkpEnabled) {
                // Submission with ZKP
                setZkpStatus("Generating zero-knowledge proof...");
                const zkpResult = await commitVoteWithZKP(cleanedRanks);

                setZkpStatus('ZK proof generated successfully!');
                setZkpProof(zkpResult.zkProof);

                const pendingVoteKey = `pendingVote_${walletAddress}`;
                const currentData = JSON.parse(localStorage.getItem(pendingVoteKey) || '{}');
                localStorage.setItem(pendingVoteKey, JSON.stringify({
                    ...currentData,
                    zkProof: zkpResult.zkProof
                }));
            
                setMessage("Vote submitted with zero-knowledge proof! Your privacy has been cryptographically protected.");
            } else {
                // Fallback to original submission
                await onSubmitRanking(cleanedRanks);
                setMessage("Vote submitted successfully!");
            }
            
            // Clear pending vote from localStorage
            const pendingVoteKey = `pendingVote_${walletAddress}`;
            localStorage.removeItem(pendingVoteKey);
            
            setSuccess(true);
            setZkpStatus('');
            
        } catch (error) {
            console.error("Error submitting rankings:", error);
            setMessage(`Failed to submit rankings: ${error.message}`);
            setSuccess(false);
            setZkpStatus('');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ZKP Demo function
    const runZkpDemo = async () => {
        try {
            setZkpStatus("Running ZKP demonstration...");
            const demoResult = await demonstrateZKP();

            setZkpStatus(`Demo completed. Proof valid: ${demoResult.verification.isValid}`);
            console.log('ZKP Demo Result:', demoResult);

            setTimeout(() => { setZkpStatus(''); }, 3000);
        } catch (error) {
            setZkpStatus(`ZKP demo failed: ${error.message}`);
            setTimeout(() => { setZkpStatus(''); }, 3000);
        }
    };

    if (!electionCalled || electionPhase === 'PRE_ELECTION') {
        return (
            <div style={{ marginTop: "2rem" }}>
                <h2>Voter Panel</h2>
                <div style={{
                    padding: "2rem",
                    border: "2px solid #6c757d",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    textAlign: "center"
                }}>
                    <h3 style={{ color: "#6c757d", margin: "0 0 1rem 0", fontSize: "1.5rem" }}>
                        No Election Currently Active
                    </h3>
                    <div style={{ color: "#666", fontSize: "1.1rem", lineHeight: "1.6" }}>
                        <p style={{ margin: "0 0 1rem 0" }}>
                            There is no active election at this time.
                        </p>
                        <p style={{ margin: "0 0 1rem 0" }}>
                            Elections must be officially called by the Electoral Commission before voting can begin.
                        </p>
                        <p style={{ margin: "0", fontSize: "1rem" }}>
                            Please check back later or contact the Electoral Commission for more information.
                        </p>
                    </div>
                </div>

                {/* Show ballot preview in disabled state */}
                <DigitalBallot
                    candidates={candidates}
                    rankings={{}}
                    onRankingChange={() => {}}
                    onSubmit={() => {}}
                    hasVoted={false}
                    votingClosed={true} // Force closed state
                    isPreviewMode={true} // Force preview mode
                    isRankingSystem={true}
                />
            </div>
        );
    }

    // Check if we're in nomination phase
    if (electionPhase === 'NOMINATION') {
        const isNominationActive = nominationDeadline && new Date() < nominationDeadline;
        return (
            <div style={{ marginTop: "2rem"}}>
                <h2>Voter Panel</h2>
                <div style={{
                    padding: "2rem",
                    border: "2px solid #ffc107",
                    backgroundColor: "#fff3cd",
                    borderRadius: "8px",
                    textAlign: "center"
                }}>
                    <h3 style={{ color: "#856404", margin: "0 0 1rem 0", fontSize: "1.5rem" }}>
                        Election Called - Nomination Period
                    </h3>
                    <div style={{ color: "#856404", fontSize: "1.1rem", lineHeight: "1.6" }}>
                        <p style={{ margin: "0 0 1rem 0" }}>
                            An election has been called for BallyBeg, Co. Donegal.
                        </p>
                        <p style={{ margin: "0 0 1rem 0" }}>
                            Candidates are currently submitting their nominations to contest the election.
                        </p>
                        {nominationDeadline && (
                            <p style={{ margin: "0 0 1rem 0" }}>
                                <strong>Nomination deadline:</strong> {nominationDeadline.toLocaleString()}
                            </p>
                        )}
                        <p style={{ margin: "0" }}>
                            Voting will open once the nomination period ends and candidates are confirmed.
                        </p>
                    </div>
                </div>

                {/* Show current candidates */}
                {candidates.length > 0 && (
                    <div style={{ marginTop: "2rem" }}>
                        <h4>Candidates Registered So Far:</h4>
                        <div style={{
                            padding: "1rem",
                            backgroundColor: "#f8f9fa",
                            border: "1px solid #dee2e6",
                            borderRadius: "4px"
                        }}>
                            <ul style={{ margin: "0", paddingLeft: "1.5rem" }}>
                                {candidates.map(candidate => (
                                    <li key={candidate.id} style={{ marginBottom: "0.5rem" }}>
                                        <strong>{candidate.name}</strong> ({candidate.party || 'Independent'})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        );
    }
            

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
                
                <div style={{
                    padding: "2rem",
                    border: "2px solid #28a745",
                    backgroundColor: "#d4edda",
                    borderRadius: "8px",
                    textAlign: "center",
                    marginBottom: "2rem"
                }}>
                    <h3 style={{ color: "#155724", margin: "0 0 1rem 0", fontSize: "1.5rem" }}>
                        Vote Successfully Recorded
                    </h3>
                    <div style={{ color: "#155724", fontSize: "1.1rem", lineHeight: "1.6" }}>
                        <p style={{ margin: "0 0 1rem 0" }}>
                            <strong>On behalf of the Electoral Commission, we would like to thank you for voting in this election.</strong>
                        </p>
                        <p style={{ margin: "0 0 1rem 0" }}>
                            Your vote has been securely recorded on the blockchain and cannot be changed or deleted.
                        </p>
                        {zkpProof && (
                            <p style={{ margin: "0 0 1rem 0", backgroundColor: "#c3e6cb",  padding: "0.5rem", borderRadius: "4px" }}>
                                <strong>Privacy Enhanced:</strong> Your vote was protected with zero-knowledge cryptography.
                                <br />Proof Type: {zkpProof.metadata?.proofType || 'VOTE_VALIDITY'}
                            </p>
                        )}
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

            {/* ZKP Controls */}
            <div style={{
                padding: "1rem",
                backgroundColor: "#e3f2fd",
                border: "1px solid #2196f3",
                borderRadius: "4px",
                marginBottom: "1rem"
            }}>
                <h4 style={{ color: "#1976d2", margin: "0 0 0.5rem 0" }}>
                    Zero-Knowledge Privacy Protection
                </h4>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                         <input
                            type="checkbox"
                            checked={zkpEnabled}
                            onChange={(e) => setZkpEnabled(e.target.checked)}
                        />
                        Enable ZK Proof Generation
                    </label>
                    <button
                        onClick={() => setShowZkpDemo(!showZkpDemo)}
                        style={{
                            padding: "0.25rem 0.75rem",
                            backgroundColor: "#ff9800",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.8rem"
                        }}
                    >
                        {showZkpDemo ? "Hide ZKP Demo" : "Show ZKP Demo"}
                    </button>
            </div>

                <p style={{ margin: "0", color: "#666", fontSize: "0.9rem" }}>
                    {zkpEnabled ?
                        "Your vote will be cryptographically proven valid without revealing your choices." :
                        "Standard voting mode - vote content may be observable during commit phase."
                    }
                </p>

                {zkpStatus && (
                    <div style={{
                        marginTop: "0.5rem",
                        padding: "0.5rem",
                        backgroundColor: "#fff3cd",
                        border: "1px solid #ffc107",
                        borderRadius: "4px",
                        fontSize: "0.9rem",
                    }}>
                        {zkpStatus}
                    </div>
                )}

                {/* ZKP Demo Section */}
                {showZkpDemo && (
                    <div style={{
                        marginTop: "1rem",
                        padding: "1rem",
                        backgroundColor: "#fff3cd",
                        border: "1px solid #ffc107",
                        borderRadius: "4px"
                    }}>
                        <h5 style={{ margin: "0 0 0.5rem 0" }}>Zero-Knowledge Proof Demo</h5>
                        <p style={{ margin: "0 0 1rem 0", fontSize: "0.9rem" }}>
                            This demonstrates how ZK proofs work. We'll prove a sample vote is valid without revealing the vote content.
                        </p>
                        <button
                            onClick={runZkpDemo}
                            disabled={zkpStatus.includes("Running")}
                            style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "#4caf50",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                            }}
                        >
                            Run ZKP Demo
                        </button>
                    </div>
                )}
            </div>

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
                        {pendingVote.zkpProof && " ZK proof preserved."}
                    </p>
                </div>
            )}

            <div style={{
                padding: "1rem",
                backgroundColor: "#e8f5e9",
                border: "1px solid #4caf50",
                borderRadius: "4px",
                marginBottom: "1rem"
            }}>
                <h3 style={{ color: "#2e7d32", margin: "0 0 0.5rem 0" }}>Ready to Vote</h3>
                <p style={{ margin: "0", color: "#666" }}>
                    Rank your preferred candidates below (1 = highest preference). Your vote will be permanently recorded on the blockchain
                    {zkpEnabled ? " with cryptographic privacy protection." : "."}
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

            {/* Final Confirmation Modal with ZKP info */}
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

                        {/* ZKP Information */}
                        {zkpEnabled && (
                            <div style={{
                                backgroundColor: '#e3f2fd',
                                padding: '1rem',
                                borderRadius: '4px',
                                marginBottom: '1rem',
                                border: '1px solid #2196f3'
                            }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>
                                    Privacy Protection Enabled
                                </h4>
                                <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
                                    A zero-knowledge proof will be generated to verify your vote is valid 
                                    without revealing your candidate preferences. This adds an extra layer 
                                    of cryptographic privacy to your vote.
                                </p>
                            </div>
                        )}
                        
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
                                    backgroundColor: zkpEnabled ? '#2196f3' : '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {zkpEnabled ? 'Submit with ZK Proof' : 'Submit Vote Permanently'}
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
                    {success && zkpProof && (
                        <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
                        <strong>ZK Proof Details:</strong>
                        <br />Type: {zkpProof.metadata?.proofType || 'VOTE_VALIDITY'}
                        <br />Generated: {new Date(zkpProof.metadata?.generatedAt || Date.now()).toLocaleString()}
                        <br />Candidates: {zkpProof.publicSignals?.numCandidates || 'Unknown'}
                    </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default VoterPanel;