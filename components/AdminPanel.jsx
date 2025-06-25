import React, { useState, useEffect } from "react";
import { addCandidate } from "../src/VotingContract.js";
import DigitalBallot from "../src/DigitalBallot.jsx";
import PRSTVResultsDisplay from "../src/PRSTVResultsDisplay.jsx";
import { runPRSTVSimulation } from "../src/PRSTVSystem.js";

function AdminPanel({ candidates, votingClosed, onToggleVoting, onCandidateAdded, votingHistory = [], sshKeyFingerprint }) {
    const [candidateName, setCandidateName] = useState("");
    const [candidateParty, setCandidateParty] = useState("");
    const [candidateAge, setCandidateAge] = useState("");
    const [nominationMethod, setNominationMethod] = useState("party");
    const [isAddingCandidate, setIsAddingCandidate] = useState(false);
    const [showBallotPreview, setShowBallotPreview] = useState(false);
    const [showPRSTVSimulation, setShowPRSTVSimulation] = useState(false);
    const [prstResults, setPrstResults] = useState(null);
    const [simulationBallots, setSimulationBallots] = useState(null);
    const [numSimulatedVoters, setNumSimulatedVoters] = useState(30);
    const [numSeats, setNumSeats] = useState(3);

    const [activeTab, setActiveTab] = useState('candidates');
    const [voterRegistrations, setVoterRegistrations] = useState([
        {
            id: 1,
            fullName: 'Joe Bloggs',
            ppsNumber: '1234567A',
            constituency: 'Dublin South',
            walletAddress: '0xA318Db8B05cfBB2BEf0944Ef3f9D1Fdb90DF81Bf',
            status: 'pending',
            submittedDate: '2025-06-18T10:30:00',
            registrationMethod: 'irish_citizen' 
        },
        {
            id: 2,
            fullName: 'Mary Shannon',
            ppsNumber: '2345678B',
            constituency: 'Waterford',
            walletAddress: '',
            status: 'approved',
            submittedDate: '2025-06-17T14:20:00',
            registrationMethod: 'eu_citizen' 
        }
    ]);

    // Nomination deadline system
    const [electionCalled, setElectionCalled] = useState(false);
    const [electionCalledDate, setElectionCalledDate] = useState(null);
    const [nominationDeadline, setNominationDeadline] = useState(null);
    const [timeUntilDeadline, setTimeUntilDeadline] = useState("");

    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
    const maxVotes = candidates.length > 0 ? Math.max(...candidates.map(c => c.votes)) : 0;
    const winners = candidates.filter(c => c.votes === maxVotes);

    // Calculate deadline (in real life: 7 days, for testing: 7 minutes)
    const calculateNominationDeadline = (calledDate) => {
        const deadline = new Date(calledDate);
        // For testing: 7 minutes instead of 7 days
        deadline.setMinutes(deadline.getMinutes() + 7);
        // For production: deadline.setDate(deadline.getDate() + 7);
        return deadline;
    };

    // Update countdown timer
    useEffect(() => {
        if (!nominationDeadline) return;

        const timer = setInterval(() => {
            const now = new Date();
            const timeLeft = nominationDeadline - now;

            if (timeLeft <= 0) {
                setTimeUntilDeadline("DEADLINE PASSED");
                clearInterval(timer);
            } else {
                const minutes = Math.floor(timeLeft / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                setTimeUntilDeadline(`${minutes}m ${seconds}s remaining`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [nominationDeadline]);

    const handleCallElection = () => {
        const now = new Date();
        setElectionCalled(true);
        setElectionCalledDate(now);
        setNominationDeadline(calculateNominationDeadline(now));
        alert("Election Called! Nomination period is now open. Candidates have 7 minutes to submit nominations.");
    };

    const isNominationPeriodOpen = () => {
        if (!electionCalled || !nominationDeadline) return false;
        return new Date() < nominationDeadline;
    };

    const validateCandidateEligibility = () => {
        // Age validation (must be over 21)
        if (!candidateAge || parseInt(candidateAge) < 21) {
            alert("Candidate must be over 21 years of age as per Irish electoral law.");
            return false;
        }

        // Name validation
        if (!candidateName.trim()) {
            alert("Please enter candidate name.");
            return false;
        }

        // Party validation for party candidates
        if (nominationMethod === "party" && !candidateParty.trim()) {
            alert("Party affiliation required for party candidates.");
            return false;
        }

        return true;
    };

    const handleAddCandidate = async () => {
        // Check nomination deadline
        if (!isNominationPeriodOpen()) {
            alert("Nomination period is closed. Cannot add new candidates.");
            return;
        }

        // Validate eligibility
        if (!validateCandidateEligibility()) {
            return;
        }

        setIsAddingCandidate(true);
        try {
            // Add nomination method to candidate data
            const candidateData = {
                name: candidateName,
                party: nominationMethod === "party" ? candidateParty : "Independent",
                age: parseInt(candidateAge),
                nominationMethod: nominationMethod,
                nominatedAt: new Date().toISOString()
            };

            await addCandidate(candidateData.name, candidateData.party);
            
            setCandidateName("");
            setCandidateParty("");
            setCandidateAge("");
            
            alert(`Candidate ${candidateData.name} successfully nominated as ${
                nominationMethod === "party" ? `${candidateData.party} candidate` : 
                `Independent (${nominationMethod === "independent_declarations" ? "30 declarations" : "€500 deposit"})`
            }`);
            
            if (onCandidateAdded) {
                await onCandidateAdded();
            }
        } catch (error) {
            console.error("Error adding candidate:", error);
            alert("Failed to add candidate: " + error.message);
        } finally {
            setIsAddingCandidate(false);
        }
    };

    const runPRSTVTest = () => {
        if (candidates.length < 2) {
            alert("You need at least 2 candidates to run a PR-STV simulation.");
            return;
        }

        console.log("Running PR-STV Simulation...");
        const simulation = runPRSTVSimulation(candidates, numSimulatedVoters, numSeats);

        setPrstResults(simulation.results);
        setSimulationBallots(simulation.ballots);
        setShowPRSTVSimulation(true);

        console.log("Simulation Complete:");
        console.log("Final Results:", simulation.results.finalResults);
        console.log("All Counts:", simulation.results.allCounts);
    };

    const updateVoterRegistrationStatus = (id, newStatus) => {
        setVoterRegistrations(prev => prev.map(reg => 
            reg.id === id ? { ...reg, status: newStatus } : reg
        ));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return '#4caf50';
            case 'rejected': return '#f44336';
            case 'pending': return '#ff9800';
            default: return '#666';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved': return '✅';
            case 'rejected': return '❌';
            case 'pending': return '⏳';
            default: return '❓';
        }
    };

    return (
        <div style={{ marginTop: "2rem" }}>
            <h2>🇮🇪 Irish Election Administration Panel</h2>
            {/* Add SSH verification status */}
            {sshKeyFingerprint && (
                <div style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#e8f5e9",
                    border: "1px solid #4caf50",
                    borderRadius: "4px",
                    marginBottom: "1rem",
                    fontSize: "0.9rem"
                }}>
                    <strong>SSH Verified Admin:</strong> {sshKeyFingerprint} 
                    <span style={{ marginLeft: "1rem", color: "#2e7d32" }}>Authorised</span>
                </div>
        )}

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                borderBottom: '2px solid #ccc',
                marginBottom: '2rem'
            }}>
                <button
                    onClick={() => setActiveTab('candidates')}
                    style={{
                        padding: '1rem 2rem',
                        backgroundColor: activeTab === 'candidates' ? '#4caf50' : '#f5f5f5',
                        color: activeTab === 'candidates' ? 'white' : '#666',
                        border: 'none',
                        borderBottom: activeTab === 'candidates' ? '3px solid #2e7d32' : '3px solid transparent',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        marginRight: '1rem'
                    }}
                >
                    Candidate Management
                </button>
                <button
                    onClick={() => setActiveTab('voters')}
                    style={{
                        padding: '1rem 2rem',
                        backgroundColor: activeTab === 'voters' ? '#4caf50' : '#f5f5f5',
                        color: activeTab === 'voters' ? 'white' : '#666',
                        border: 'none',
                        borderBottom: activeTab === 'voters' ? '3px solid #2e7d32' : '3px solid transparent',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                    }}
                >
                    Voter Registration
                </button>
            </div>

            {/* Candidate Management Tab */}
            {activeTab === 'candidates' && (
                <div>
                    {/* Election Status & Nomination Deadline */}
                    <div style={{
                        padding: "1.5rem",
                        backgroundColor: electionCalled ? "#e8f5e9" : "#fff3cd",
                        border: `2px solid ${electionCalled ? "#4caf50" : "#ffc107"}`,
                        borderRadius: "8px",
                        marginBottom: "2rem"
                    }}>
                        <h3 style={{ 
                            color: electionCalled ? "#2e7d32" : "#856404", 
                            margin: "0 0 1rem 0" 
                        }}>
                            Election Status
                        </h3>
                        
                        {!electionCalled ? (
                            <div>
                                <p style={{ margin: "0 0 1rem 0", color: "#856404" }}>
                                    <strong>No election currently called.</strong> Use the button below to officially call an election and open the nomination period.
                                </p>
                                <button
                                    onClick={handleCallElection}
                                    style={{
                                        padding: "0.75rem 1.5rem",
                                        backgroundColor: "#ffc107",
                                        color: "#212529",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "1rem",
                                        fontWeight: "bold"
                                    }}
                                >
                                    Call Election & Open Nominations
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                                    <div>
                                        <strong>Election Called:</strong>
                                        <p style={{ margin: "0.25rem 0 0 0" }}>
                                            {electionCalledDate?.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <strong>Nomination Deadline:</strong>
                                        <p style={{ margin: "0.25rem 0 0 0" }}>
                                            {nominationDeadline?.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <strong>Time Remaining:</strong>
                                        <p style={{ 
                                            margin: "0.25rem 0 0 0",
                                            fontWeight: "bold",
                                            color: timeUntilDeadline.includes("PASSED") ? "#d32f2f" : "#2e7d32"
                                        }}>
                                            {timeUntilDeadline}
                                        </p>
                                    </div>
                                    <div>
                                        <strong>Nomination Period:</strong>
                                        <p style={{ 
                                            margin: "0.25rem 0 0 0",
                                            fontWeight: "bold",
                                            color: isNominationPeriodOpen() ? "#2e7d32" : "#d32f2f"
                                        }}>
                                            {isNominationPeriodOpen() ? "OPEN" : "CLOSED"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Results Embargo Notice for Admins - Only shown during active voting */}
                    {!votingClosed && (
                        <div style={{
                            padding: "1.5rem",
                            backgroundColor: "#fff3cd",
                            border: "2px solid #ffc107",
                            borderRadius: "8px",
                            marginBottom: "2rem"
                        }}>
                            <h3 style={{ color: "#856404", margin: "0 0 0.5rem 0" }}>
                                Administrative Notice: Results Embargo Active
                            </h3>
                            <p style={{ color: "#856404", margin: "0" }}>
                                <strong>Vote counts are hidden during the election period to maintain electoral integrity.</strong>
                                Results will be visible once voting is officially closed. This prevents any potential 
                                influence on the democratic process.
                            </p>
                        </div>
                    )}

                    {/* Candidate Nomination Form */}
                    <div style={{ 
                        marginBottom: "2rem", 
                        padding: "1.5rem", 
                        border: `2px solid ${isNominationPeriodOpen() ? "#4caf50" : "#ccc"}`,
                        backgroundColor: isNominationPeriodOpen() ? "#f8fff8" : "#f5f5f5",
                        borderRadius: "8px"
                    }}>
                        <h3 style={{ color: isNominationPeriodOpen() ? "#2e7d32" : "#666" }}>
                            Candidate Nomination
                            {!isNominationPeriodOpen() && " (Period Closed)"}
                        </h3>

                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                                Full Name: <span style={{ color: "red" }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={candidateName}
                                onChange={(e) => setCandidateName(e.target.value)}
                                disabled={!isNominationPeriodOpen()}
                                placeholder="Enter candidate's full name"
                                style={{ 
                                    width: "100%",
                                    padding: "0.5rem", 
                                    border: "1px solid #ccc",
                                    borderRadius: "4px",
                                    backgroundColor: isNominationPeriodOpen() ? "white" : "#f5f5f5"
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                                Age: <span style={{ color: "red" }}>*</span>
                                <small style={{ fontWeight: "normal", color: "#666" }}> (Must be over 21)</small>
                            </label>
                            <input
                                type="number"
                                min="18"
                                max="120"
                                value={candidateAge}
                                onChange={(e) => setCandidateAge(e.target.value)}
                                disabled={!isNominationPeriodOpen()}
                                placeholder="Enter age"
                                style={{ 
                                    width: "150px",
                                    padding: "0.5rem", 
                                    border: "1px solid #ccc",
                                    borderRadius: "4px",
                                    backgroundColor: isNominationPeriodOpen() ? "white" : "#f5f5f5"
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                                Nomination Method: <span style={{ color: "red" }}>*</span>
                            </label>
                            <div style={{ display: "grid", gap: "0.5rem" }}>
                                <label style={{ display: "flex", alignItems: "center", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}>
                                    <input
                                        type="radio"
                                        name="nominationMethod"
                                        value="party"
                                        checked={nominationMethod === "party"}
                                        onChange={(e) => setNominationMethod(e.target.value)}
                                        disabled={!isNominationPeriodOpen()}
                                        style={{ marginRight: "0.5rem" }}
                                    />
                                    <strong>Political Party Candidate</strong>
                                    <small style={{ marginLeft: "0.5rem", color: "#666" }}>
                                        (Requires Certificate of Party Affiliation)
                                    </small>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}>
                                    <input
                                        type="radio"
                                        name="nominationMethod"
                                        value="independent_declarations"
                                        checked={nominationMethod === "independent_declarations"}
                                        onChange={(e) => setNominationMethod(e.target.value)}
                                        disabled={!isNominationPeriodOpen()}
                                        style={{ marginRight: "0.5rem" }}
                                    />
                                    <strong>Independent - 30 Declarations</strong>
                                    <small style={{ marginLeft: "0.5rem", color: "#666" }}>
                                        (30 statutory declarations from constituents)
                                    </small>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}>
                                    <input
                                        type="radio"
                                        name="nominationMethod"
                                        value="independent_deposit"
                                        checked={nominationMethod === "independent_deposit"}
                                        onChange={(e) => setNominationMethod(e.target.value)}
                                        disabled={!isNominationPeriodOpen()}
                                        style={{ marginRight: "0.5rem" }}
                                    />
                                    <strong>Independent - €500 Deposit</strong>
                                    <small style={{ marginLeft: "0.5rem", color: "#666" }}>
                                        (€500 electoral deposit)
                                    </small>
                                </label>
                            </div>
                        </div>

                        {nominationMethod === "party" && (
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                                    Political Party: <span style={{ color: "red" }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={candidateParty}
                                    onChange={(e) => setCandidateParty(e.target.value)}
                                    disabled={!isNominationPeriodOpen()}
                                    placeholder="e.g., Fianna Fáil, Fine Gael, Sinn Féin, etc."
                                    style={{ 
                                        width: "100%",
                                        padding: "0.5rem", 
                                        border: "1px solid #ccc",
                                        borderRadius: "4px",
                                        backgroundColor: isNominationPeriodOpen() ? "white" : "#f5f5f5"
                                    }}
                                />
                            </div>
                        )}

                        <button
                            onClick={handleAddCandidate}
                            disabled={isAddingCandidate || !isNominationPeriodOpen()}
                            style={{ 
                                padding: "0.75rem 1.5rem",
                                backgroundColor: isNominationPeriodOpen() ? "#4caf50" : "#ccc",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: isNominationPeriodOpen() ? "pointer" : "not-allowed",
                                fontSize: "1rem",
                                fontWeight: "bold"
                            }}
                        >
                            {isAddingCandidate ? "Submitting Nomination..." : "Submit Nomination"}
                        </button>

                        {!isNominationPeriodOpen() && electionCalled && (
                            <p style={{ margin: "1rem 0 0 0", color: "#d32f2f", fontSize: "0.9rem" }}>
                                Nomination deadline has passed. No new candidates can be added.
                            </p>
                        )}
                    </div>

                    {/* Current Results Display */}
                    <h3>
                        {votingClosed ? "Final Results" : "Live Results"} ({candidates.length} candidates)
                    </h3>
                    {candidates.length === 0 ? (
                        <p>No candidates added yet.</p>
                    ) : votingClosed ? (
                        // Show full results when voting is closed
                        <ul>
                            {candidates
                                .sort((a, b) => b.votes - a.votes) // Sort by votes descending
                                .map((c, index) => (
                                    <li key={c.id} style={{
                                        marginBottom: "0.5rem",
                                        padding: "0.5rem",
                                        backgroundColor: index === 0 ? "#e8f5e9" : "#f8f9fa",
                                        border: index === 0 ? "1px solid #4caf50" : "1px solid #dee2e6",
                                        borderRadius: "4px"
                                    }}>
                                        <strong>{c.name}</strong> ({c.party}) - <strong>{c.votes} votes</strong>
                                        {totalVotes > 0 && (
                                            <> ({((c.votes / totalVotes) * 100).toFixed(1)}%)</>
                                        )}
                                    </li>
                                ))}
                        </ul>
                    ) : (
                        // Hide vote counts during active voting
                        <div style={{
                            padding: "2rem",
                            backgroundColor: "#f8f9fa",
                            border: "2px dashed #ccc",
                            borderRadius: "8px",
                            textAlign: "center"
                        }}>
                            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>Locked</div>
                            <h4 style={{ color: "#666", margin: "0 0 0.5rem 0"}}>
                                Results Sealed During Active Voting
                            </h4>
                            <p style={{ color: "#666", margin: "0 0 1rem 0", fontSize: "0.9rem" }}>
                                Vote counts are hidden to maintain electoral integrity. Results will be revealed once voting closes.
                            </p>
                            <div style={{ fontSize: "0.9rem", color: "#666" }}>
                                <strong>Registered Candidates</strong>
                                <ul style={{ listStyle: "none", padding: "0", margin: "0.5rem 0 0 0" }}>
                                    {candidates.map((c) => (
                                        <li key={c.id} style={{ margin: "0.25rem 0"}}>
                                            {c.name} ({c.party || "Independent"})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <hr />

                    {/* Voting Status Control */}
                    <h3>Voting Status Control</h3>
                    <div style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc", backgroundColor: votingClosed ? "#ffebee" : "#e8f5e9" }}>
                        <p><strong>Current Status:</strong> <span style={{ color: votingClosed ? "red" : "green" }}>
                            {votingClosed ? "Voting Closed" : "Voting Open"}
                        </span></p>

                        <button
                            onClick={onToggleVoting}
                            style={{ 
                                marginTop: "1rem",
                                padding: "0.5rem 1rem", 
                                backgroundColor: votingClosed ? "#4caf50" : "#f44336", 
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                            }}
                        >
                            {votingClosed ? "Open Voting" : "Close Voting"}
                        </button>
                    </div>

                    {/* PR-STV Irish Election Simulation */}
                    <div style={{ marginBottom: "2rem", padding: "1rem", border: "2px solid #4CAF50", backgroundColor: "#e8f5e9", borderRadius: "8px"}}>
                        <h3 style={{ margin: "0 0 1rem 0", color: "#2e7d32" }}>
                            🇮🇪 PR-STV Irish Election Simulation
                        </h3>
                        <p style={{ margin: "0 0 1rem 0", color: "#666" }}>
                            Test the Irish Proportional Representation with Single Transferable Vote system using your registered candidates.
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                                    Number of Simulated Voters:
                                </label>
                                <input
                                    type="number"
                                    min="10"
                                    max="1000"
                                    value={numSimulatedVoters}
                                    onChange={(e) => setNumSimulatedVoters(parseInt(e.target.value) || 30)}
                                    style={{
                                        width: "100%",
                                        padding: "0.5rem",
                                        border: "1px solid #ccc",
                                        borderRadius: "4px"
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                                    Number of Seats:
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={numSeats}
                                    onChange={(e) => setNumSeats(parseInt(e.target.value) || 3)}
                                    style={{
                                        width: "100%",
                                        padding: "0.5rem",
                                        border: "1px solid #ccc",
                                        borderRadius: "4px"
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#666" }}>
                            <strong>Quota will be:</strong> {Math.floor(numSimulatedVoters / (numSeats + 1)) + 1} votes needed to guarantee election
                        </div>

                        <button
                            onClick={runPRSTVTest}
                            disabled={candidates.length < 2}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: candidates.length < 2 ? "#ccc" : "#4CAF50",
                                color:"white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: candidates.length < 2 ? "not-allowed" : "pointer",
                                fontSize: "1rem",
                                fontWeight: "bold",
                                marginRight: "1rem"
                            }}
                        >
                            Run PR-STV Simulation
                        </button>

                        {showPRSTVSimulation && ( 
                            <button
                                onClick={() => setShowPRSTVSimulation(!showPRSTVSimulation)}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    backgroundColor: "#007bff",
                                    color:"white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "1rem"
                                }}
                            >
                                {showPRSTVSimulation ? "Hide" : "Show"} PR-STV Results
                            </button>
                        )}

                        {candidates.length < 2 && (
                            <div style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#d32f2f" }}>
                                Add at least 2 candidates to run simulation
                            </div>
                        )}
                    </div>

                    {/* PR-STV Results Display */}
                    {showPRSTVSimulation && (
                        <PRSTVResultsDisplay
                            prstResults={prstResults}
                            ballots={simulationBallots}
                            onRunNewSimulation={runPRSTVTest}
                        />
                    )}
                    {/* Winner announcement - only show when voting is closed and there are votes */}
                    {votingClosed && totalVotes > 0 && candidates.length > 0 && (
                        <div style={{ 
                            marginTop: "2rem", 
                            padding: "1.5rem",
                            backgroundColor: "#e8f5e9",
                            border: "2px solid #4caf50",
                            borderRadius: "8px"
                        }}>
                            {winners.length === 1 ? (
                                <>
                                    <h4 style={{ color: "#2e7d32", margin: "0 0 0.5rem 0" }}>
                                        Election Winner: {winners[0].name} ({winners[0].party})
                                    </h4>
                                    <p style={{ margin: "0", color: "#2e7d32" }}>
                                        Final vote count: <strong>{winners[0].votes} votes</strong> 
                                        ({((winners[0].votes / totalVotes) * 100).toFixed(1)}%)
                                    </p>
                                </>
                            ) : winners.length > 1 ? (
                                <>
                                    <h4 style={{ color: "#f57f17", margin: "0 0 0.5rem 0" }}>
                                        It's a tie between:
                                    </h4>
                                    <ul style={{ margin: "0", color: "#f57f17" }}>
                                        {winners.map((w) => (
                                            <li key={w.id}>
                                                <strong>{w.name}</strong> ({w.party}) - {w.votes} votes
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : null}
                        </div>
                    )}

                    <hr />

                    {/* Ballot Testing */}
                    <h3>Ballot Testing</h3>
                    <div style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
                        <button
                            onClick={() => setShowBallotPreview(!showBallotPreview)}
                            style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "#17a2b8",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                            }}
                        >
                            {showBallotPreview ? "Hide Ballot Preview" : "Show Ballot Preview"}
                        </button>
                        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", color: "#666" }}>
                            Preview how the ballot will appear to voters
                        </p>
                    </div>

                    {showBallotPreview && (
                        <DigitalBallot 
                            candidates={candidates}
                            rankings={{}}
                            onRankingChange={() => {}} // No-op function for admin preview
                            onSubmit={() => {}}
                            hasVoted={false}
                            votingClosed={false}
                            isPreviewMode={true}
                            isRankingSystem={true}
                        />
                    )}

                    {/* Testing Controls */}
                    <h3>Testing Controls</h3>
                    <div style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #orange", backgroundColor: "#fff3cd" }}>
                        <p style={{ marginBottom: "0.5rem" }}>
                            <strong>Testing Only:</strong> These controls are for development testing.
                        </p>
                        <button
                            onClick={() => {
                                if (window.confirm("Reset your vote status for testing? This only affects the UI, not the blockchain.")) {
                                    window.location.reload();
                                }
                            }}
                            style={{
                                padding: "0.5rem 1rem", 
                                backgroundColor: "#ffc107", 
                                color: "#212529",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                marginRight: "1rem"
                            }}
                        >
                            Reset UI (Reload Page)
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm("Clear all local data and reload? This will reset voting history.")) {
                                    localStorage.clear();
                                    window.location.reload();
                                }
                            }}
                            style={{
                                padding: "0.5rem 1rem", 
                                backgroundColor: "#dc3545", 
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                            }}
                        >
                            Clear All Data & Reload
                        </button>
                    </div>

                    {/* Voting Activity Log */}
                    {votingHistory && votingHistory.length > 0 && (
                        <div style={{ marginTop: "2rem" }}>
                            <h4>Voting Activity Log</h4>
                            <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #ccc", padding: "0.5rem" }}>
                                {votingHistory.slice(-10).reverse().map((entry, index) => (
                                    <div key={index} style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                                        <strong>{entry.timestamp}:</strong> Voting {entry.action} by {entry.admin?.slice(0,6)}...{entry.admin?.slice(-4)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Voter Registration Tab */}
            {activeTab === 'voters' && (
                <div>
                    <h3>Voter Registration Management</h3>
                    <p style={{ marginBottom: "2rem", color: "#666" }}>
                        Review and process voter registration applications submitted through the electoral register.
                    </p>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ 
                            width: "100%", 
                            borderCollapse: "collapse",
                            backgroundColor: "white",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        }}>
                            <thead>
                                <tr style={{ backgroundColor: "#f5f5f5" }}>
                                    <th style={{ padding: "1rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Status</th>
                                    <th style={{ padding: "1rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Full Name</th>
                                    <th style={{ padding: "1rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>PPS Number</th>
                                    <th style={{ padding: "1rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Constituency</th>
                                    <th style={{ padding: "1rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Registration Type</th>
                                    <th style={{ padding: "1rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Submitted</th>
                                    <th style={{ padding: "1rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {voterRegistrations.map((registration) => (
                                    <tr key={registration.id} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "1rem" }}>
                                            <span style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                padding: "0.25rem 0.75rem",
                                                borderRadius: "20px",
                                                fontSize: "0.85rem",
                                                fontWeight: "bold",
                                                backgroundColor: getStatusColor(registration.status) + "20",
                                                color: getStatusColor(registration.status)
                                            }}>
                                                {getStatusIcon(registration.status)} {registration.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: "1rem", fontWeight: "500" }}>{registration.fullName}</td>
                                        <td style={{ padding: "1rem", fontFamily: "monospace" }}>{registration.ppsNumber}</td>
                                        <td style={{ padding: "1rem" }}>{registration.constituency}</td>
                                        <td style={{ padding: "1rem" }}>
                                            {registration.registrationMethod === 'irish_citizen' ? '🇮🇪 Irish Citizen' :
                                             registration.registrationMethod === 'eu_citizen' ? '🇪🇺 EU Citizen' :
                                             registration.registrationMethod === 'uk_citizen' ? '🇬🇧 UK Citizen' : 
                                             registration.registrationMethod}
                                        </td>
                                        <td style={{ padding: "1rem", fontSize: "0.9rem", color: "#666" }}>
                                            {new Date(registration.submittedDate).toLocaleDateString()} 
                                            <br />
                                            {new Date(registration.submittedDate).toLocaleTimeString()}
                                        </td>
                                        <td style={{ padding: "1rem" }}>
                                            {registration.status === 'pending' && (
                                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                                    <button
                                                        onClick={() => updateVoterRegistrationStatus(registration.id, 'approved')}
                                                        style={{
                                                            padding: "0.5rem 1rem",
                                                            backgroundColor: "#4caf50",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            cursor: "pointer",
                                                            fontSize: "0.85rem"
                                                        }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => updateVoterRegistrationStatus(registration.id, 'rejected')}
                                                        style={{
                                                            padding: "0.5rem 1rem",
                                                            backgroundColor: "#f44336",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            cursor: "pointer",
                                                            fontSize: "0.85rem"
                                                        }}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                            {registration.status !== 'pending' && (
                                                <span style={{ fontSize: "0.9rem", color: "#666" }}>
                                                    Processed
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ 
                        marginTop: "2rem", 
                        padding: "1rem", 
                        backgroundColor: "#e3f2fd",
                        border: "1px solid #2196f3",
                        borderRadius: "4px"
                    }}>
                        <h4 style={{ margin: "0 0 0.5rem 0", color: "#1976d2" }}>
                            Voter Registration Process
                        </h4>
                        <p style={{ margin: "0", color: "#555", fontSize: "0.9rem" }}>
                            Applications are submitted through the public voter registration form. 
                            Approved voters will receive their unique wallet address for blockchain voting. 
                            Ensure all PPS numbers are valid and constituents are correctly assigned before approval.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPanel;