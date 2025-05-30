import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.6.2/+esm";
import abi from './ABI.json' assert { type: "json" };

const contractAddress = "0x1Da5916E8443b0f028d2bdA63b8639eF609e9bDe";

export async function getContract(signer) {
    return new ethers.Contract(contractAddress, abi, signer);
}

export async function getCandidates(contract) {
    const count = await contract.candidatesCount();
    const candidates = [];
    for (let i = 0; i < count; i++) {
        const candidate = await contract.getCandidate(i);
        candidates.push({ id: i, name: candidate[0], votes: Number(candidate[1]) });
    }
    return candidates;
}

export async function hasUserVoted(contract, address) {
    return await contract.hasVoted(address);
}

export async function voteForCandidate(contract, id) {
    const tx = await contract.vote(id);
    await tx.wait();
}
