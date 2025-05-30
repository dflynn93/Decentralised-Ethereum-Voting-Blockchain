// App/jsx
import React, { useState, useEffect } from "react";
import { getContract, getCandidates, voteForCandidate, hasUserVoted } from "./VotingContract";
import { ethers } from "ethers";

import AdminPanel from "./AdminPanel";
import ObserverPanel from "./ObserverPanel";
import VoterPanel from "./VoterPanel";
import VotingContract from "./VotingContract.js";


function App() {
    const [walletAddress, setWalletAddress] = useState('');
    const [contract, setContract] = useState(null);
    const [provider, setProvider] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [hasVoted, setHasVoted] = React.useState(false);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState('');

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                await window.ethereum.request({ method: "eth_requestAccounts" });
                const ethersProvider = new ethers.BrowserProvider(window.ethereum);
                const signer = await ethersProvider.getSigner();
                const address = await signer.getAddress();

                setWalletAddress(address);
                setProvider(ethersProvider);

                const VotingContract = await getContract(signer);
                setContract(VotingContract);

                const voted = await hasUserVoted(VotingContract, address);
                setHasVoted(voted);

                const candidateList = await getCandidates(VotingContract);
                setCandidates(candidateList);

                setLoading(false);
            } catch (error) {
                console.error(error);
                alert("Wallet connection failed.");
            }
        } else {
            alert("MetaMask not detected.");
        }
    };

    const handleVote = async (id) => {
        try {
            await voteForCandidate(contract, id);
            const updated = await getCandidates(contract);
            setCandidates(updated);
            setHasVoted(true);
        } catch (err) {
            console.error(err);
            alert("Vote failed");
        }
    };

    const [votingClosed, setVotingClosed] = useState(
        localStorage.getItem("votingClosed") === "true"
    );

    const onToggleVoting = () => {
        const newState = !votingClosed;
        setVotingClosed(newState);
        localStorage.setItem("votingClosed", newState.toString());
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Simple Voting (On-Chain)</h1>

            {!walletAddress ? (
                <button onClick={connectWallet}>Connect Wallet</button>
            ) : (
                <p>Connected Wallet: {walletAddress}</p>
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

            {walletAddress && role === "admin" && !loading && (
                <AdminPanel 
                candidates={candidates}
                votingClosed={votingClosed}
                onToggleVoting={onToggleVoting} />
            )}

            {walletAddress && role === "observer" && !loading && (
                <ObserverPanel candidates={candidates} />
            )}

            {walletAddress && role === "voter" && !loading && (
                <VoterPanel
                candidates={candidates}
                hasVoted={hasVoted}
                onVote={handleVote}
                votingClosed={votingClosed}
                />
            )}                             
        </div>
    );
}
export default App;
