import { ethers } from "ethers";
import abi from './ABI.json';

const contractAddress = "0xA318Db8B05cfBB2BEf0944Ef3f9D1Fdb90DF81Bf"; // as of 7th June
const contractABI = abi;

//Provider (InJected by MetaMask)
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
    return new ethers.Contract(contractAddress, contractABI, signer);
};

const getContractReadOnly = async () => {
    const provider = getProvider();
    return new ethers.Contract(contractAddress, contractABI, provider);
}

// Get list of candidates (by ID)
export const getCandidates = async () => {
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
};

// Submit a ranked vote
export const submitRanking = async (candidateIdsInRankOrder) => {
    try {
    // rankingMap: { 0: 2, 3: 2, 1: 3 } // candidateId: rank
    const contract = await getContract();
    const ranks = candidateIdsInRankOrder.map((_, i) => i + 1); // Convert to 1-based ranks

    console.log("Submitting ranking:", {
        candidateIds: candidateIdsInRankOrder,
        ranks: ranks
    });

    const tx = await contract.submitRanking(candidateIdsInRankOrder, ranks);
    await tx.wait();
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
    }
    catch (error) {
        console.error("Error checking vote status:", error);
        return false;
    }
};

export const addCandidate = async (name, party) => {
    try {
    const contract = await getContract();
    const tx = await contract.addCandidate(name, party);
    await tx.wait();
    return tx;
    } catch (error) {
        console.error("Error adding candidate:", error);
        throw error;
    }
};

// Get current admin address
export const getAdmin = async () => {
    try {
        const contract = await getContractReadOnly();
        return await contract.admin();
    } catch (error) {
        console.error("error getting admin:", error);
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

// Get voting status from contract 
export const getVotingStatus = async() => {
    try {
        const contract = await getContractReadOnly();
        // assumes you add a votingOpen variable to contract
        return await contract.votingOpen();
    } catch (error) {
        console.error("Error getting voting status:", error);
        return true; // Default to open if it won't check
    }
};

/*export async function getAllCandidates() {
    const contract = await getContractReadOnly();
    const count = await contract.candidateCount();
    const list = [];
    for (let i = 0; i < count; i++) {
        const [name, party, voteCount] = await contract.candidates(i);
        list.push({ id: i, name, party, votes: voteCount.toNumber() });
    }

    return list;

}; */

/*export async function voteForCandidate(candidateId) {
    const contract = await getContract();
    const tx = await contract.vote(candidateId);
    await tx.wait();
    return tx;
} */

export {
    getSigner,
    getContract,
    getContractReadOnly,
};