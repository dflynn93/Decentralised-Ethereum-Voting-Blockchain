import React, { useState, useEffect } from "react";
import { addCandidate } from "../src/VotingContract.js";
import DigitalBallot from "../src/DigitalBallot.jsx";
import PRSTVResultsDisplay from "../src/PRSTVResultsDisplay.jsx";
import { runPRSTVSimulation } from "../src/PRSTVSystem.js";
import "./AdminPanel.css";
import BasicEmergencyControls from "./EmergencyControls.jsx";

function AdminPanel({ candidates, votingClosed, onToggleVoting, onCandidateAdded, votingHistory = [], sshKeyFingerprint, contract, provider, walletAddress }) {
    // Form state
    const [candidateName, setCandidateName] = useState("");
    const [candidateParty, setCandidateParty] = useState("");
    const [candidateAge, setCandidateAge] = useState("");
    const [nominationMethod, setNominationMethod] = useState("party");
    const [isAddingCandidate, setIsAddingCandidate] = useState(false);
    
    // UI state
    const [activeTab, setActiveTab] = useState('election');
    const [showBallotPreview, setShowBallotPreview] = useState(false);
    const [showPRSTVSimulation, setShowPRSTVSimulation] = useState(false);
    
    // PR-STV simulation state
    const [prstResults, setPrstResults] = useState(null);
    const [simulationBallots, setSimulationBallots] = useState(null);
    const [numSimulatedVoters, setNumSimulatedVoters] = useState(30);
    const [numSeats, setNumSeats] = useState(3);

    // Election management state
    const [electionCalled, setElectionCalled] = useState(false);
    const [electionCalledDate, setElectionCalledDate] = useState(null);
    const [nominationDeadline, setNominationDeadline] = useState(null);
    const [timeUntilDeadline, setTimeUntilDeadline] = useState("");
    const [voterRegistrationOpen, setVoterRegistrationOpen] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // NEW: Separate voting phase state
    const [votingPhase, setVotingPhase] = useState('PRE_ELECTION'); // PRE_ELECTION, NOMINATION, VOTING, CLOSED
    const [votingOpenDate, setVotingOpenDate] = useState(null);

    // Voter registration state
    const [voterRegistrations, setVoterRegistrations] = useState([
        {
            id: 1,
            fullName: 'Joe Bloggs',
            ppsNumber: '1234567A',
            constituency: 'BallyBeg',
            walletAddress: '0xA318Db8B05cfBB2BEf0944Ef3f9D1Fdb90DF81Bf',
            status: 'pending',
            submittedDate: '2025-06-18T10:30:00',
            registrationMethod: 'irish_citizen' 
        },
        {
            id: 2,
            fullName: 'Mary Shannon',
            ppsNumber: '2345678B',
            constituency: 'BallyBeg',
            walletAddress: '',
            status: 'approved',
            submittedDate: '2025-06-17T14:20:00',
            registrationMethod: 'eu_citizen' 
        }
    ]);

    // Calculated values
    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
    const maxVotes = candidates.length > 0 ? Math.max(...candidates.map(c => c.votes)) : 0;
    const winners = candidates.filter(c => c.votes === maxVotes);

    // Real-time clock update
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Countdown timer for nomination deadline
    useEffect(() => {
        if (!nominationDeadline || votingPhase !== 'NOMINATION') return;

        const timer = setInterval(() => {
            const now = new Date();
            const timeLeft = nominationDeadline - now;

            if (timeLeft <= 0) {
                setTimeUntilDeadline("DEADLINE PASSED");
                // Automatically move to voting phase when nomination period ends
                setVotingPhase('VOTING');
                setVotingOpenDate(new Date());
                clearInterval(timer);
            } else {
                const minutes = Math.floor(timeLeft / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                setTimeUntilDeadline(`${minutes}m ${seconds}s remaining`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [nominationDeadline, votingPhase]);

    // Helper functions
    const calculateNominationDeadline = (calledDate) => {
        const deadline = new Date(calledDate);
        // For testing: 7 minutes instead of 7 days
        deadline.setMinutes(deadline.getMinutes() + 7);
        // For production: deadline.setDate(deadline.getDate() + 7);
        return deadline;
    };

    const isNominationPeriodOpen = () => {
        return votingPhase === 'NOMINATION' && nominationDeadline && new Date() < nominationDeadline;
    };

    const isVotingActuallyOpen = () => {
        return votingPhase === 'VOTING' && !votingClosed;
    };

    const getElectionStatus = () => {
        if (votingPhase === 'PRE_ELECTION') {
            return {
                status: 'No Election Called',
                statusColor: '#6c757d',
                backgroundColor: '#f8f9fa',
                borderColor: '#dee2e6',
                description: 'No election or referendum is currently scheduled.'
            };
        }

        if (votingPhase === 'CLOSED' || votingClosed) {
            return {
                status: 'Election Closed',
                statusColor: '#dc3545',
                backgroundColor: '#f8d7da',
                borderColor: '#f5c6cb',
                description: 'Voting has ended. Results are being processed.'
            };
        }

        if (votingPhase === 'NOMINATION') {
            const isNominationOpen = nominationDeadline && new Date() < nominationDeadline;
            return {
                status: isNominationOpen ? 'Election Called - Nomination Period Active' : 'Nomination Period Ended',
                statusColor: isNominationOpen ? '#fd7e14' : '#856404',
                backgroundColor: isNominationOpen ? '#fff3cd' : '#ffeaa7',
                borderColor: isNominationOpen ? '#ffeaa7' : '#ffc107',
                description: isNominationOpen ? 
                    'Candidates may submit nominations. Voting will open when nomination period ends.' :
                    'Nomination period has ended. Preparing to open voting.'
            };
        }

        if (votingPhase === 'VOTING') {
            return {
                status: 'Election Open - Voting Active',
                statusColor: '#28a745',
                backgroundColor: '#d4edda',
                borderColor: '#c3e6cb',
                description: 'Voting is currently open. Citizens may cast their ballots.'
            };
        }

        return {
            status: 'Unknown Phase',
            statusColor: '#6c757d',
            backgroundColor: '#f8f9fa',
            borderColor: '#dee2e6',
            description: 'Election status unknown.'
        };
    };

    const getElectionDuration = () => {
        if (!electionCalledDate) return null;

        const now = new Date();
        const duration = now - electionCalledDate;
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `Election running for ${hours}h ${minutes}m`;
        }
        return `Election running for ${minutes}m`;
    };

    const getVotingDuration = () => {
        if (!votingOpenDate || votingPhase !== 'VOTING') return null;

        const now = new Date();
        const duration = now - votingOpenDate;
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `Voting open for ${hours}h ${minutes}m`;
        }
        return `Voting open for ${minutes}m`;
    };

    const validateCandidateEligibility = () => {
        // Check nomination deadline first
        if (!isNominationPeriodOpen()) {
            alert("Nomination period is not active. Cannot add new candidates.");
            return false;
        }
        
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
            case 'approved': return '';
            case 'rejected': return '';
            case 'pending': return '';
            default: return '';
        }
    };

    // Event handlers
    const handleCallElection = () => {
        const now = new Date();
        setElectionCalled(true);
        setElectionCalledDate(now);
        setNominationDeadline(calculateNominationDeadline(now));
        setVoterRegistrationOpen(false);
        setVotingPhase('NOMINATION'); // Start in nomination phase
        alert("Election Called! Nomination period is now open. Candidates have 7 minutes to submit nominations.\n\nIMPORTANT: Voter registration is now CLOSED for this election.");
    };

    // NEW: Skip nomination and go straight to voting
    const handleSkipToVoting = () => {
        if (window.confirm("Skip nomination period and open voting immediately? This is for testing purposes only.")) {
            setVotingPhase('VOTING');
            setVotingOpenDate(new Date());
            setTimeUntilDeadline("SKIPPED TO VOTING");
            alert("Skipped to voting phase! Voters can now cast their ballots.");
        }
    };

    // NEW: Open voting after nomination period
    const handleOpenVoting = () => {
        if (candidates.length === 0) {
            alert("Cannot open voting without any candidates. Add at least one candidate first.");
            return;
        }
        
        setVotingPhase('VOTING');
        setVotingOpenDate(new Date());
        alert(`Voting is now open! ${candidates.length} candidates are running for BallyBeg constituency.`);
    };

    const handleAddCandidate = async () => {
        // Check nomination deadline
        if (!isNominationPeriodOpen()) {
            alert("Nomination period is not active. Cannot add new candidates.");
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
                nominatedAt: new Date().toISOString(),
                constituency: "BallyBeg"
            };

            await addCandidate(candidateData.name, candidateData.party);
            
            setCandidateName("");
            setCandidateParty("");
            setCandidateAge("");
            
            alert(`Candidate ${candidateData.name} successfully nominated for BallyBeg, Co. Donegal as ${
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
            alert("Need at least 2 candidates to run a PR-STV simulation.");
            return;
        }

        console.log("Running PR-STV Simulation for BallyBeg, Co. Donegal...");
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

    const statusInfo = getElectionStatus();

    return (
        <div className="admin-panel">
            <h2>Irish Election Administration Panel - BallyBeg, Co. Donegal</h2>
            
            {/* SSH verification status */}
            {sshKeyFingerprint && (
                <div className="ssh-verification">
                    <strong>SSH Verified Admin:</strong> {sshKeyFingerprint} 
                    <span>Authorised</span>
                </div>
            )}

            {/* Real-Time Clock */}
            <div className="real-time-clock">
                <h4>Current Time: {currentTime.toLocaleString()}</h4>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    onClick={() => setActiveTab('election')}
                    className={`tab-button election ${activeTab === 'election' ? 'active' : ''}`}
                >
                    Election Management
                </button>
                <button
                    onClick={() => setActiveTab('candidates')}
                    className={`tab-button candidates ${activeTab === 'candidates' ? 'active' : ''}`}
                >
                    Candidate Management
                </button>
                <button
                    onClick={() => setActiveTab('voters')}
                    className={`tab-button voters ${activeTab === 'voters' ? 'active' : ''}`}
                >
                    Voter Registration
                </button>
                <button
                    onClick={() => setActiveTab('testing')}
                    className={`tab-button testing ${activeTab === 'testing' ? 'active' : ''}`}
                >
                    Testing & Simulation
                </button>
            </div>

            {/* Election Management Tab */}
            {activeTab === 'election' && (
                <div>
                    {/* Election Status */}
                    <div className="election-status" style={{
                        marginBottom: '2rem',
                        padding: '1.5rem',
                        backgroundColor: statusInfo.backgroundColor,
                        border: `2px solid ${statusInfo.borderColor}`,
                        borderRadius: '8px'
                    }}>
                        <h3 style={{ 
                            margin: "0 0 1rem 0", 
                            color: statusInfo.statusColor,
                            fontSize: '1.3rem'
                        }}>
                            {statusInfo.status}
                        </h3>

                        <p style={{ 
                            margin: "0 0 1rem 0", 
                            color: statusInfo.statusColor,
                            fontSize: '1rem'
                        }}>
                            {statusInfo.description}
                        </p>

                        {votingPhase === 'PRE_ELECTION' ? (
                            <div>
                                <p style={{ margin: "0 0 1rem 0" }}>
                                    <strong>Use the button below to officially call an election for BallyBeg, Co. Donegal and open the nomination period.</strong>
                                </p>
                                <button onClick={handleCallElection} className="call-election-btn">
                                    Call Election & Open Nominations
                                </button>
                            </div>
                        ) : (
                            <div className="election-grid">
                                <div>
                                    <strong>Election Called:</strong>
                                    <p>{electionCalledDate?.toLocaleString()}</p>
                                </div>
                                
                                {getElectionDuration() && (
                                    <div>
                                        <strong>Duration:</strong>
                                        <p>{getElectionDuration()}</p>
                                    </div>
                                )}

                                {votingPhase === 'NOMINATION' && (
                                    <>
                                        <div>
                                            <strong>Nomination Deadline:</strong>
                                            <p>{nominationDeadline?.toLocaleString()}</p>
                                        </div>
                                        
                                        <div>
                                            <strong>Time Remaining:</strong>
                                            <p className={`time-remaining ${timeUntilDeadline.includes("PASSED") ? 'passed' : 'active'}`}>
                                                {timeUntilDeadline}
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <strong>Nomination Period:</strong>
                                            <p className={`nomination-status ${isNominationPeriodOpen() ? 'open' : 'closed'}`}>
                                                {isNominationPeriodOpen() ? "OPEN" : "CLOSED"}
                                            </p>
                                        </div>
                                    </>
                                )}

                                {votingPhase === 'VOTING' && votingOpenDate && (
                                    <div>
                                        <strong>Voting Duration:</strong>
                                        <p>{getVotingDuration()}</p>
                                    </div>
                                )}

                                <div>
                                    <strong>Current Phase:</strong>
                                    <p style={{ fontWeight: 'bold', color: statusInfo.statusColor }}>
                                        {votingPhase === 'NOMINATION' ? 'NOMINATION' : 
                                         votingPhase === 'VOTING' ? 'VOTING' : 
                                         votingPhase === 'CLOSED' ? 'CLOSED' : 'UNKNOWN'}
                                    </p>
                                </div>

                                <div>
                                    <strong>Registered Candidates:</strong>
                                    <p>{candidates.length} candidates</p>
                                </div>
                            </div>
                        )}

                        {/* Testing Controls for Phase Management */}
                        {votingPhase === 'NOMINATION' && (
                            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255, 193, 7, 0.1)', border: '1px solid #ffc107', borderRadius: '4px' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>Testing Controls</h4>
                                <button
                                    onClick={handleSkipToVoting}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: '#ffc107',
                                        color: '#212529',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        marginRight: '1rem'
                                    }}
                                >
                                    Skip to Voting (Testing)
                                </button>
                                {!isNominationPeriodOpen() && candidates.length > 0 && (
                                    <button
                                        onClick={handleOpenVoting}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Open Voting
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Voter Registration Status */}
                    <div className="voter-registration-status" style={{
                        marginBottom: '2rem',
                        padding: '1.5rem',
                        backgroundColor: voterRegistrationOpen ? '#d4edda' : '#f8d7da',
                        border: `2px solid ${voterRegistrationOpen ? '#c3e6cb' : '#f5c6cb'}`,
                        borderRadius: '8px'
                    }}>
                        <h3 style={{ 
                            margin: "0 0 1rem 0", 
                            color: voterRegistrationOpen ? '#155724' : '#721c24'
                        }}>
                            Voter Registration Status - BallyBeg, Co. Donegal
                        </h3>
                        
                        <div className="election-grid">
                            <div>
                                <strong>Current Status:</strong>
                                <p style={{
                                    margin: "0.5rem 0 0 0",
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    color: voterRegistrationOpen ? '#155724' : '#721c24'
                                }}>
                                    {voterRegistrationOpen ? "OPEN" : "CLOSED"}
                                </p>
                            </div>
                            
                            <div>
                                <strong>Registration Policy:</strong>
                                <p style={{ margin: "0.5rem 0 0 0", fontSize: '0.9rem' }}>
                                    {voterRegistrationOpen ? 
                                        "BallyBeg citizens may register to vote in upcoming elections." :
                                        "Registration closed for current BallyBeg election. Only pre-registered voters may participate."
                                    }
                                </p>
                            </div>
                        </div>

                        {!voterRegistrationOpen && electionCalled && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                borderRadius: '4px',
                                border: '1px solid rgba(0, 0, 0, 0.1)'
                            }}>
                                <strong>Important:</strong> Voter registration automatically closes when an election is called 
                                to maintain electoral integrity. Only citizens who registered before 
                                {electionCalledDate && ` ${electionCalledDate.toLocaleString()}`} may participate in this BallyBeg election.
                            </div>
                        )}
                    </div>

                    {/* Voting Status Control - Only show when actually relevant */}
                    {votingPhase === 'VOTING' && (
                        <>
                            <h3>Voting Status Control</h3>
                            <div className={`voting-status ${votingClosed ? 'closed' : 'open'}`}>
                                <p><strong>Current Status:</strong> <span style={{ color: votingClosed ? "red" : "green" }}>
                                    {votingClosed ? "Voting Closed" : "Voting Open"}
                                </span></p>
                                <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                                    {votingClosed ? 
                                        "Voting has been closed by the administrator. No more votes can be cast." :
                                        "Citizens can now cast their ballots. Close voting when the election period should end."
                                    }
                                </p>
                                <button
                                    onClick={onToggleVoting}
                                    className={`toggle-voting-btn ${votingClosed ? 'open' : 'close'}`}
                                >
                                    {votingClosed ? "Reopen Voting" : "Close Voting"}
                                </button>
                            </div>
                        </>
                    )}

                    {/* Phase Status Info */}
                    {votingPhase !== 'VOTING' && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#e3f2fd',
                            border: '1px solid #2196f3',
                            borderRadius: '4px',
                            marginBottom: '2rem'
                        }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>
                                Current Phase: {votingPhase === 'NOMINATION' ? 'Nomination Period' : 
                                                votingPhase === 'PRE_ELECTION' ? 'Pre-Election' : 
                                                votingPhase === 'CLOSED' ? 'Election Closed' : 'Unknown'}
                            </h4>
                            <p style={{ margin: '0', fontSize: '0.9rem', color: '#555' }}>
                                {votingPhase === 'NOMINATION' ? 'Candidates can be nominated. Voting will open when the nomination period ends or is skipped.' :
                                 votingPhase === 'PRE_ELECTION' ? 'Call an election to begin the process.' :
                                 votingPhase === 'CLOSED' ? 'The election has concluded.' :
                                 'Phase status unknown.'}
                            </p>
                        </div>
                    )}

                    {/* Results Display */}
                    <div className="results-section">
                        <h3>
                            {votingClosed ? "Final Results" : "Live Results"} - BallyBeg, Co. Donegal
                            <br />
                            <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#666' }}>
                                ({candidates.length} candidate{candidates.length !== 1 ? 's' : ''} registered)
                            </span>
                        </h3>
                        {candidates.length === 0 ? (
                            <p>No candidates added yet for BallyBeg constituency.</p>
                        ) : votingClosed ? (
                            // Show full results when voting is closed
                            <ul className="candidate-list">
                                {candidates
                                    .sort((a, b) => b.votes - a.votes) // Sort by votes descending
                                    .map((c, index) => (
                                        <li key={c.id} className={`candidate-item ${index === 0 ? 'winner' : 'regular'}`}>
                                            <strong>{c.name}</strong> ({c.party}) - <strong>{c.votes} votes</strong>
                                            {totalVotes > 0 && (
                                                <> ({((c.votes / totalVotes) * 100).toFixed(1)}%)</>
                                            )}
                                        </li>
                                    ))}
                            </ul>
                        ) : (
                            // Hide vote counts during active voting or nomination
                            <div className="results-locked">
                                <h4>
                                    {votingPhase === 'VOTING' ? 'Results Sealed During Active Voting' : 
                                     votingPhase === 'NOMINATION' ? 'Results Not Available During Nomination' :
                                     'Results Not Available'}
                                </h4>
                                <p>
                                    {votingPhase === 'VOTING' ? 
                                        'Vote counts are hidden to maintain electoral integrity. Results will be revealed once voting closes.' :
                                        votingPhase === 'NOMINATION' ?
                                        'Voting has not started yet. Results will be available after voting begins and ends.' :
                                        'Results are not currently available.'
                                    }
                                </p>
                                <div>
                                    <strong>Registered Candidates for BallyBeg</strong>
                                    <ul className="candidate-list">
                                        {candidates.map((c) => (
                                            <li key={c.id}>
                                                {c.name} ({c.party || "Independent"})
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Winner announcement - only show when voting is closed and there are votes */}
                    {votingClosed && totalVotes > 0 && candidates.length > 0 && (
                        <div className={`winner-announcement ${winners.length === 1 ? 'single' : 'tie'}`}>
                            {winners.length === 1 ? (
                                <>
                                    <h4>BallyBeg Election Winner: {winners[0].name} ({winners[0].party})</h4>
                                    <p>
                                        Final vote count: <strong>{winners[0].votes} votes</strong> 
                                        ({((winners[0].votes / totalVotes) * 100).toFixed(1)}%)
                                    </p>
                                </>
                            ) : winners.length > 1 ? (
                                <>
                                    <h4>It's a tie in BallyBeg between:</h4>
                                    <ul>
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

                    {/* Voting Activity Log */}
                    {votingHistory && votingHistory.length > 0 && (
                        <div className="activity-log">
                            <h4>Voting Activity Log - BallyBeg</h4>
                            <div className="activity-log-container">
                                {votingHistory.slice(-10).reverse().map((entry, index) => (
                                    <div key={index} className="activity-log-entry">
                                        <strong>{entry.timestamp}:</strong> Voting {entry.action} by {entry.admin?.slice(0,6)}...{entry.admin?.slice(-4)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Emergency Controls Section */}
            <BasicEmergencyControls
                contract={contract}
                provider={provider}
                walletAddress={walletAddress}
                votingClosed={votingClosed}
                onVotingToggle={onToggleVoting}
            />

            {/* Candidate Management Tab */}
            {activeTab === 'candidates' && (
                <div>
                    {/* Results Embargo Notice for Admins - Only shown during active voting */}
                    {votingPhase === 'VOTING' && !votingClosed && (
                        <div className="results-embargo">
                            <h3>Administrative Notice: Results Embargo Active</h3>
                            <p>
                                <strong>Vote counts are hidden during the election period to maintain electoral integrity.</strong>
                                Results will be visible once voting is officially closed. This prevents any potential 
                                influence on the democratic process.
                            </p>
                        </div>
                    )}

                    {/* Candidate Nomination Form */}
                    <div className={`nomination-form ${isNominationPeriodOpen() ? 'open' : 'closed'}`}>
                        <h3>
                            Candidate Nomination for BallyBeg, Co. Donegal
                            {!isNominationPeriodOpen() && votingPhase === 'NOMINATION' && " (Period Closed)"}
                            {votingPhase === 'PRE_ELECTION' && " (Election Not Called)"}
                            {votingPhase === 'VOTING' && " (Voting Phase - Nominations Closed)"}
                            {votingPhase === 'CLOSED' && " (Election Closed)"}
                        </h3>

                        {/* Phase Status */}
                        <div style={{
                            padding: '1rem',
                            backgroundColor: 
                                votingPhase === 'PRE_ELECTION' ? '#f8f9fa' :
                                votingPhase === 'NOMINATION' && isNominationPeriodOpen() ? '#e8f5e9' :
                                votingPhase === 'NOMINATION' ? '#fff3cd' :
                                votingPhase === 'VOTING' ? '#e3f2fd' :
                                '#f8d7da',
                            border: `1px solid ${
                                votingPhase === 'PRE_ELECTION' ? '#dee2e6' :
                                votingPhase === 'NOMINATION' && isNominationPeriodOpen() ? '#4caf50' :
                                votingPhase === 'NOMINATION' ? '#ffc107' :
                                votingPhase === 'VOTING' ? '#2196f3' :
                                '#f5c6cb'
                            }`,
                            borderRadius: '4px',
                            marginBottom: '1rem'
                        }}>
                            <h4 style={{ 
                                margin: '0 0 0.5rem 0', 
                                color: 
                                    votingPhase === 'PRE_ELECTION' ? '#6c757d' :
                                    votingPhase === 'NOMINATION' && isNominationPeriodOpen() ? '#2e7d32' :
                                    votingPhase === 'NOMINATION' ? '#856404' :
                                    votingPhase === 'VOTING' ? '#1976d2' :
                                    '#721c24'
                            }}>
                                {votingPhase === 'PRE_ELECTION' ? 'No Election Called' :
                                 votingPhase === 'NOMINATION' && isNominationPeriodOpen() ? 'Nomination Period Active' :
                                 votingPhase === 'NOMINATION' ? 'Nomination Period Ended' :
                                 votingPhase === 'VOTING' ? 'Voting Phase Active' :
                                 'Election Closed'}
                            </h4>
                            <p style={{ margin: '0', fontSize: '0.9rem', color: '#555' }}>
                                {votingPhase === 'PRE_ELECTION' ? 'Call an election first to open nominations.' :
                                 votingPhase === 'NOMINATION' && isNominationPeriodOpen() ? 'Candidates can submit nominations now.' :
                                 votingPhase === 'NOMINATION' ? 'Nomination period has ended. Voting will open soon.' :
                                 votingPhase === 'VOTING' ? 'Voting is active. No new candidates can be added.' :
                                 'Election has concluded. No changes can be made.'}
                            </p>
                        </div>

                        {/* Form Fields - Only show if nominations are open */}
                        {isNominationPeriodOpen() && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">
                                        Full Name: <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={candidateName}
                                        onChange={(e) => setCandidateName(e.target.value)}
                                        placeholder="Enter candidate's full name"
                                        className="form-input full-width enabled"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        Age: <span className="required">*</span>
                                        <small> (Must be over 21)</small>
                                    </label>
                                    <input
                                        type="number"
                                        min="18"
                                        max="120"
                                        value={candidateAge}
                                        onChange={(e) => setCandidateAge(e.target.value)}
                                        placeholder="Enter age"
                                        className="form-input age-input enabled"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        Nomination Method: <span className="required">*</span>
                                    </label>
                                    <div className="radio-grid">
                                        <label className="radio-option">
                                            <input
                                                type="radio"
                                                name="nominationMethod"
                                                value="party"
                                                checked={nominationMethod === "party"}
                                                onChange={(e) => setNominationMethod(e.target.value)}
                                            />
                                            <strong>Political Party Candidate</strong>
                                            <small>(Requires Certificate of Party Affiliation)</small>
                                        </label>
                                        <label className="radio-option">
                                            <input
                                                type="radio"
                                                name="nominationMethod"
                                                value="independent_declarations"
                                                checked={nominationMethod === "independent_declarations"}
                                                onChange={(e) => setNominationMethod(e.target.value)}
                                            />
                                            <strong>Independent - 30 Declarations</strong>
                                            <small>(30 statutory declarations from constituents)</small>
                                        </label>
                                        <label className="radio-option">
                                            <input
                                                type="radio"
                                                name="nominationMethod"
                                                value="independent_deposit"
                                                checked={nominationMethod === "independent_deposit"}
                                                onChange={(e) => setNominationMethod(e.target.value)}
                                            />
                                            <strong>Independent - €500 Deposit</strong>
                                            <small>(€500 electoral deposit)</small>
                                        </label>
                                    </div>
                                </div>

                                {nominationMethod === "party" && (
                                    <div className="form-group">
                                        <label className="form-label">
                                            Political Party: <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={candidateParty}
                                            onChange={(e) => setCandidateParty(e.target.value)}
                                            placeholder="e.g., Fianna Fáil, Fine Gael, Sinn Féin, etc."
                                            className="form-input full-width enabled"
                                        />
                                    </div>
                                )}

                                <button
                                    onClick={handleAddCandidate}
                                    disabled={isAddingCandidate}
                                    className="submit-nomination-btn enabled"
                                >
                                    {isAddingCandidate ? "Submitting Nomination..." : "Submit Nomination"}
                                </button>
                            </>
                        )}

                        {/* Show message when nominations are closed */}
                        {!isNominationPeriodOpen() && votingPhase === 'NOMINATION' && (
                            <p className="deadline-notice">
                                Nomination deadline has passed. No new candidates can be added to BallyBeg constituency.
                            </p>
                        )}
                    </div>

                    {/* Current Candidates List */}
                    {candidates.length > 0 && (
                        <div style={{
                            marginTop: '2rem',
                            padding: '1.5rem',
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: '8px'
                        }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>
                                Registered Candidates for BallyBeg ({candidates.length})
                            </h4>
                            <ul className="candidate-list">
                                {candidates.map((c, index) => (
                                    <li key={c.id} className="candidate-item regular">
                                        <strong>{c.name}</strong> ({c.party || "Independent"})
                                        {votingClosed && (
                                            <span style={{ marginLeft: '1rem', color: '#666' }}>
                                                - {c.votes} votes ({totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : 0}%)
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Voter Registration Tab */}
            {activeTab === 'voters' && (
                <div className="voter-registration-section">
                    <h3>Voter Registration Management - BallyBeg, Co. Donegal</h3>
                    <p>
                        Review and process voter registration applications submitted for the BallyBeg constituency.
                        Only voters registered in BallyBeg, Co. Donegal are eligible to vote in this election.
                    </p>

                    <div className="voter-table-container">
                        <table className="voter-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Full Name</th>
                                    <th>PPS Number</th>
                                    <th>Constituency</th>
                                    <th>Registration Type</th>
                                    <th>Submitted</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {voterRegistrations.map((registration) => (
                                    <tr key={registration.id}>
                                        <td>
                                            <span 
                                                className="status-badge"
                                                style={{
                                                    backgroundColor: getStatusColor(registration.status) + "20",
                                                    color: getStatusColor(registration.status)
                                                }}
                                            >
                                                {getStatusIcon(registration.status)} {registration.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="voter-name">{registration.fullName}</td>
                                        <td className="pps-number">{registration.ppsNumber}</td>
                                        <td>{registration.constituency}</td>
                                        <td>
                                            {registration.registrationMethod === 'irish_citizen' ? 'Irish Citizen' :
                                             registration.registrationMethod === 'eu_citizen' ? 'EU Citizen' :
                                             registration.registrationMethod === 'uk_citizen' ? 'UK Citizen' : 
                                             registration.registrationMethod}
                                        </td>
                                        <td className="submission-date">
                                            {new Date(registration.submittedDate).toLocaleDateString()} 
                                            <br />
                                            {new Date(registration.submittedDate).toLocaleTimeString()}
                                        </td>
                                        <td>
                                            {registration.status === 'pending' && (
                                                <div className="action-buttons">
                                                    <button
                                                        onClick={() => updateVoterRegistrationStatus(registration.id, 'approved')}
                                                        className="approve-btn"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => updateVoterRegistrationStatus(registration.id, 'rejected')}
                                                        className="reject-btn"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                            {registration.status !== 'pending' && (
                                                <span className="processed-status">Processed</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="voter-info">
                        <h4>Voter Registration Process - BallyBeg</h4>
                        <p>
                            Applications are submitted through the public voter registration form. 
                            Approved voters will receive their unique wallet address for blockchain voting. 
                            Ensure all PPS numbers are valid and constituents are correctly assigned before approval.
                        </p>
                    </div>
                </div>
            )}

            {/* Testing & Simulation Tab */}
            {activeTab === 'testing' && (
                <div>
                    {/* PR-STV Irish Election Simulation */}
                    <div className="prst-simulation">
                        <h3>PR-STV Irish Election Simulation - BallyBeg, Co. Donegal</h3>
                        <p>
                            Test the Irish Proportional Representation with Single Transferable Vote system 
                            using candidates registered for the BallyBeg constituency.
                        </p>

                        <div className="simulation-grid">
                            <div>
                                <label className="form-label">Number of Simulated Voters:</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="1000"
                                    value={numSimulatedVoters}
                                    onChange={(e) => setNumSimulatedVoters(parseInt(e.target.value) || 30)}
                                    className="simulation-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">Number of Seats:</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={numSeats}
                                    onChange={(e) => setNumSeats(parseInt(e.target.value) || 3)}
                                    className="simulation-input"
                                />
                            </div>
                        </div>

                        <div className="quota-display">
                            <strong>Quota will be:</strong> {Math.floor(numSimulatedVoters / (numSeats + 1)) + 1} votes needed to guarantee election
                        </div>

                        <button
                            onClick={runPRSTVTest}
                            disabled={candidates.length < 2}
                            className={`run-simulation-btn ${candidates.length < 2 ? 'disabled' : 'enabled'}`}
                        >
                            Run PR-STV Simulation for BallyBeg
                        </button>

                        {showPRSTVSimulation && ( 
                            <button
                                onClick={() => setShowPRSTVSimulation(!showPRSTVSimulation)}
                                className="show-results-btn"
                            >
                                {showPRSTVSimulation ? "Hide" : "Show"} PR-STV Results
                            </button>
                        )}

                        {candidates.length < 2 && (
                            <div className="simulation-notice">
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

                    <hr />

                    {/* Ballot Testing */}
                    <h3>Ballot Testing</h3>
                    <div className="ballot-testing">
                        <button
                            onClick={() => setShowBallotPreview(!showBallotPreview)}
                            className="preview-ballot-btn"
                        >
                            {showBallotPreview ? "Hide Ballot Preview" : "Show BallyBeg Ballot Preview"}
                        </button>
                        <p>Preview how the ballot will appear to voters in BallyBeg, Co. Donegal</p>
                    </div>

                    {showBallotPreview && (
                        <DigitalBallot 
                            candidates={candidates}
                            rankings={{}}
                            onRankingChange={() => {}} 
                            onSubmit={() => {}}
                            hasVoted={false}
                            votingClosed={false}
                            isPreviewMode={true}
                            isRankingSystem={true}
                            constituency="BallyBeg"
                            userConstituency="BallyBeg"
                        />
                    )}

                    {/* Testing Controls */}
                    <h3>Testing Controls</h3>
                    <div className="testing-controls">
                        <p>
                            <strong>Testing Only:</strong> These controls are for development testing.
                        </p>
                        <button
                            onClick={() => {
                                if (window.confirm("Reset vote status for testing? This only affects the UI, not the blockchain.")) {
                                    window.location.reload();
                                }
                            }}
                            className="reset-ui-btn"
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
                            className="clear-data-btn"
                        >
                            Clear All Data & Reload
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPanel;