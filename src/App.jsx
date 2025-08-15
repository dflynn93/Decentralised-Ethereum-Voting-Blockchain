import React, { useState, useEffect } from "react";
import { getContract, getCandidates, hasUserVoted, submitRanking, isCurrentUserAdmin } from "./VotingContract.js";
import { ethers } from "ethers";

import AdminPanel from "../components/AdminPanel.jsx";
import ObserverPanel from "../components/ObserverPanel.jsx";
import VoterPanel from "../components/VoterPanel.jsx";
import Footer from "./footer.jsx";

// import RegistrationAccess from "../components/RegistrationAccess.jsx";


window.getStatusColor = function(status) {
    if (status === 'active' || status === 'open') return '#28a745';
    if (status === 'closed' || status === 'ended') return '#dc3545'; 
    if (status === 'pending') return '#ffc107';
    return '#6c757d';
};


// AWS Backend URL - For Deployment
const AWS_BACKEND_URL = 'http://localhost:3001';

function App() {
    const [walletAddress, setWalletAddress] = useState('');
    const [contract, setContract] = useState(null);
    const [provider, setProvider] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [hasVoted, setHasVoted] = React.useState(false);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [votingClosed, setVotingClosed] = useState(
        localStorage.getItem("votingClosed") === "true"
    );
    const [votingHistory, setVotingHistory] = useState(
        JSON.parse(localStorage.getItem("votingHistory") || "[]")
    );
    const [connectionStatus, setConnectionStatus] = useState("");

    // State variables for observer panel
    const [electionCalled, setElectionCalled] = useState(false);
    const [electionCalledDate, setElectionCalledDate] = useState(null);
    const [nominationDeadline, setNominationDeadline] = useState(null);

    // Election phase state - sync with AdminPanel localStorage
    const [electionPhase, setElectionPhase] = useState(() => {
        return localStorage.getItem('adminPanel_votingPhase') || 'PRE_ELECTION';
    });

    const [electionCalledState, setElectionCalledState] = useState(() => {
        const saved = localStorage.getItem('adminPanel_electionCalled');
        return saved ? JSON.parse(saved) : false;
    });

    const [nominationDeadlineState, setNominationDeadlineState] = useState(() => {
        const saved = localStorage.getItem('adminPanel_nominationDeadline');
        return saved ? new Date(saved) : null;
    });


    useEffect(() => {
        const init = async () => {
            // Wait for MetaMask to inject
            await new Promise((resolve) => setTimeout(resolve, 100));

            if (typeof window !== 'undefined' && window.ethereum) {
                try {
                    // Don't automatically request accounts, let user click connect
                    setLoading(false);
                } catch (error) {
                    console.error("Error initialising app:", error);
                    setLoading(false);
                }
            } else {
                console.log("MetaMask not detected.");
                setLoading(false);
            }
        };
        
        init();
    }, []);

    useEffect(() => {
        const syncElectionState = () => {
            const phase = localStorage.getItem('adminPanel_votingPhase') || 'PRE_ELECTION';
            const called = localStorage.getItem('adminPanel_electionCalled');
            const deadline = localStorage.getItem('adminPanel_nominationDeadline');

            setElectionPhase(phase);
            setElectionCalledState(called ? JSON.parse(called) : false);
            setNominationDeadlineState(deadline ? new Date(deadline) : null);
        };

        // Listen for storage changes
        window.addEventListener('storage', syncElectionState);

        // Also check periodically in case changes happen in same tab
        const interval = setInterval(syncElectionState, 1000);

        return () => {
            window.removeEventListener('storage', syncElectionState);
            clearInterval(interval);
        };
    }, []);

    const initialiseWallet = async () => {
        if (!window.ethereum) {
            alert("MetaMask not detected. Please install it to use this app.");
            return;
        }

        setConnectionStatus("Connecting to MetaMask...");
        
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            setConnectionStatus("Connected! Loading contract...");

            const ethersProvider = new ethers.BrowserProvider(window.ethereum);
            const signer = await ethersProvider.getSigner();
            const address = await signer.getAddress();

            setWalletAddress(address);
            setProvider(ethersProvider);

            const VotingContract = await getContract();
            setContract(VotingContract);

            setConnectionStatus("Checking vote status...");
            const voted = await hasUserVoted(address);
            setHasVoted(voted);

            setConnectionStatus("Loading candidates...");
            const candidateList = await getCandidates();
            setCandidates(candidateList);

            setConnectionStatus("Checking admin status...");
            const adminStatus = await isCurrentUserAdmin();
            setIsAdmin(adminStatus);

            setConnectionStatus("Wallet connected successfully!");
            setLoading(false);

            setTimeout(() => setConnectionStatus(""), 3000); // Clear status after 3 seconds

        } catch (error) {
            console.error("Wallet connection failed:", error);
            if (error.code === 4001) {
                setConnectionStatus("Wallet connection rejected by user.");
            } else {
                setConnectionStatus("Wallet connection failed: " + error.message);
            }
            setTimeout(() => setConnectionStatus(""), 5000);
        }
    };
       
    const handleSubmitRanking = async (rankedCandidateIds) => {
        try {
            setConnectionStatus("Submitting your vote to blockchain...");
            await submitRanking(rankedCandidateIds);

            setConnectionStatus("Vote submitted! Refreshing data...");
            const updated = await getCandidates();
            setCandidates(updated);
            setHasVoted(true);

            setConnectionStatus("Vote successfully recorded!");
            setTimeout(() =>setConnectionStatus(""), 3000);
        } catch (err) {
            console.error("Failed to submit ranking:", err);
            setConnectionStatus("Vote failed: " + err.message);
            setTimeout(() => setConnectionStatus(""), 5000);
        }
    };

    const onToggleVoting = () => {
        const newState = !votingClosed;
        const timestamp = new Date().toLocaleString();
        const action = newState ? "closed" : "opened";

        setVotingClosed(newState);
        localStorage.setItem("votingClosed", newState.toString());

        const newHistory = [...votingHistory, {
            timestamp,
            action,
            admin: walletAddress
        }];
        setVotingHistory(newHistory);
        localStorage.setItem("votingHistory", JSON.stringify(newHistory));

        alert(`Voting has been ${action} at ${timestamp}.`);
    };

    const refreshCandidates = async () => {
        try {
            const candidateList = await getCandidates();
            setCandidates(candidateList);
            setConnectionStatus("Candidates refreshed!");
            setTimeout(() => setConnectionStatus(""), 2000);
        } catch (error) {
            console.error("Failed to refresh candidates:", error);
            setConnectionStatus("Failed to refresh candidates: " + error.message);
            setTimeout(() => setConnectionStatus(""), 3000);
        }
    };

    const resetVoteStatus = () => {
        setHasVoted(false);
        alert("Vote status has been reset for testing purposes. Note: This only affects the UI, not the blockchain.");
    };

    const connectWallet = async () => {
        await initialiseWallet();
    };

    return (
        <div style={{ padding: '2rem' }}>
            {/* Top Navigation with Wallet Connection */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '2rem',
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
            }}>
                <div>
                    <h1 style={{ margin: '0', fontSize: '1.8rem' }}>Eirvote - Blockchain Voting System</h1>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                        Deployed on AWS - Backend: {AWS_BACKEND_URL}
                    </p>
                </div>
                
                {/* Wallet Connection Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {!walletAddress ? (
                        <button 
                            onClick={connectWallet}
                            style={{
                                padding: '0.8rem 1.5rem',
                                fontSize: '1rem',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                            disabled={!!connectionStatus}
                        >
                            {connectionStatus ? 'Connecting...' : "Connect MetaMask"}
                        </button>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                    Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                </div>
                                {isAdmin && (
                                    <div style={{ fontSize: '0.8rem', color: '#dc3545', fontWeight: 'bold' }}>
                                        Admin Account
                                    </div>
                                )}
                                {hasVoted && (
                                    <div style={{ fontSize: '0.8rem', color: '#28a745' }}>
                                        Already Voted
                                    </div>
                                )}
                            </div>
                            
                            {/* Role Selector */}
                            {walletAddress && (
                                <select 
                                    onChange={(e) => {
                                        setRole(e.target.value);
                                    }} 
                                    value={role}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <option value="">Select Role</option>
                                    <option value="voter">Voter</option>
                                    {isAdmin && <option value="admin">Admin</option>}
                                    <option value="observer">Observer</option>
                                </select>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Connection Status */}
            {connectionStatus && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    backgroundColor: connectionStatus.includes('successfully') || connectionStatus.includes('submitted') ? '#d4edda' :
                        connectionStatus.includes('failed') || connectionStatus.includes('rejected') ? '#f8d7da' : '#d1ecf1',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                }}>
                 {connectionStatus}
            </div>
            )}

            {/* Role Selection Warning */}
            {walletAddress && !isAdmin && role === "admin" && (
                <div style={{ 
                    marginBottom: '1rem', 
                    padding: '1rem',
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '4px',
                    color: '#721c24'
                }}>
                    You are not the contract admin. Admin functions will not work.
                </div>
            )}

            {/* Welcome Message for Non-Connected Users */}
            {!walletAddress && (
                <div style={{ 
                    textAlign: 'center', 
                    margin: '3rem 0',
                    padding: '2rem',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '8px',
                    border: '1px solid #bbdefb'
                }}>
                    <h2 style={{ color: '#1976d2', marginBottom: '1rem' }}>Welcome to Eirvote</h2>
                    <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '1.5rem' }}>
                        Ireland's secure blockchain-based voting system. Connect your MetaMask wallet to participate in democratic elections.
                    </p>
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>
                        Secure • Transparent • 🇮🇪 Irish Electoral Standards
                    </div>
                </div>
            )}

            {walletAddress && loading && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>Loading contract data...</p>
                </div>
            )}

            {/* Testing Reset Button - Only show when connected */}
            {walletAddress && (
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                    <button
                        onClick={resetVoteStatus}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ffc107',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Reset Vote Status (Testing)
                    </button>
                </div>
            )}

            {/* Admin Panel Logic */}
            {walletAddress && role === "admin" && !loading && (
                // Show admin panel
                <AdminPanel 
                    candidates={candidates}
                    votingClosed={votingClosed}
                    onToggleVoting={onToggleVoting}
                    onCandidateAdded={refreshCandidates}
                    votingHistory={votingHistory || []}
                    contract={contract}
                    provider={provider}
                    walletAddress={walletAddress}
                />
            )}
                   
            {/* Observer Panel */}
            {walletAddress && role === "observer" && !loading && (
                <ObserverPanel 
                    candidates={candidates} 
                    votingClosed={votingClosed}
                    votingHistory={votingHistory}
                    contract={contract}
                    provider={provider}
                    electionCalled={electionCalled}
                    electionCalledDate={electionCalledDate}
                    nominationDeadline={nominationDeadline}
                />
            )}

            {walletAddress && role === "voter" && !loading && (
                <VoterPanel
                    candidates={candidates}
                    hasVoted={hasVoted}
                    onSubmitRanking={handleSubmitRanking}
                    votingClosed={votingClosed}
                    walletAddress={walletAddress}
                    electionPhase={electionPhase}
                    electionCalled={electionCalledState}
                    nominationDeadline={nominationDeadlineState}
                />
            )}

            {/* Footer */}
            <Footer />
        </div>
    );
}

export default App;