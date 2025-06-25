// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    address public admin; // Admin address
    
    // Other state variables:
    struct Candidate {
        string name;
        string party; // Optional: Add party affiliation
        uint voteCount;
    }
    mapping(uint => Candidate) public candidates; // Mapping of candidate ID to Candidate struct
    uint public candidatesCount;
    
    mapping(address => mapping(uint => uint)) private userRankings; // Voter address to candidate rankings
    mapping(address => bool) public hasVoted; // Track if an address has voted

    constructor() {
        admin = msg.sender; // Set the contract deployer as the admin
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action.");
        _;
    }

    function addCandidate(string memory _name, string memory _party) public onlyAdmin {
        candidates[candidatesCount] = Candidate(_name, _party, 0);
        candidatesCount++;
    }

    // --- Read a candidate by ID ---
    function getCandidate(uint id) public view returns (string memory, string memory, uint) {
        require(id < candidatesCount, "Invalid candidate ID.");
        Candidate memory c = candidates[id];
        return (c.name, c.party, c.voteCount);
    }

    function submitRanking(uint[] memory candidateIds, uint[] memory ranks) public {
        require(!hasVoted[msg.sender], "You have already voted.");
        require(candidateIds.length <= ranks.length, "Too many candidates.");

        bool[] memory usedRanks = new bool[](candidatesCount + 1);

        for (uint i = 0; i < candidateIds.length; i++) {
            uint cid = candidateIds[i];
            uint rank = ranks[i];

            require(cid < candidatesCount, "Invalid candidate ID.");
            require(rank >= 1 && rank <= candidatesCount, "Rank out of bounds.");
            require(!usedRanks[rank], "Duplicate rank detected");

            userRankings[msg.sender][i + 1] = cid; // Store rankings starting from 1
            usedRanks[rank] = true; // Mark this rank as used
        }

        hasVoted[msg.sender] = true; // Mark the voter as having voted

    }

    function getRankedCandidate(address voter, uint rank) public view returns (string memory, string memory) {
        require(rank > 0, "Rank must be 1 or higher.");
        require(hasVoted[voter], "Voter has not submitted a ranking.");

        uint candidateId = userRankings[voter][rank];
        require(candidateId < candidatesCount, "Invalid candidate ID.");
        Candidate memory c = candidates[candidateId];
        return (c.name, c.party);

    }

    function getCandidateIdByRank(address voter, uint rank) public view returns (uint) {
        require(rank > 0, "Rank must be 1 or higher.");
        require(hasVoted[voter], "Voter has not submitted a ranking.");
        return userRankings[voter][rank];
    }
}