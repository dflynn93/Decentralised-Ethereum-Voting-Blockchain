// App.jsx - FIXED VERSION
import React, { useState, useEffect } from "react";
import { getContract, getCandidates, hasUserVoted, submitRanking, isCurrentUserAdmin } from "./VotingContract.js";
import { ethers } from "ethers";

import AdminPanel from "../components/AdminPanel.jsx";
import ObserverPanel from "../components/ObserverPanel";
import VoterPanel from "../components/VoterPanel.jsx";
import Footer from "./footer.jsx";
import SSHKeyVerification from "../components/SSHKeyVerification.jsx";

// Simple Admin Login Component
const SimpleAdminLogin = ({ onAdminLogin, walletAddress }) => {
    const [adminPassword, setAdminPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');

    const handleAdminLogin = async () => {
        console.log('STARTING ADMIN LOGIN PROCESS');
        setIsVerifying(true);
        setError('');

        try {
            console.log('Sending admin verification request to backend...');
            console.log('Wallet:', walletAddress);
            console.log('Password:', adminPassword);
            
            const response = await fetch('http://localhost:3001/api/admin/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress: walletAddress,
                    password: adminPassword
                }),
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Backend response:', data);

            if (data.success) {
                console.log('SUCCESS! Calling onAdminLogin...');
                onAdminLogin(true);
            } else {
                console.log('FAILED:', data.error);
                setError(data.error || 'Admin verification failed');
            }
        } catch (error) {
            console.error('NETWORK ERROR:', error);
            setError('Connection error: ' + error.message);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div style={{ 
            minHeight: "100vh", 
            background: "linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #3730a3 100%)",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            padding: "1rem"
        }}>
            <div style={{
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "2rem",
                width: "100%",
                maxWidth: "400px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}>
                <h2 style={{ fontSize: "1.875rem", fontWeight: "bold", color: "white", marginBottom: "1.5rem", textAlign: "center" }}>
                    Admin Access
                </h2>
                
                <div style={{ marginBottom: "1.5rem", background: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(147, 197, 253, 0.3)", borderRadius: "8px", padding: "1rem" }}>
                    <p style={{ color: "#BFDBFE", fontSize: "0.875rem", margin: 0 }}>
                        <strong>Connected Wallet:</strong><br />
                        {walletAddress}
                    </p>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", color: "white", fontWeight: "500", marginBottom: "0.5rem" }}>
                        Admin Password
                    </label>
                    <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter admin password"
                        style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            background: "rgba(255, 255, 255, 0.1)",
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            borderRadius: "8px",
                            color: "white",
                            outline: "none"
                        }}
                        onKeyPress={(e) => e.key === 'Enter' && !isVerifying && handleAdminLogin()}
                    />
                </div>

                {error && (
                    <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(252, 165, 165, 0.3)", borderRadius: "8px", padding: "0.75rem", marginBottom: "1rem" }}>
                        <p style={{ color: "#FECACA", fontSize: "0.875rem", margin: 0 }}>{error}</p>
                    </div>
                )}

                <button
                    onClick={handleAdminLogin}
                    disabled={isVerifying || !adminPassword.trim()}
                    style={{
                        width: "100%",
                        background: "linear-gradient(to right, #2563eb, #7c3aed)",
                        color: "white",
                        fontWeight: "600",
                        padding: "0.75rem 1.5rem",
                        borderRadius: "8px",
                        border: "none",
                        cursor: isVerifying || !adminPassword.trim() ? "not-allowed" : "pointer",
                        opacity: isVerifying || !adminPassword.trim() ? 0.5 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem"
                    }}
                >
                    {isVerifying ? (
                        <>
                            <div style={{
                                width: "1.25rem",
                                height: "1.25rem",
                                border: "2px solid white",
                                borderTop: "2px solid transparent",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite"
                            }}></div>
                            Verifying...
                        </>
                    ) : (
                        <>
                            Access Admin Panel
                        </>
                    )}
                </button>

                <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: "1rem", marginTop: "1rem" }}>
                    <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.75rem", textAlign: "center", margin: 0 }}>
                        For advanced security, SSH key authentication is also available.
                    </p>
                </div>
            </div>
        </div>
    );
};

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

    const [sshKeyVerified, setSSHKeyVerified] = useState(false);
    const [sshKeyFingerprint, setSSHKeyFingerprint] = useState('');
    const [showSimpleLogin, setShowSimpleLogin] = useState(null);

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
        await initializeWallet();
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
                                        if (e.target.value === "admin") {
                                            setShowSimpleLogin(null); // Reset to choice screen
                                            setSSHKeyVerified(false); // Reset verification
                                        }
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

            {/* Admin Panel Logic - FIXED */}
            {walletAddress && role === "admin" && !loading && (
                // Show admin panel if SSH key is verified (from either login method)
                sshKeyVerified ? (
                    <AdminPanel 
                        candidates={candidates}
                        votingClosed={votingClosed}
                        onToggleVoting={onToggleVoting}
                        onCandidateAdded={refreshCandidates}
                        votingHistory={votingHistory || []}
                        sshKeyFingerprint={sshKeyFingerprint}
                    />
                ) : (
                    // Show login choice screen or specific login method
                    showSimpleLogin === null ? (
                        // Admin login choice screen
                        <div style={{ 
                            minHeight: "50vh", 
                            background: "linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #3730a3 100%)",
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            padding: "1rem",
                            borderRadius: "16px",
                            margin: "2rem 0"
                        }}>
                            <div style={{
                                background: "rgba(255, 255, 255, 0.1)",
                                backdropFilter: "blur(10px)",
                                borderRadius: "16px",
                                padding: "2rem",
                                width: "100%",
                                maxWidth: "400px",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                            }}>
                                <h2 style={{ fontSize: "1.875rem", fontWeight: "bold", color: "white", marginBottom: "1.5rem", textAlign: "center" }}>
                                    Choose Admin Login Method
                                </h2>
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <button
                                        onClick={() => setShowSimpleLogin(true)}
                                        style={{
                                            width: "100%",
                                            background: "linear-gradient(to right, #16a34a, #2563eb)",
                                            color: "white",
                                            fontWeight: "600",
                                            padding: "1rem 1.5rem",
                                            borderRadius: "8px",
                                            border: "none",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "0.5rem"
                                        }}
                                    >
                                        Simple Password Login
                                    </button>
                                    <button
                                        onClick={() => setShowSimpleLogin(false)}
                                        style={{
                                            width: "100%",
                                            background: "linear-gradient(to right, #7c3aed, #ec4899)",
                                            color: "white",
                                            fontWeight: "600",
                                            padding: "1rem 1.5rem",
                                            borderRadius: "8px",
                                            border: "none",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "0.5rem"
                                        }}
                                    >
                                        SSH Key Authentication
                                    </button>
                                    <button
                                        onClick={() => {
                                            setRole('');
                                            setShowSimpleLogin(null);
                                        }}
                                        style={{
                                            width: "100%",
                                            background: "#6b7280",
                                            color: "white",
                                            fontWeight: "600",
                                            padding: "0.5rem 1.5rem",
                                            borderRadius: "8px",
                                            border: "none",
                                            cursor: "pointer"
                                        }}
                                    >
                                        ← Back
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : showSimpleLogin === true ? (
                        // Simple password login
                        <SimpleAdminLogin 
                            onAdminLogin={(success) => {
                                if (success) {
                                    setSSHKeyVerified(true);
                                    setSSHKeyFingerprint('Password-Verified Admin');
                                }
                            }} 
                            walletAddress={walletAddress} 
                        />
                    ) : (
                        // SSH verification
                        <SSHKeyVerification 
                            walletAddress={walletAddress}
                            onVerified={(fingerprint) => {
                                setSSHKeyVerified(true);
                                setSSHKeyFingerprint(fingerprint);
                            }}
                        />
                    )
                )
            )}

            {walletAddress && role === "observer" && !loading && (
                <ObserverPanel 
                    candidates={candidates} 
                    votingClosed={votingClosed}
                    votingHistory={votingHistory}
                />
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

            {/* Footer */}
            <Footer />
        </div>
    );
}

export default App;