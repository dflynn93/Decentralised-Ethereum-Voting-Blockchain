import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.6.2/+esm";
import abi from './ABI.json' assert { type: "json" };

const contractAddress = "0x02c24b509140dece8b51e2c5b28b655b48d4fb71"; // as of 2nd June
const contractABI = abi;

export const connectWallet = async () => {
    if (!window.ethereum) throw new Error("MetaMask not detected. Please install it.");
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    return { provider, signer, address };
};

export async function getContract(providerOrSigner) {
    try {
        const contract = new ethers.Contract(contractAddress, contractABI, providerOrSigner)
        //if (!window.ethereum) throw new Error("MetaMask not detected.");

        const network = await providerOrSigner.provider?.getNetwork?.();
        if (network) {
        console.log("Connected to network:", network.name, "with chain ID:", network.chainId);}
        console.log("Loaded ABI entries:", contractABI.map(f => f.name));
        console.log("ABI function names:", contractABI.filter(f => f.type === "function").map(f => f.name));
        console.log("Contract prototype functions (v6):", Object.getOwnPropertyNames(Object.getPrototypeOf(contract)).filter(name => typeof contract[name] === 'function'));
        
        return contract;
        }  catch (error) {
        console.error("Error getting contract:", error);
        return null;
    }
};

export const getCandidates = async (contract) => {
    const count = await contract.candidatesCount();
    const candidates = [];
    for (let i = 0; i < count; i++) {
        const candidate = await contract.candidates(i);
        candidates.push({ id: i, name: candidate[0], votes: Number(candidate[1]) });
    }
    return candidates;
};

export const hasUserVoted = async (contract, address) => {
    if (!contract || !address) throw new Error("Contract and address required");
       
        console.log("Calling hasVoted with address:", address);
        const result = await contract.hasVoted(address);
        console.log("hasVoted result:", result);
        return result;
    };


export const voteForCandidate = async (contract, candidateId) => {
    if (!contract || candidateId === undefined) {
        throw new Error("Invalid contract or candidate ID");
    }
    const tx = await contract.vote(candidateId);
    await tx.wait();
};


