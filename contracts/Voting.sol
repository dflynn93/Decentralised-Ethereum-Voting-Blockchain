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

    enum VotingPhase { Registration, Commitment, Reveal, Ended }

    // State variables
    mapping(uint => Candidate) public candidates; // Mapping of candidate ID to Candidate struct
    uint public candidatesCount;
    
    // Commitment Reveal specific
    mapping(address => bytes32) public voteCommitments; // Store vote commitments
    mapping(bytes32 => bool) public usedNullifiers; // Store used nullifiers to prevent double voting
    mapping(address => bool) public hasCommitted; // Track if an address has committed a vote
    mapping(address => bool) public hasRevealed; // Track if an address has revealed their vote
    mapping (address => bool) public authorisedVoters; // Track if an address is authorised to vote
    
    // Rankings (only filled during reveal)
    mapping(address => mapping(uint => uint)) private userRankings; // Voter address to candidate rankings
    
    VotingPhase public currentPhase = VotingPhase.Registration; // Current voting phase
    uint public commitPhaseEnd;
    uint public revealPhaseEnd;

    // Enhanced Events for Complete Audit Trail
    event VoteCommitted(address indexed voter, bytes32 nullifier);
    event VoteRevealed(address indexed voter);
    event PhaseChanged(VotingPhase newPhase);
    event VoterAuthorised(address indexed voter);
    
    // New comprehensive audit events
    event ElectionInitialized(address indexed admin, uint256 timestamp);
    event CandidateAdded(
        uint256 indexed candidateId,
        string name,
        string party,
        address indexed addedBy,
        uint256 timestamp
    );
    event VotingPhaseChanged(
        VotingPhase indexed oldPhase,
        VotingPhase indexed newPhase,
        address indexed changedBy,
        uint256 timestamp,
        uint256 duration
    );
    event AdminActionLogged(
        string indexed actionType,
        address indexed admin,
        uint256 timestamp,
        string details
    );
    event ElectionMetrics(
        uint256 totalCandidates,
        uint256 totalAuthorisedVoters,
        uint256 totalCommittedVotes,
        uint256 totalRevealedVotes,
        uint256 timestamp
    );
    event VoterStatusChanged(
        address indexed voter,
        string indexed statusType, // "AUTHORISED", "COMMITTED", "REVEALED"
        address indexed changedBy,
        uint256 timestamp
    );
    event SystemAudit(
        string indexed auditType,
        address indexed auditor,
        bytes32 indexed auditHash,
        uint256 timestamp,
        string details
    );

    constructor() {
        admin = msg.sender; // Set the contract deployer as the admin
        emit ElectionInitialized(msg.sender, block.timestamp);
        emit AdminActionLogged(
            "CONTRACT_DEPLOYED",
            msg.sender,
            block.timestamp,
            "Voting contract deployed and initialized"
        );
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action.");
        _;
    }

    modifier onlyAuthorisedVoter() {
        require(authorisedVoters[msg.sender], "You are not authorised to vote.");
        _;
    }

    modifier inPhase(VotingPhase phase) {
        require(currentPhase == phase, "Action not allowed in this phase.");
        _;
    }

    // === ADMIN FUNCTIONS ===

    function addCandidate(string memory _name, string memory _party) public onlyAdmin {
        candidates[candidatesCount] = Candidate(_name, _party, 0);
        
        emit CandidateAdded(
            candidatesCount,
            _name,
            _party,
            msg.sender,
            block.timestamp
        );
        
        emit AdminActionLogged(
            "CANDIDATE_ADDED",
            msg.sender,
            block.timestamp,
            string(abi.encodePacked("Added candidate: ", _name, " (", _party, ")"))
        );
        
        candidatesCount++;
        
        // Emit updated metrics
        _emitElectionMetrics();
    }

    function authoriseVoter(address voter) public onlyAdmin {
        authorisedVoters[voter] = true;
        
        emit VoterAuthorised(voter);
        emit VoterStatusChanged(
            voter,
            "AUTHORISED",
            msg.sender,
            block.timestamp
        );
        emit AdminActionLogged(
            "VOTER_AUTHORISED",
            msg.sender,
            block.timestamp,
            string(abi.encodePacked("Authorised voter: ", toAsciiString(voter)))
        );
        
        _emitElectionMetrics();
    }

    function authoriseVoters(address[] memory voters) public onlyAdmin {
        for (uint i = 0; i < voters.length; i++) {
            authorisedVoters[voters[i]] = true;
            emit VoterAuthorised(voters[i]);
            emit VoterStatusChanged(
                voters[i],
                "AUTHORISED",
                msg.sender,
                block.timestamp
            );
        }
        
        emit AdminActionLogged(
            "BULK_VOTER_AUTHORISATION",
            msg.sender,
            block.timestamp,
            string(abi.encodePacked("Authorised ", uint2str(voters.length), " voters"))
        );
        
        _emitElectionMetrics();
    }

    function startCommitmentPhase(uint durationInMinutes) public onlyAdmin inPhase(VotingPhase.Registration) {
        VotingPhase oldPhase = currentPhase;
        currentPhase = VotingPhase.Commitment;
        commitPhaseEnd = block.timestamp + (durationInMinutes * 60);
        
        emit PhaseChanged(VotingPhase.Commitment);
        emit VotingPhaseChanged(
            oldPhase,
            VotingPhase.Commitment,
            msg.sender,
            block.timestamp,
            durationInMinutes * 60
        );
        emit AdminActionLogged(
            "COMMITMENT_PHASE_STARTED",
            msg.sender,
            block.timestamp,
            string(abi.encodePacked("Duration: ", uint2str(durationInMinutes), " minutes"))
        );
    }

    function startRevealPhase(uint durationInMinutes) public onlyAdmin {
        require(block.timestamp >= commitPhaseEnd, "Commitment phase not ended.");
        
        VotingPhase oldPhase = currentPhase;
        currentPhase = VotingPhase.Reveal;
        revealPhaseEnd = block.timestamp + (durationInMinutes * 60);
        
        emit PhaseChanged(VotingPhase.Reveal);
        emit VotingPhaseChanged(
            oldPhase,
            VotingPhase.Reveal,
            msg.sender,
            block.timestamp,
            durationInMinutes * 60
        );
        emit AdminActionLogged(
            "REVEAL_PHASE_STARTED",
            msg.sender,
            block.timestamp,
            string(abi.encodePacked("Duration: ", uint2str(durationInMinutes), " minutes"))
        );
    }

    function endVoting() public onlyAdmin {
        require(block.timestamp >= revealPhaseEnd, "Reveal phase not ended.");
        
        VotingPhase oldPhase = currentPhase;
        currentPhase = VotingPhase.Ended;
        
        emit PhaseChanged(VotingPhase.Ended);
        emit VotingPhaseChanged(
            oldPhase,
            VotingPhase.Ended,
            msg.sender,
            block.timestamp,
            0
        );
        emit AdminActionLogged(
            "VOTING_ENDED",
            msg.sender,
            block.timestamp,
            "Election officially closed"
        );
        
        // Final metrics
        _emitElectionMetrics();
        
        // Final system audit
        emit SystemAudit(
            "ELECTION_COMPLETED",
            msg.sender,
            keccak256(abi.encodePacked("FINAL_AUDIT", block.timestamp)),
            block.timestamp,
            "Election completed with full audit trail"
        );
    }

    // === COMMITMENT PHASE ===

    function commitVote(bytes32 commitment, bytes32 nullifier) public 
        onlyAuthorisedVoter 
        inPhase(VotingPhase.Commitment) 
    {
        require(block.timestamp < commitPhaseEnd, "Commitment phase has ended.");
        require(!usedNullifiers[nullifier], "Nullifier has already been used - duplicate vote detected.");
        require(!hasCommitted[msg.sender], "You have already committed a vote.");

        voteCommitments[msg.sender] = commitment;
        usedNullifiers[nullifier] = true; // Mark this nullifier as used
        hasCommitted[msg.sender] = true; // Mark the voter as having committed

        emit VoteCommitted(msg.sender, nullifier);
        emit VoterStatusChanged(
            msg.sender,
            "COMMITTED",
            msg.sender,
            block.timestamp
        );
        
        _emitElectionMetrics();
    }

    // === REVEAL PHASE ===
    function revealVote(
        uint[] memory candidateIds,
        uint[] memory ranks,
        uint256 nonce
    ) public onlyAuthorisedVoter inPhase(VotingPhase.Reveal) {
        require(block.timestamp < revealPhaseEnd, "Reveal phase has ended.");
        require(hasCommitted[msg.sender], "You have not committed a vote.");
        require(!hasRevealed[msg.sender], "You have already revealed your vote.");
       
        bytes32 computedCommitment = keccak256(abi.encodePacked(candidateIds, ranks, nonce, msg.sender));
        require(voteCommitments[msg.sender] == computedCommitment, "Invalid reveal - commitment mismatch.");
        
        // Increment the vote count for the candidate
        require(candidateIds.length == ranks.length, "Candidate IDs and ranks must match in length.");
        bool[] memory usedRanks = new bool[](candidatesCount + 1); // Track used ranks
        
        for (uint i = 0; i < candidateIds.length; i++) {
            uint cid = candidateIds[i];
            uint rank = ranks[i];

            require(cid < candidatesCount, "Invalid candidate ID.");
            require(rank >= 1 && rank <= candidatesCount, "Rank out of bounds.");
            require(!usedRanks[rank], "Duplicate rank detected");

            userRankings[msg.sender][rank] = cid; // Store rankings starting from 1
            usedRanks[rank] = true; // Mark this rank as used
        }

        hasRevealed[msg.sender] = true; // Mark the voter as having revealed their vote
        
        emit VoteRevealed(msg.sender);
        emit VoterStatusChanged(
            msg.sender,
            "REVEALED",
            msg.sender,
            block.timestamp
        );
        
        _emitElectionMetrics();
    }

    // === VIEW FUNCTIONS ===
    function getCandidate(uint id) public view returns (string memory, string memory, uint) {
        require(id < candidatesCount, "Invalid candidate ID.");
        Candidate memory c = candidates[id];
        return (c.name, c.party, c.voteCount);
    }

    function getRankedCandidate(address voter, uint rank) public view returns (string memory, string memory) {
        require(rank > 0, "Rank must be 1 or higher.");
        require(hasVoted(voter), "Voter has not submitted a ranking.");

        uint candidateId = userRankings[voter][rank];
        require(candidateId < candidatesCount, "Invalid candidate ID.");
        Candidate memory c = candidates[candidateId];
        return (c.name, c.party);
    }

    function submitRanking(uint[] memory candidateIds, uint[] memory ranks) public {
        require(!hasVoted(msg.sender), "You have already voted.");
        require(candidateIds.length <= ranks.length, "Too many candidates.");

        bool[] memory usedRanks = new bool[](candidatesCount + 1);

        for (uint i = 0; i < candidateIds.length; i++) {
            uint cid = candidateIds[i];
            uint rank = ranks[i];

            require(cid < candidatesCount, "Invalid candidate ID.");
            require(rank >= 1 && rank <= candidatesCount, "Rank out of bounds.");
            require(!usedRanks[rank], "Duplicate rank detected");

            userRankings[msg.sender][rank] = cid; // Store rankings starting from 1
            usedRanks[rank] = true; // Mark this rank as used
        }
        
        // Emit voting event for audit trail
        emit AdminActionLogged(
            "VOTE_SUBMITTED",
            msg.sender,
            block.timestamp,
            "Ranked vote submitted"
        );
    }

    function getCandidateIdByRank(address voter, uint rank) public view returns (uint) {
        require(rank > 0, "Rank must be 1 or higher.");
        require(hasVoted(voter), "Voter has not submitted a ranking.");
        return userRankings[voter][rank];
    }

    function getVotingPhase() public view returns (VotingPhase) {
        return currentPhase;
    }

    function getPhaseTimeRemaining() public view returns (uint) {
        if (currentPhase == VotingPhase.Commitment && block.timestamp < commitPhaseEnd) {
            return commitPhaseEnd - block.timestamp;
        } else if (currentPhase == VotingPhase.Reveal && block.timestamp < revealPhaseEnd) {
            return revealPhaseEnd - block.timestamp;
        } 
        return 0; // Finished phase has no time remaining
    }

    function getVoterStatus(address voter) public view returns (
        bool authorised, 
        bool committed, 
        bool revealed,
        bytes32 commitment
    ) {
        return (
            authorisedVoters[voter],
            hasCommitted[voter],
            hasRevealed[voter],
            voteCommitments[voter]
        );
    }

    // Legacy compatibility
    function hasVoted(address voter) public view returns (bool) {
        return hasRevealed[voter]; // Only count as "voted" after revealing
    }

    // === AUDIT HELPER FUNCTIONS ===
    
    function _emitElectionMetrics() private {
        uint totalAuthorised = 0;
        uint totalCommitted = 0;
        uint totalRevealed = 0;
        
        // Note: In a real implementation, you'd want to track these more efficiently
        // This is simplified for demonstration
        
        emit ElectionMetrics(
            candidatesCount,
            totalAuthorised,
            totalCommitted,
            totalRevealed,
            block.timestamp
        );
    }

    function performSystemAudit(string memory auditType, string memory details) public onlyAdmin {
        bytes32 auditHash = keccak256(abi.encodePacked(auditType, details, block.timestamp, msg.sender));
        
        emit SystemAudit(
            auditType,
            msg.sender,
            auditHash,
            block.timestamp,
            details
        );
        
        emit AdminActionLogged(
            "SYSTEM_AUDIT",
            msg.sender,
            block.timestamp,
            string(abi.encodePacked("Audit type: ", auditType))
        );
    }

    // Utility functions for event logging
    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19-i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i] = char(hi);
            s[2*i+1] = char(lo);            
        }
        return string(s);
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}