import { ethers } from "ethers";
import abi from './ABI.json';
import eventMonitor from '../utils/LegacyEventMonitor';

const contractAddress = "0xA318Db8B05cfBB2BEf0944Ef3f9D1Fdb90DF81Bf"; // Update with your new contract address
const contractABI = abi;

//Provider (Injected by MetaMask)
const getProvider = () => {
    if (!window.ethereum) {
        throw new Error("MetaMask is not installed or not detected.");
    }
    return new ethers.BrowserProvider(window.ethereum);
};

// Optional signer (used for write methods)
const getSigner = async () => {
    const provider = getProvider();
    const signer = await provider.getSigner();
    return signer;
};

// Get contract instance with signer for write access
const getContract = async () => {
    const signer = await getSigner();
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    // Initialise event monitoring when contract is accessed
    try {
        const provider = getProvider();
        await eventMonitor.initialise(contract, provider);
        if (!eventMonitor.isMonitoring) {
            await eventMonitor.startMonitoring();
        }
    } catch (error) {
        console.warn("Could not initialise event monitoring:", error);
    }
    
    return contract;
};

const getContractReadOnly = async () => {
    const provider = getProvider();
    return new ethers.Contract(contractAddress, contractABI, provider);
}

// === ENHANCED ADMIN FUNCTIONS WITH AUDIT LOGGING ===

export const addCandidate = async (name, party) => {
    try {
        const contract = await getContract();
        const tx = await contract.addCandidate(name, party);
        
        console.log("Adding candidate:", { name, party });
        console.log("Transaction submitted:", tx.hash);
        
        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log("Candidate added successfully. Block:", receipt.blockNumber);
        
        // The enhanced contract will automatically emit comprehensive events
        // including CandidateAdded and AdminActionLogged events

        // Simulate admin action for audit trail
        setTimeout(() => {
            eventMonitor.simulateAdminAction('CANDIDATE_ADDED', `Added candidate: ${name} (${party})`);
        }, 1000);
        
        return tx;
    } catch (error) {
        console.error("Error adding candidate:", error);
        throw error;
    }
};

// === PLACEHOLDER FUNCTIONS

export const getVotingPhase = async () => {
    console.warn("getVotingPhase not available in current contract - returning default");
    return { phase: 0, phaseName: "Registration" };
};

export const getPhaseTimeRemaining = async () => {
    console.warn("getPhaseTimeRemaining not available in current contract - returning default");
    return 0;
};

export const getVoterStatus = async (address) => {
    console.warn("getVoterStatus not available in current contract - returning default");
    return { authorised: false, committed: false, revealed: false, commitment: "0x" };
};

export const authoriseVoter = async (address) => {
    console.warn("authoriseVoter function not available in current contract");
    throw new Error("Function not available in current contract version");
};

export const authoriseMultipleVoters = async (addresses) => {
    console.warn("authoriseMultipleVoters function not available in current contract");
    throw new Error("Function not available in current contract version");
};

export const startCommitmentPhase = async (durationMinutes = 60) => {
    console.warn("startCommitmentPhase function not available in current contract");
    throw new Error("Function not available in current contract version");
};

export const startRevealPhase = async (durationMinutes = 30) => {
    console.warn("startRevealPhase function not available in current contract");
    throw new Error("Function not available in current contract version");
};

export const endVoting = async () => {
    console.warn("endVoting function not available in current contract");
    throw new Error("Function not available in current contract version");
};

export const performSystemAudit = async (auditType, details) => {
    console.warn("performSystemAudit function not available in current contract");
    throw new Error("Function not available in current contract version");
};

export const commitVote = async (candidateIdsInRankOrder) => {
    console.warn("commitVote function not available in current contract");
    throw new Error("Function not available in current contract version");
};

export const revealVote = async () => {
    console.warn("revealVote function not available in current contract");
    throw new Error("Function not available in current contract version");
};

// === COMMITMENT-REVEAL HELPER FUNCTIONS ===
// Generate a cryptographically secure random nonce
const generateNonce = () => {
    return ethers.randomBytes(32); // 32 bytes = 256 bits
};

// Create a commitment hash from vote data
const createCommitment = (candidateIds, ranks, nonce, voterAddress) => {
    return ethers.keccak256(
        ethers.solidityPacked(
            ["uint256[]", "uint256[]", "bytes32", "address"],
            [candidateIds, ranks, nonce, voterAddress]
        )
    );
};

// Generate a unique nullifier to prevent double voting
const generateNullifier = (voterAddress, nonce) => {
    return ethers.keccak256(
        ethers.solidityPacked(
            ["address", "bytes32", "string"],
            [voterAddress, nonce, "NULLIFIER"]
        )
    );
};

// Get list of candidates (by ID)
export const getCandidates = async () => {
    try {
        const contract = await getContractReadOnly();
        const count = await contract.candidatesCount();
        const candidates = [];

        for (let i = 0; i < count; i++) {
            const candidate = await contract.candidates(i);
            candidates.push({ 
                id: i, 
                name: candidate.name, 
                party: candidate.party, 
                votes: Number(candidate.voteCount) 
            });
        }
        return candidates;
    } catch (error) {
        console.error("Error getting candidates:", error);
        return [];
    }
};

// Submit a ranked vote
export const submitRanking = async (candidateIdsInRankOrder) => {
    try {
        const contract = await getContract();
        const ranks = candidateIdsInRankOrder.map((_, i) => i + 1); // Convert to 1-based ranks

        console.log("Submitting ranking:", {
            candidateIds: candidateIdsInRankOrder,
            ranks: ranks
        });

        const tx = await contract.submitRanking(candidateIdsInRankOrder, ranks);
        await tx.wait();
        
        // Simulate voting event for audit trail
        const signer = await getSigner();
        const voterAddress = await signer.getAddress();
        setTimeout(() => {
            eventMonitor.simulateVoteAction('VOTE_SUBMITTED', voterAddress, `Vote submitted with ${candidateIdsInRankOrder.length} rankings`);
        }, 1000);
        
        return tx;
    } catch (error) {
        console.error("Error submitting ranking:", error);
        throw error;
    }
};

// Check if a voter has already voted
export const hasUserVoted = async (address) => {
    try {
        const contract = await getContractReadOnly();
        return await contract.hasVoted(address);
    } catch (error) {
        console.error("Error checking vote status:", error);
        return false;
    }
};

// Get current admin address
export const getAdmin = async () => {
    try {
        const contract = await getContractReadOnly();
        return await contract.admin();
    } catch (error) {
        console.error("Error getting admin:", error);
        return null;
    }
};

// Check if current user is admin
export const isCurrentUserAdmin = async () => {
    try {
        const signer = await getSigner();
        const userAddress = await signer.getAddress();
        const adminAddress = await getAdmin();
        return userAddress.toLowerCase() === adminAddress.toLowerCase();
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
};

// === AUDIT TRAIL FUNCTIONS ===

// Get all audit events from the event monitor
export const getAuditTrail = () => {
    return eventMonitor.getAllEvents();
};

// Get election timeline
export const getElectionTimeline = () => {
    return eventMonitor.getElectionTimeline();
};

// Get voting statistics
export const getVotingStatistics = () => {
    return eventMonitor.getVotingStats();
};

// Export complete audit trail
export const exportAuditTrail = () => {
    return eventMonitor.exportAuditTrail();
};

// Subscribe to real-time events
export const subscribeToEvents = (eventType, callback) => {
    return eventMonitor.subscribe(eventType, callback);
};

// === EVENT MONITORING UTILITIES ===

// Initialise event monitoring manually (if needed)
export const initialiseEventMonitoring = async () => {
    try {
        const contract = await getContract();
        const provider = getProvider();
        await eventMonitor.initialise(contract, provider);
        await eventMonitor.startMonitoring();
        return true;
    } catch (error) {
        console.error("Failed to initialise event monitoring:", error);
        return false;
    }
};

// Get current monitoring status
export const getEventMonitoringStatus = () => {
    return {
        isMonitoring: eventMonitor.isMonitoring,
        totalEvents: eventMonitor.getAllEvents().length,
        eventTypes: [...new Set(eventMonitor.getAllEvents().map(e => e.type))],
        mode: 'legacy'
    };
};

export {
    getSigner,
    getContract,
    getContractReadOnly,
    generateNonce,
    createCommitment,
    generateNullifier,
    eventMonitor
};