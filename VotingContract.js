import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.6.2/+esm";
import abi from './ABI.json' assert { type: "json" };

const contractAddress = "0x1Da5916E8443b0f028d2bdA63b8639eF609e9bDe";
const contractABI = abi;

export function getContract(providerOrSigner) {
    try {
        return new ethers.Contract(contractAddress, contractABI, providerOrSigner);
    }
    catch (error) {
        console.error("Error getting contract:", error);
        return null;
    }
};

export const getCandidates = async (contract) => {
    const count = await contract.candidatesCount();
    const candidates = [];
    for (let i = 0; i < count; i++) {
        const candidate = await contract.getCandidate(i);
        candidates.push({ id: i, name: candidate[0], votes: Number(candidate[1]) });
    }
    return candidates;
};

export const hasUserVoted = async (contract, address) => {
    const voted = await contract.hasVotedStatus(address);
    return voted;
};

export const voteForCandidate = async (contract, id) => {
    const tx = await contract.vote(id);
    await tx.wait();
};
