// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    
    // Other state variables:
    struct Candidate {
        string name;
        uint voteCount;
    }   

      mapping(uint => Candidate) public candidates; // Mapping of candidate ID to Candidate
    uint public candidatesCount; // Total number of candidates

    mapping(address => bool) public hasVoted; // Track if an address has voted

    address public admin; // Admin address
    constructor() {
        admin = msg.sender; // Set the contract deployer as the admin
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action.");
        _;
    }

    // Add constructor to populate candidates (Admin function) ---

    function addCandidate(string memory _name) public onlyAdmin {
        candidates[candidatesCount] = Candidate(_name, 0);
        candidatesCount++;
    }

    // --- Cast a vote (Voter function) ---

    function vote(uint _candidateId) public {
        require(!hasVoted[msg.sender], "You have already voted.");
        require(_candidateId < candidatesCount, "Invalid candidate ID.");
        
        candidates[_candidateId].voteCount++;
        hasVoted[msg.sender] = true;
    }

    // Read function for frontend:
    function hasVotedStatus(address _voter) public view returns (bool) {
        return hasVoted[_voter];
    }

    // --- Read a candidate by ID ---
    function getCandidate(uint _candidateId) public view returns (string memory name, uint voteCount) {
        require(_candidateId < candidatesCount, "Invalid candidate ID.");
        Candidate storage candidate = candidates[_candidateId];
        return (candidate.name, candidate.voteCount);
    }
}   

