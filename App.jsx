// App.jsx
import React, { useState, useEffect } from "react";
import { getContract, getCandidates, hasUserVoted, submitRanking } from "./VotingContract.js";
import { ethers } from "ethers";

import AdminPanel from "./AdminPanel";
import ObserverPanel from "./ObserverPanel";
import VoterPanel from "./VoterPanel";

function App() {
    const [walletAddress, setWalletAddress] = useState('');
    const [contract, setContract] = useState(null);
    const [provider, setProvider] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [hasVoted, setHasVoted] = React.useState(false);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState('');
    const [votingClosed, setVotingClosed] = useState(
        localStorage.getItem("votingClosed") === "true"
    );
    const [votingHistory, setVotingHistory] = useState(
        JSON.parse(localStorage.getItem("votingHistory") || "[]")
    );
    const [connectionStatus, setConnectionStatus] = useState("");

    useEffect(() => {
        const init = async () => {
            // Wait for MetaMask to inject
            await new Promise((resolve) => setTimeout(resolve, 100));

            if (typeof window !== 'undefined' && window.ethereum) {
                try {
                    // Don't automatically request accounts, let user click connect
                    setLoading(false);
                } catch (error) {
                    console.error("Error initializing app:", error);
                    setLoading(false);
                }
            } else {
                console.log("MetaMask not detected.");
                setLoading(false);
            }
        };
        
        init();
    }, []);

    const initializeWallet = async () => {
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

            const voted = await hasUserVoted(address);
            setHasVoted(voted);

            const candidateList = await getCandidates();
            setCandidates(candidateList);

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
            await submitRanking(rankedCandidateIds);
            const updated = await getCandidates();
            setCandidates(updated);
            setHasVoted(true);
        } catch (err) {
            console.error("Failed to submit ranking:", err);
            alert("Vote failed: " + err.message);
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

        alert('Voting has been ${action} at ${timestamp}.');
    };

    const refreshCandidates = async () => {
        try {
            const candidateList = await getCandidates();
            setCandidates(candidateList);
        } catch (error) {
            console.error("Failed to refresh candidates:", error);
        }
    };

    const resetVoteStatus = () => {
        setHasVoted(false);
        alert("Vote status has been reset for testing purposes.");
    };

    const connectWallet = async () => {
        await initializeWallet();
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Eirvote - Blockchain Voting System</h1>
            
            {/* Connection Status */}
            {connectionStatus && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    backgroundColor: connectionStatus.includes('Yes') ? '#d4edda' :
                        connectionStatus.includes('No') ? '#f8d7da' : '#d1ecf1',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                }}>
                 {connectionStatus}
            </div>
            )}

            {/* Wallet Info */}
            <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <strong>Wallet Address:</strong> {walletAddress ?
                    'Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}' :
                    'Not connected'
                }
                {hasVoted && walletAddress && (
                    <div style={{ marginTop: '0.5rem', color: '#28a745' }}>
                        You have already voted in this election.
                    </div>
                )}
            </div>

            {!walletAddress && (
                <div style={{ textAlign: 'center', margin: '1rem' }}>
                <h3>Connect your Wallet to Start Voting</h3>
                <p>You need to connect your MetaMask wallet to participate in the voting process.</p>
                <button 
                    onClick={connectWallet}
                    style={{
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                    disabled={!!connectionStatus}
                    >
                        {connectionStatus ? 'Connecting...' : "Connect MetaMask Wallet"}
                    </button>
                </div>
            )}

            {walletAddress && (
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        Select Role:{" "}
                        <select onChange={(e) => setRole(e.target.value)} value={role}>
                            <option value="">-- choose --</option>
                            <option value="voter">Voter</option>
                            <option value="admin">Admin</option>
                            <option value="observer">Observer</option>
                        </select>
                    </label>
                </div>
            )}

            {walletAddress && loading && (
                <p>Loading contract data...</p>
            )}

            {/* Testing Reset Button */}
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

            {walletAddress && role === "admin" && !loading && (
                <AdminPanel 
                    candidates={candidates}
                    votingClosed={votingClosed}
                    onToggleVoting={onToggleVoting}
                    onCandidateAdded={refreshCandidates}
                    votingHistory={votingHistory || []}
                />
            )}

            {walletAddress && role === "observer" && !loading && (
                <ObserverPanel 
                candidates={candidates} 
                votingClosed={votingClosed}
                votingHistory={votingHistory}/>
            )}

            {walletAddress && role === "voter" && !loading && (
                <VoterPanel
                    candidates={candidates}
                    hasVoted={hasVoted}
                    onSubmitRanking={handleSubmitRanking}
                    votingClosed={votingClosed}
                />
            )}

            {/* Blockchain Badge */}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                padding: '8px 15px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #00ff88',
                borderRadius: '20px',
                boxShadow: '0 2px 8px rgba(0,255,136,0.3)',
                color: '#00ff88',
                fontSize: '12px',
                fontWeight: 'bold',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <span style={{ color: '#00ff88', fontSize: '14px' }}>🔗</span>
                Powered & Secured by Blockchain
            </div>
                          
        </div>
    );
}

export default App;
