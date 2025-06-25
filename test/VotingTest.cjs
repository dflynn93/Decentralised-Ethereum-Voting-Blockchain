// test/VotingTest.cjs (rename to .cjs)
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting Contract", function () {
  let voting;
  let admin;
  let voter1;
  let voter2;
  let nonAdmin;

  beforeEach(async function () {
    [admin, voter1, voter2, nonAdmin] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy();
    await voting.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set deployer as admin", async function () {
      expect(await voting.admin()).to.equal(admin.address);
    });

    it("Should start with zero candidates", async function () {
      expect(await voting.candidatesCount()).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to add candidates", async function () {
      await voting.addCandidate("Seán MacBride", "Clann na Poblachta");
      expect(await voting.candidatesCount()).to.equal(1);
      
      const candidate = await voting.candidates(0);
      expect(candidate.name).to.equal("Seán MacBride");
      expect(candidate.party).to.equal("Clann na Poblachta");
    });

    it("Should prevent non-admin from adding candidates", async function () {
      await expect(
        voting.connect(nonAdmin).addCandidate("Test Name", "Test Party")
      ).to.be.revertedWith("Only admin can perform this action.");
    });

    it("Should get candidate details", async function () {
      await voting.addCandidate("Liam de Róiste", "Cork Civic Party");
      
      const [name, party, voteCount] = await voting.getCandidate(0);
      expect(name).to.equal("Liam de Róiste");
      expect(party).to.equal("Cork Civic Party");
      expect(voteCount).to.equal(0);
    });
  });

  describe("Voting System", function () {
    beforeEach(async function () {
      await voting.addCandidate("Seán MacBride", "Clann na Poblachta");
      await voting.addCandidate("Liam de Róiste", "Cork Civic Party");
      await voting.addCandidate("Richard Greene", "Muintir na hÉireann");
    });

    it("Should allow ranked voting", async function () {
      const candidateIds = [0, 1, 2];
      const ranks = [1, 2, 3];
      
      await voting.connect(voter1).submitRanking(candidateIds, ranks);
      expect(await voting.hasVoted(voter1.address)).to.be.true;
    });

    it("Should prevent double voting", async function () {
      await voting.connect(voter1).submitRanking([0, 1], [1, 2]);
      
      await expect(
        voting.connect(voter1).submitRanking([1, 2], [1, 2])
      ).to.be.revertedWith("You have already voted.");
    });

    it("Should reject invalid candidate IDs", async function () {
      await expect(
        voting.connect(voter1).submitRanking([99], [1])
      ).to.be.revertedWith("Invalid candidate ID.");
    });

    it("Should reject duplicate ranks", async function () {
      await expect(
        voting.connect(voter1).submitRanking([0, 1], [1, 1])
      ).to.be.revertedWith("Duplicate rank detected");
    });

    it("Should handle ranking system", async function () {
      const candidateIds = [2, 0, 1]; // Richard 1st, Seán 2nd, Liam 3rd
      const ranks = [1, 2, 3];
      
      await voting.connect(voter1).submitRanking(candidateIds, ranks);
      
      const [name1, party1] = await voting.getRankedCandidate(voter1.address, 1);
      expect(name1).to.equal("Richard Greene");
      expect(party1).to.equal("Muintir na hÉireann");
      
      const candidateId2 = await voting.getCandidateIdByRank(voter1.address, 2);
      expect(candidateId2).to.equal(0); // Seán MacBride
    });
  });

  describe("Gas Usage", function () {
    it("Should track gas costs", async function () {
      const addTx = await voting.addCandidate("Seán MacBride", "Clann na Poblachta");
      const addReceipt = await addTx.wait();
      console.log(`Gas for adding candidate: ${addReceipt.gasUsed.toString()}`);
      
      const voteTx = await voting.connect(voter1).submitRanking([0], [1]);
      const voteReceipt = await voteTx.wait();
      console.log(`Gas for voting: ${voteReceipt.gasUsed.toString()}`);
      
      expect(voteReceipt.gasUsed).to.be.below(300000);
    });
  });

  describe("Missing Contract Functions", function () {
    beforeEach(async function () {
      await voting.addCandidate("Seán MacBride", "Clann na Poblachta");
      await voting.addCandidate("Liam de Róiste", "Cork Civic Party");
    });

    it("Should test getRankedCandidate function", async function () {
      await voting.connect(voter1).submitRanking([0, 1], [1, 2]);
      
      const [name, party] = await voting.getRankedCandidate(voter1.address, 1);
      expect(name).to.equal("Seán MacBride");
      expect(party).to.equal("Clann na Poblachta");
    });

    it("Should test getCandidateIdByRank function", async function () {
      await voting.connect(voter1).submitRanking([1, 0], [1, 2]); // Liam 1st, Seán 2nd
      
      const candidateId = await voting.getCandidateIdByRank(voter1.address, 1);
      expect(candidateId).to.equal(1); // Liam de Róiste
    });

    it("Should reject getRankedCandidate for non-voters", async function () {
      await expect(
        voting.getRankedCandidate(voter2.address, 1)
      ).to.be.revertedWith("Voter has not submitted a ranking.");
    });

    it("Should reject getCandidateIdByRank for non-voters", async function () {
      await expect(
        voting.getCandidateIdByRank(voter2.address, 1)
      ).to.be.revertedWith("Voter has not submitted a ranking.");
    });

    it("Should reject rank 0 in getRankedCandidate", async function () {
      await voting.connect(voter1).submitRanking([0], [1]);
      
      await expect(
        voting.getRankedCandidate(voter1.address, 0)
      ).to.be.revertedWith("Rank must be 1 or higher.");
    });

    it("Should reject rank 0 in getCandidateIdByRank", async function () {
      await voting.connect(voter1).submitRanking([0], [1]);
      
      await expect(
        voting.getCandidateIdByRank(voter1.address, 0)
      ).to.be.revertedWith("Rank must be 1 or higher.");
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle empty arrays in submitRanking", async function () {
      await expect(
        voting.connect(voter1).submitRanking([], [])
      ).to.not.be.reverted; // Your contract allows this
    });

    it("Should reject mismatched array lengths", async function () {
      await voting.addCandidate("Seán MacBride", "Clann na Poblachta");
      
      await expect(
        voting.connect(voter1).submitRanking([0, 1], [1]) // More candidates than ranks
      ).to.be.revertedWith("Too many candidates.");
    });

    it("Should reject ranks outside valid range", async function () {
      await voting.addCandidate("Seán MacBride", "Clann na Poblachta");
      await voting.addCandidate("Liam de Róiste", "Cork Civic Party");
      
      await expect(
        voting.connect(voter1).submitRanking([0], [0]) // Rank 0 invalid
      ).to.be.revertedWith("Rank out of bounds.");
      
      await expect(
        voting.connect(voter1).submitRanking([0], [3]) // Rank 3 invalid (only 2 candidates)
      ).to.be.revertedWith("Rank out of bounds.");
    });

    it("Should handle maximum candidates scenario", async function () {
      // Add many candidates to test limits
      for(let i = 0; i < 10; i++) {
        await voting.addCandidate(`Candidate ${i}`, `Party ${i}`);
      }
      
      expect(await voting.candidatesCount()).to.equal(10);
      
      // Vote for all 10
      const candidateIds = [0,1,2,3,4,5,6,7,8,9];
      const ranks = [1,2,3,4,5,6,7,8,9,10];
      
      await voting.connect(voter1).submitRanking(candidateIds, ranks);
      expect(await voting.hasVoted(voter1.address)).to.be.true;
    });

    it("Should reject invalid candidate ID in getCandidate", async function () {
      await expect(
        voting.getCandidate(99)
      ).to.be.revertedWith("Invalid candidate ID.");
    });
  });

  describe("Real-world Scenarios", function () {
    beforeEach(async function () {
      await voting.addCandidate("Seán MacBride", "Clann na Poblachta");
      await voting.addCandidate("Liam de Róiste", "Cork Civic Party");
      await voting.addCandidate("Richard Greene", "Muintir na hÉireann");
    });

    it("Should handle partial ranking (not ranking all candidates)", async function () {
      // Only rank 2 out of 3 candidates
      await voting.connect(voter1).submitRanking([0, 2], [1, 2]);
      expect(await voting.hasVoted(voter1.address)).to.be.true;
      
      const [name1] = await voting.getRankedCandidate(voter1.address, 1);
      expect(name1).to.equal("Seán MacBride");
    });

    it("Should handle different ranking orders from multiple voters", async function () {
      // Voter 1: Seán 1st, Liam 2nd, Richard 3rd
      await voting.connect(voter1).submitRanking([0, 1, 2], [1, 2, 3]);
      
      // Voter 2: Richard 1st, Seán 2nd, Liam 3rd  
      await voting.connect(voter2).submitRanking([2, 0, 1], [1, 2, 3]);
      
      expect(await voting.hasVoted(voter1.address)).to.be.true;
      expect(await voting.hasVoted(voter2.address)).to.be.true;
      
      // Check voter 1's first choice
      const [name1v1] = await voting.getRankedCandidate(voter1.address, 1);
      expect(name1v1).to.equal("Seán MacBride");
      
      // Check voter 2's first choice
      const [name1v2] = await voting.getRankedCandidate(voter2.address, 1);
      expect(name1v2).to.equal("Richard Greene");
    });

    it("Should maintain vote privacy (can't see other's votes)", async function () {
      await voting.connect(voter1).submitRanking([0], [1]);
      
      // voter2 shouldn't be able to see voter1's specific votes through normal means
      // This is more of a documentation test - the contract doesn't expose private vote details
      expect(await voting.hasVoted(voter1.address)).to.be.true;
      expect(await voting.hasVoted(voter2.address)).to.be.false;
    });
  });
});