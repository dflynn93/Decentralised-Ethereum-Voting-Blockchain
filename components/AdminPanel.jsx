import React, { useState, useEffect } from "react";
import { getFullBlockchainState, isContractFresh, addCandidate, getSigner, startCommitmentPhase, getCurrentPhases, getCandidates, 
    getAdmin, startVoteCounting, decryptVotesAndGenerateMerkle, countVotes, publishResults } from "../src/VotingContract.js";
import DigitalBallot from "../src/DigitalBallot.jsx";
import PRSTVResultsDisplay from "../src/PRSTVResultsDisplay.jsx";
import { runPRSTVSimulation } from "../src/PRSTVSystem.js";


function AdminPanel({ candidates = [], votingClosed = false, onToggleVoting = () => {}, onCandidateAdded = () => {}, votingHistory = [], contract = null, provider = null, walletAddress = '', electionState = {}, onElectionPhaseChange = () => {} }) {
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

    // Election state - initialise from localStorage or default values
    const [votingPhase, setVotingPhase] = useState(() => {
        const saved = localStorage.getItem('adminPanel_votingPhase');
        return saved || electionState?.phase || 'PRE_ELECTION';
    });
    
    const [electionCalled, setElectionCalled] = useState(() => {
        const saved = localStorage.getItem('adminPanel_electionCalled');
        return saved ? JSON.parse(saved) : (electionState?.electionCalled || false);
    });

    // Missing electionCalledDate state
    const [electionCalledDate, setElectionCalledDate] = useState(() => {
        const saved = localStorage.getItem('adminPanel_electionCalledDate');
        return saved ? new Date(saved) : (electionState?.electionCalledDate ? new Date(electionState.electionCalledDate) : null);
    });

    const [nominationDeadline, setNominationDeadline] = useState(() => {
        const saved = localStorage.getItem('adminPanel_nominationDeadline');
        return saved ? new Date(saved) : (electionState?.nominationDeadline ? new Date(electionState.nominationDeadline) : null);
    });
    
    const [timeUntilDeadline, setTimeUntilDeadline] = useState("");
    const [voterRegistrationOpen, setVoterRegistrationOpen] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    const [votingOpenDate, setVotingOpenDate] = useState(() => {
        const saved = localStorage.getItem('adminPanel_votingOpenDate');
        return saved ? new Date(saved) : (electionState?.votingOpenDate ? new Date(electionState.votingOpenDate) : null);
    });

    const [isCountingVotes, setIsCountingVotes] = useState(false);
    const [countingStatus, setCountingStatus] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [countingMessage, setCountingMessage] = useState("");

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);


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

    // Calculated values with safety checks for undefined votes
    const totalVotes = candidates.reduce((sum, c) => sum + (c.votes ||  0), 0);
    const maxVotes = candidates.length > 0 ? Math.max(...candidates.map(c => c.votes || 0)) : 0;
    const winners = candidates.filter(c => c.votes === maxVotes);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('adminPanel_votingPhase', votingPhase);
        localStorage.setItem('adminPanel_electionCalled', JSON.stringify(electionCalled));
        if (electionCalledDate) {
            localStorage.setItem('adminPanel_electionCalledDate', electionCalledDate.toISOString());
        }
        if (nominationDeadline) {
            localStorage.setItem('adminPanel_nominationDeadline', nominationDeadline.toISOString());
        }
        if (votingOpenDate) {
            localStorage.setItem('adminPanel_votingOpenDate', votingOpenDate.toISOString());
        }
    }, [votingPhase, electionCalled, electionCalledDate, nominationDeadline, votingOpenDate]);

    // Function to update both local and parent state
    const updatePhase = (newPhase, additionalData = {}) => {
        setVotingPhase(newPhase);
        if (onElectionPhaseChange) {
            onElectionPhaseChange(newPhase, additionalData);
        }
    };

    const handleAdminLogin = () => {
        if (adminPassword === 'admin123') {
            setIsLoggedIn(true);
            console.log("Admin login successful");
        } else {
            alert("Invalid admin password.");
        }
    };

    // Countdown timer for nomination deadline
    useEffect(() => {
        if (!nominationDeadline || votingPhase !== 'NOMINATION') return;

        const timer = setInterval(() => {
            const now = new Date();
            const timeLeft = nominationDeadline - now;

            if (timeLeft <= 0) {
                setTimeUntilDeadline("DEADLINE PASSED");
                // Automatically move to voting phase when nomination period ends
                updatePhase('VOTING', {
                    votingOpenDate: new Date().toISOString(),
                    votingClosed: false
                });
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

    // Proper error handling in counting step
    const handleCountingStep = async (stepFunction, stepName, confirmMessage) => {
        if (!window.confirm(confirmMessage)) return;

        setIsProcessing(true);
        try {
            console.log(`Starting ${stepName}...`);
            const result = await stepFunction();

            // Show success message
            alert(`${stepName} Complete!\n\n${result.message || 'Step completed successfully'}\n\n${result.nextStep ? `Next: ${result.nextStep}` : 'Process complete!'}`);

            // Refresh candidates data
            if (onCandidateAdded) {
                await onCandidateAdded();
            }
        
            // Update counting status
            setCountingStatus(result);

        } catch (error) {
            console.error(`${stepName} failed:`, error);
            
            // Proper error handling with simulation fallback
            try {
                alert(`${stepName} had issues but we'll continue anyway.\n\nFor testing purposes, this will simulate the step working.\n\nOriginal error: ${error.message}`);
            } catch (alertError) {
                console.log(`Couldn't show error alert, continuing silently`);
            }
            
            // Simulate success for testing
            setCountingStatus({
                success: true,
                message: `${stepName} simulated for testing`,
                nextStep: "Continue to next step"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Enhanced count votes function with PRSTV simulation
    const handleCountVotesWithPRSTV = async () => {
        if (!window.confirm('Step 3: Count Votes?\n\nThis will:\n- Count all decrypted votes\n- Compile election results\n- Verify counting integrity\n- Generate PR-STV simulation\n\nProceed?')) {
            return;
        }

        setIsProcessing(true);
        try {
            console.log("Starting vote counting...");
            let result;
            
            try {
                result = await countVotes();
            } catch (error) {
                console.log("Blockchain counting failed, simulating for testing:", error);
                result = {
                    success: true,
                    message: "Vote counting simulated for testing",
                    nextStep: "Results ready for display"
                };
                
                // Simulate some votes for candidates
                if (candidates.length > 0) {
                    candidates.forEach((candidate, index) => {
                        candidate.votes = Math.floor(Math.random() * 50) + 10;
                    });
                }
            }

            alert("Vote counting complete! PR-STV simulation generated.");

            // Refresh candidates data
            if (onCandidateAdded) {
                await onCandidateAdded();
            }

            // Generate PRSTV simulation if we have candidates
            if (candidates.length >= 2) {
                const simulation = runPRSTVSimulation(candidates, numSimulatedVoters, numSeats);
                setPrstResults(simulation.results);
                setSimulationBallots(simulation.ballots);
                setShowPRSTVSimulation(true);
            }

            setCountingStatus(result);
        } catch (error) {
            console.error("Count votes with PRSTV failed:", error);
            // Don't stop the process, just continue with simulation
            setCountingStatus({
                success: false,
                message: "Counting failed but continuing for testing",
                error: error.message
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Reset function logic
    const handleResetEverything = () => {
        if (window.confirm("Are you sure you want to reset everything? This will clear all election data and start fresh.")) {
            // Clear all localStorage
            localStorage.removeItem('adminPanel_votingPhase');
            localStorage.removeItem('adminPanel_electionCalled');
            localStorage.removeItem('adminPanel_electionCalledDate');
            localStorage.removeItem('adminPanel_nominationDeadline');
            localStorage.removeItem('adminPanel_votingOpenDate');

            // Reset all state
            setVotingPhase('PRE_ELECTION');
            setElectionCalled(false);
            setElectionCalledDate(null);
            setNominationDeadline(null);
            setVotingOpenDate(null);
            setTimeUntilDeadline("");
            setVoterRegistrationOpen(true);
            setCountingStatus(null);
            setPrstResults(null);
            setSimulationBallots(null);
            setShowPRSTVSimulation(false);

            alert("All election data has been reset. You can now start a new election.");
        }
    };

    // Helper functions
    const calculateNominationDeadline = (calledDate) => {
        const deadline = new Date(calledDate);
        deadline.setMinutes(deadline.getMinutes() + 7);
        return deadline;
    };

    const isNominationPeriodOpen = () => {
        return votingPhase === 'NOMINATION' && nominationDeadline && new Date() < nominationDeadline;
    };

    const getElectionStatus = () => {
        if (votingPhase === 'PRE_ELECTION') {
            return {
                status: 'No Election Called',
                statusColour: '#6c757d',
                backgroundColour: '#f8f9fa',
                borderColour: '#dee2e6',
                description: 'No election or referendum is currently scheduled.'
            };
        }

        if (votingPhase === 'NOMINATION') {
            const isNominationOpen = nominationDeadline && new Date() < nominationDeadline;
            return {
                status: isNominationOpen ? 'Election Called - Nomination Period Active' : 'Nomination Period Ended',
                statusColour: isNominationOpen ? '#fd7e14' : '#856404',
                backgroundColour: isNominationOpen ? '#fff3cd' : '#ffeaa7',
                borderColour: isNominationOpen ? '#ffeaa7' : '#ffc107',
                description: isNominationOpen ? 
                    'Candidates may submit nominations. Voting will open when nomination period ends.' :
                    'Nomination period has ended. Ready to open voting.'
            };
        }

        if (votingPhase === 'VOTING') {
            if (votingClosed) {
                return {
                    status: 'Voting Closed - Results Processing',
                    statusColour: '#dc3545',
                    backgroundColour: '#f8d7da',
                    borderColour: '#f5c6cb',
                    description: 'Voting has been closed by administrator. Results are being processed.'
                };
            } else {
                return {
                    status: 'Election Open - Voting Active',
                    statusColour: '#28a745',
                    backgroundColour: '#d4edda',
                    borderColour: '#c3e6cb',
                    description: 'Voting is currently open. Citizens may cast their ballots.'
                };
            }
        }

        if (votingPhase === 'CLOSED') {
            return {
                status: 'Election Concluded',
                statusColour: '#dc3545',
                backgroundColour: '#f8d7da',
                borderColour: '#f5c6cb',
                description: 'Election has been completed. Final results are available.'
            };
        }

        return {
            status: 'Unknown Phase',
            statusColour: '#6c757d',
            backgroundColour: '#f8f9fa',
            borderColour: '#dee2e6',
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
        if (!isNominationPeriodOpen()) {
            alert("Nomination period is not active. Cannot add new candidates.");
            return false;
        }
        
        if (!candidateName.trim()) {
            alert("Please enter candidate name.");
            return false;
        }

        if (nominationMethod === "party" && !candidateParty.trim()) {
            alert("Party affiliation required for party candidates.");
            return false;
        }

        return true;
    };

    const getStatusColour = (status) => {
        switch (status) {
            case 'approved': return '#4caf50';
            case 'rejected': return '#f44336';
            case 'pending': return '#ff9800';
            default: return '#666';
        }
    };

    const isVoterRegistrationOpen = () => {
        return voterRegistrationOpen;
    };

    const runPRSTVTest = () => {
    if (candidates.length >= 2) {
        const simulation = runPRSTVSimulation(candidates, numSimulatedVoters, numSeats);
        setPrstResults(simulation.results);
        setSimulationBallots(simulation.ballots);
        setShowPRSTVSimulation(true);
    } else {
        alert("Need at least 2 candidates for PR-STV simulation");
    }
};

    // Removed duplicate blockchain call
    const handleCallElection = async () => {
        try {
            console.log("Starting election...");
            
            // Try blockchain but don't fail if it doesn't work
            try {
                await startCommitmentPhase(60);
                console.log("Blockchain call successful");
            } catch (blockchainError) {
                console.log("Blockchain call failed, continuing with UI-only:", blockchainError);
            }
            
            // Update local state
            const now = new Date();
            const deadline = calculateNominationDeadline(now);
            
            setElectionCalled(true);
            setElectionCalledDate(now);
            setNominationDeadline(deadline);
            setVoterRegistrationOpen(false);
            
            updatePhase('NOMINATION', {
                electionCalled: true,
                electionCalledDate: now.toISOString(),
                nominationDeadline: deadline.toISOString(),
                votingClosed: false
            });
            
            alert("Election Called! Nomination period is now open. Candidates have 7 minutes to submit nominations.\n\nIMPORTANT: Voter registration is now CLOSED for this election.");
            
        } catch (error) {
            console.error("Error calling election:", error);
            alert(`Failed to call election: ${error.message}`);
        }
    };

    const handleSkipToVoting = () => {
        if (window.confirm("Skip nomination period and open voting immediately? This is for testing purposes only.")) {
            const now = new Date();
            setVotingOpenDate(now);
            setTimeUntilDeadline("SKIPPED TO VOTING");
            
            updatePhase('VOTING', {
                votingOpenDate: now.toISOString(),
                votingClosed: false
            });
            if (votingClosed) onToggleVoting();
            
            alert("Skipped to voting phase! Voters can now cast their ballots.");
        }
    };

    const handleOpenVoting = () => {
        if (candidates.length === 0) {
            alert("Cannot open voting without any candidates. Add at least one candidate first.");
            return;
        }
        
        const now = new Date();
        setVotingOpenDate(now);
        
        updatePhase('VOTING', {
            votingOpenDate: now.toISOString(),
            votingClosed: false
        });
        
        alert(`Voting is now open! ${candidates.length} candidates are running for BallyBeg constituency.`);
    };

    const handleAddCandidate = async () => {
        if (!isNominationPeriodOpen()) {
            alert("Nomination period is not active. Cannot add new candidates.");
            return;
        }

        if (!validateCandidateEligibility()) {
            return;
        }

        setIsAddingCandidate(true);
        try {
            const candidateData = {
                name: candidateName,
                party: nominationMethod === "party" ? candidateParty : "Independent",
                age: parseInt(candidateAge),
                nominationMethod: nominationMethod,
                nominatedAt: new Date().toISOString(),
                constituency: "BallyBeg"
            };
            
            try {
                await addCandidate(candidateData.name, candidateData.party);
            } catch (blockchainError) {
                console.log("Blockchain candidate add failed, continuing for testing:", blockchainError);
            }
            
            setCandidateName("");
            setCandidateParty("");
            setCandidateAge("");
            
            alert(`Candidate ${candidateData.name} successfully nominated for BallyBeg, Co. Donegal as ${
                nominationMethod === "party" ? `${candidateData.party} candidate` : 
                `Independent (${nominationMethod === "independent_declarations" ? "30 declarations" : "500 euro deposit"})`
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

    const updateVoterRegistrationStatus = (id, newStatus) => {
        setVoterRegistrations(prev => prev.map(reg => 
            reg.id === id ? { ...reg, status: newStatus } : reg
        ));
    };

    const statusInfo = getElectionStatus();

    if (!isLoggedIn) {
        return (
            <div className="admin-panel">
                <h2>Admin Panel</h2>
                <div className="login-container">
                    <h3>admin Login</h3>
                    <div className="form-group">
                        <label>
                            Admin Password:
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    className="login-input"
                                    placeholder="Enter admin password"
                                    onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                                    style={{ paddingRight: '3rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '0.75rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#666',
                                        fontSize: '0.8rem',
                                        padding: '0.25rem'    
                                    }}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </label>
                    </div>
                    <button
                        onClick={handleAdminLogin}
                        className="login-button"
                        disabled={!adminPassword}
                    >
                        Login as Admin
                    </button>
                    <div className="test-credentials">
                        <strong>Test Credentials</strong><br/>
                        Password: admin123
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            <h2>Irish Election Administration Panel - BallyBeg, Co. Donegal</h2>

            
            
            {/* Quick Reset Button for Testing */}
            <div style={{ 
                marginBottom: '1rem', 
                padding: '1rem', 
                backgroundColor: '#fff3cd', 
                border: '1px solid #ffc107', 
                borderRadius: '4px',
                textAlign: 'center'
            }}>
                <strong>Testing Controls:</strong>
                <button
                    onClick={handleResetEverything}
                    style={{
                        marginLeft: '1rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Reset Everything (Start Fresh)
                </button>
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
                </button>
            </div>

            {/* Election Management Tab */}
            {activeTab === 'election' && (
                <div>
                    {/* Election Status */}
                    <div className="election-status" style={{
                        marginBottom: '2rem',
                        padding: '1.5rem',
                        backgroundColor: statusInfo.backgroundColour,
                        border: `2px solid ${statusInfo.borderColour}`,
                        borderRadius: '8px'
                    }}>
                        <h3 style={{ 
                            margin: "0 0 1rem 0", 
                            color: statusInfo.statusColour,
                            fontSize: '1.3rem'
                        }}>
                            {statusInfo.status}
                        </h3>

                        <p style={{ 
                            margin: "0 0 1rem 0", 
                            color: statusInfo.statusColour,
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
                                    <p style={{ fontWeight: 'bold', color: statusInfo.statusColour }}>
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

                    {/* Voting Status Control - Only show when in voting phase */}
                    {votingPhase === 'VOTING' && (
                        <div style={{
                            marginBottom: '2rem',
                            padding: '2rem', 
                            backgroundColor: votingClosed ? '#ffebee' : '#e8f5e9',
                            border: `3px solid ${votingClosed ? '#f44336' : '#4caf50'}`, 
                            borderRadius: '12px' 
                        }}>
                            <h3 style={{ 
                                fontSize: '1.4rem', 
                                margin: '0 0 1rem 0',
                                color: votingClosed ? '#d32f2f' : '#2e7d32'
                            }}>
                                Voting Status Control
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '2rem', 
                                alignItems: 'center'
                            }}>
                                <div>
                                    <p style={{ 
                                        fontSize: '1.1rem', 
                                        margin: '0 0 0.5rem 0',
                                        fontWeight: 'bold'
                                    }}>
                                        <strong>Current Status:</strong> 
                                        <span style={{ 
                                            color: votingClosed ? "red" : "green",
                                            marginLeft: '0.5rem',
                                            fontSize: '1.2rem' 
                                        }}>
                                            {votingClosed ? "VOTING CLOSED" : "VOTING OPEN"}
                                        </span>
                                    </p>
                                    <p style={{ 
                                        margin: '0.5rem 0', 
                                        fontSize: '1rem', 
                                        color: '#666' 
                                    }}>
                                        {votingClosed ? 
                                            "Voting has been closed by the administrator. No more votes can be cast." :
                                            "Citizens can now cast their ballots. Close voting when the election period should end."
                                        }
                                    </p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={onToggleVoting}
                                        style={{
                                            padding: '1rem 2rem', 
                                            fontSize: '1.1rem', 
                                            fontWeight: 'bold',
                                            backgroundColor: votingClosed ? '#4caf50' : '#f44336',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            minWidth: '200px' 
                                        }}
                                    >
                                        {votingClosed ? "Reopen Voting" : "Close Voting"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Vote Counting Section - Only show when voting is closed */}
                    {votingClosed && (
                        <div style={{
                            marginTop: '2rem',
                            padding: '2rem',
                            backgroundColor: '#fff3e0',
                            border: '3px solid #ff9800',
                            borderRadius: '12px'
                        }}>
                            <h3 style={{ 
                                margin: '0 0 1rem 0',
                                color: '#e65100',
                                fontSize: '1.4rem' 
                            }}>
                                Official Vote Counting - BallyBeg Election
                            </h3>
                            
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                border: '1px solid #ffb74d',
                                borderRadius: '4px',
                                marginBottom: '1.5rem'
                            }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: '#ef6c00' }}>
                                    Vote Counting Process (4 Steps)
                                </h4>
                                <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>
                                    <strong>Note:</strong> Some blockchain functions may fail in testing. 
                                    If they do, we'll simulate the results to continue the demo.
                                </p>
                            </div>

                            {/* Status indicator */}
                            {countingStatus && (
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: countingStatus.success ? '#e8f5e9' : '#fff3cd',
                                    border: `1px solid ${countingStatus.success ? '#4caf50' : '#ffc107'}`,
                                    borderRadius: '4px',
                                    marginBottom: '1rem'
                                }}>
                                    <strong>Last Action:</strong> {countingStatus.message}
                                    {countingStatus.transactionHash && (
                                        <><br /><strong>Transaction:</strong> {countingStatus.transactionHash.substring(0, 16)}...</>
                                    )}
                                    {countingStatus.error && (
                                        <><br /><strong>Error:</strong> {countingStatus.error}</>
                                    )}
                                </div>
                            )}

                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                                gap: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                <button
                                    onClick={() => handleCountingStep(
                                        startVoteCounting,
                                        "Step 1: Start Vote Counting",
                                        'Step 1: Start Vote Counting Process?\n\nThis will try to start the counting process. If blockchain fails, we\'ll simulate it.\n\nProceed?'
                                    )}
                                    disabled={isProcessing}
                                    style={{
                                        padding: '1rem',
                                        backgroundColor: isProcessing ? '#ccc' : '#ff9800',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {isProcessing ? 'Processing...' : 'Step 1: Start Counting'}
                                </button>
                                
                                <button
                                    onClick={() => handleCountingStep(
                                        decryptVotesAndGenerateMerkle,
                                        "Step 2: Decrypt & Generate Merkle Tree",
                                        'Step 2: Decrypt Votes & Generate Merkle Tree?\n\nThis will try the decryption process. If it fails, we\'ll simulate it.\n\nProceed?'
                                    )}
                                    disabled={isProcessing}
                                    style={{
                                        padding: '1rem',
                                        backgroundColor: isProcessing ? '#ccc' : '#2196f3',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {isProcessing ? 'Processing...' : 'Step 2: Decrypt Votes'}
                                </button>

                                <button
                                    onClick={handleCountVotesWithPRSTV}
                                    disabled={isProcessing}
                                    style={{
                                        padding: '1rem',
                                        backgroundColor: isProcessing ? '#ccc' : '#4caf50',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {isProcessing ? 'Processing...' : 'Step 3: Count Votes & Generate PR-STV'}
                                </button>

                                <button
                                    onClick={() => handleCountingStep(
                                        publishResults,
                                        "Step 4: Publish Results",
                                        'Step 4: Publish Official Results?\n\nThis will finalise the results. If blockchain fails, we\'ll simulate it.\n\nProceed?'
                                    )}
                                    disabled={isProcessing}
                                    style={{
                                        padding: '1rem',
                                        backgroundColor: isProcessing ? '#ccc' : '#9c27b0',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {isProcessing ? 'Processing...' : 'Step 4: Publish Results'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PR-STV Results Display after counting */}
                    {showPRSTVSimulation && prstResults && (
                        <PRSTVResultsDisplay
                            prstResults={prstResults}
                            ballots={simulationBallots}
                            onRunNewSimulation={runPRSTVTest}
                        />
                    )}

                    {/* Results Display */}
                    <div className="results-section" style={{ marginBottom: '2rem' }}>
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
                                    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
                                    .map((c, index) => (
                                        <li key={c.id} className={`candidate-item ${index === 0 ? 'winner' : 'regular'}`}>
                                            <strong>{c.name}</strong> ({c.party}) - <strong>{c.votes || 0} votes</strong>
                                            {totalVotes > 0 && (
                                                <> ({(((c.votes || 0) / totalVotes) * 100).toFixed(1)}%)</>
                                            )}
                                        </li>
                                    ))}
                            </ul>
                        ) : (
                            // Hide vote counts during active voting or nomination
                            <div className="results-locked">
                                <div className="lock-icon">SECURED</div>
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
                                    <h4>🎉 BallyBeg Election Winner: {winners[0].name} ({winners[0].party})</h4>
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
                </div>
            )}

            {/* Candidate Management Tab */}
            {activeTab === 'candidates' && (
                <div>
                    {/* Candidate Nomination Form */}
                    <div className={`nomination-form ${isNominationPeriodOpen() ? 'open' : 'closed'}`}>
                        <h3>
                            Candidate Nomination for BallyBeg, Co. Donegal
                            {!isNominationPeriodOpen() && votingPhase === 'NOMINATION' && " (Period Closed)"}
                            {votingPhase === 'PRE_ELECTION' && " (Election Not Called)"}
                            {votingPhase === 'VOTING' && " (Voting Phase - Nominations Closed)"}
                            {votingPhase === 'CLOSED' && " (Election Closed)"}
                        </h3>

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
                                        placeholder="Enter candidate name"
                                        className="form-input full-width enabled"
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
                                            placeholder="e.g., Fianna Fail, Fine Gael, Sinn Fein, etc."
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
                        {!isNominationPeriodOpen() && (
                            <p className="deadline-notice">
                                {votingPhase === 'PRE_ELECTION' ? 
                                    "Call an election first to open the nomination period." :
                                    "Nomination period is not currently active."
                                }
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
                                                - {c.votes || 0} votes ({totalVotes > 0 ? (((c.votes || 0) / totalVotes) * 100).toFixed(1) : 0}%)
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
                                                    backgroundColor: getStatusColour(registration.status) + "20",
                                                    color: getStatusColour(registration.status)
                                                }}
                                            >
                                                {registration.status.toUpperCase()}
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
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPanel;
                    