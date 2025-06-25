// PR-STV Counting System for Irish Elections
// Based on official Irish electoral procedures

export class PRSTVCounter {
    constructor(candidates, totalSeats = 3) {
        this.candidates = candidates.map(c => ({
            ...c,
            votes: 0,
            status: 'active', // 'active', 'elected', 'eliminated'
            voteHistory: [],
            ballots: []
        }));
        this.totalSeats = totalSeats;
        this.quota = 0;
        this.counts = [];
        this.currentCount = 0;
        this.electedCandidates = [];
        this.eliminatedCandidates = [];
    }

    // Calculate quota: (Total Valid Votes ÷ (Seats + 1)) + 1
    calculateQuota(totalValidVotes) {
        const quotaRaw = totalValidVotes / (this.totalSeats + 1);
        this.quota = Math.floor(quotaRaw) + 1;
        return this.quota;
    }

    // Simulate random voter preferences
    generateRandomBallots(numVoters = 30) {
        const ballots = [];

        for (let i = 0; i < numVoters; i++) {
            const ballot = {
                id: `ballot_${i + 1}`,
                preferences: {},
                transferValue: 1.0 
            };

            //Randomly decide how many candidates to rank (1 to all candidates)
            const numToRank = Math.floor(Math.random() * this.candidates.length) + 1;

            // Shuffle candidates and rank the first 'numtoRank' of them
            const shuffledCandidates = [...this.candidates].sort(() => Math.random() - 0.5);

            for (let rank = 1; rank <= numToRank; rank++) {
                ballot.preferences[rank] = shuffledCandidates[rank -1].id;
            }

            ballots.push(ballot);
        }

        return ballots;
    }

    // Get the current preference for a ballot
    getCurrentPreference(ballot, excludeElected = true) {
        for (let rank = 1; rank <= Object.keys(ballot.preferences).length; rank++) {
            const candidateId = ballot.preferences[rank];
            const candidate = this.candidates.find(c => c.id === candidateId);
            
            if (candidate && candidate.status === 'active') {
                return candidateId;
            }
            if (!excludeElected && candidate && candidate.status === 'elected') {
                return candidateId;
            }
        }
        return null; // Non-transferable
    }

    // First count - distribute all first preferences
    firstCount(ballots) {
        this.currentCount = 1;
        this.calculateQuota(ballots.length);

        //Reset all candidate votes
        this.candidates.forEach(c => {
            c.votes = 0;
            c.ballots = [];
        });

        // Distribute first preferences
        ballots.forEach(ballot => {
            const firstPref = this.getCurrentPreference(ballot, false);
            if (firstPref !== null) {
                const candidate = this.candidates.find(c => c.id === firstPref);
                candidate.votes += ballot.transferValue;
                candidate.ballots.push(ballot);
            }
        });

        // Check for elected candidates
        this.checkForElectedCandidates();

        this.saveCount(`Count 1: First Preferences`);
        return this.getCurrentResults();
    }

    // Check if any candidates have reached quota
    checkForElectedCandidates() {
        this.candidates.forEach(candidate => {
            if (candidate.status === 'active' && candidate.votes >= this.quota) {
                candidate.status = 'elected';
                this.electedCandidates.push({
                    ...candidate,
                    electedOnCount: this.currentCount
                });
            }
        });
    }

    // Distribute surplus votes from elected candidate
    distributeSurplus(candidateId) {
        this.currentCount++;

        const candidate = this.candidates.find(c => c.id === candidateId);
        const surplus = candidate.votes - this.quota;

        if (surplus <= 0) return this.getCurrentResults();

        // Calculate transfer factor
        const transferableBallots = candidate.ballots.filter(ballot =>
            this.getCurrentPreference(ballot) !== null
        );

        const transferFactor = surplus / transferableBallots.length;

        // Create new ballots with reduced transfer value
        const transferredBallots = candidate.ballots.map(ballot => ({
            ...ballot,
            transferValue: ballot.transferValue * transferFactor
        }));

        // Reset candidate to quota
        candidate.votes = this.quota;
        candidate.ballots = candidate.ballots.slice(0, this.quota);

        // Distribute surplus ballots
        transferredBallots.forEach(ballot => {
            const nextPref = this.getCurrentPreference(ballot);
            if (nextPref !== null) {
                const nextCandidate = this.candidates.find(c => c.id === nextPref);
                if (nextCandidate.status === 'active') {
                    nextCandidate.votes += ballot.transferValue;
                    nextCandidate.ballots.push(ballot);
                }
            }
        });

        this.checkForElectedCandidates();
        this.saveCount(`Count ${this.currentCount}: Distribution of ${candidate.name}'s surplus (${surplus.toFixed(2)} votes)`);

        return this.getCurrentResults();
    }

    // Eliminate lowest candidate and transfer votes
    eliminateLowestCandidate() {
        this.currentCount++;

        // Find candidate(s) with lowest votes
        const activeCandidates = this.candidates.filter(c => c.status === 'active');
        if (activeCandidates.length === 0) return this.getCurrentResults();

        const lowestVotes = Math.min(...activeCandidates.map(c => c.votes));
        const lowestCandidates = activeCandidates.filter(c => c.votes === lowestVotes);

        // For simplicity, eliminate the first one (in real elections, there are tie-breaking rules)
        const toEliminate = lowestCandidates[0];
        toEliminate.status = 'eliminated';
        this.eliminatedCandidates.push({
            ...toEliminate,
            eliminatedOnCount: this.currentCount
        });

        // Transfer all votes from eliminated candidate
        toEliminate.ballots.forEach(ballot => {
            const nextPref = this.getCurrentPreference(ballot);
            if (nextPref !==null) {
                const nextCandidate = this.candidates.find(c => c.id === nextPref)
                if (nextCandidate.status === 'active') {
                    nextCandidate.votes += ballot.transferValue;
                    nextCandidate.ballots.push(ballot);
                }
            }
        });
        

        // Clear eliminated candidate's ballots
        toEliminate.votes = 0;
        toEliminate.ballots = [];

        this.checkForElectedCandidates();
        this.saveCount(`Count ${this.currentCount}: Elimination of ${toEliminate.name} (${lowestVotes.toFixed(2)} votes)`);

        return this.getCurrentResults();
    }

    // Save current count state
    saveCount(description) {
        const countData = {
            count: this.currentCount,
            description,
            quota: this.quota,
            candidates: this.candidates.map(c => ({
                id: c.id,
                name: c.name,
                party: c.party,
                votes: Math.round(c.votes * 100) / 100, // Round to 2 decimal places
                status: c.status
            })),
            elected: this.electedCandidates.length,
            seatsRemaining: this.totalSeats - this.electedCandidates.length
        };

        this.counts.push(countData);
    }

    // Get current results
    getCurrentResults() {
        return {
            currentCount: this.currentCount,
            quota: this.quota,
            totalSeats: this.totalSeats,
            seatsRemaining: this.totalSeats - this.electedCandidates.length,
            candidates: this.candidates.map(c => ({
                id: c.id,
                name: c.name,
                party: c.party,
                votes: Math.round(c.votes * 100) / 100,
                status: c.status
            })),
            electedCandidates: this.electedCandidates,
            eliminatedCandidates: this.eliminatedCandidates,
            isComplete: this.isCountComplete()
        };
    }

    // Check if counting is complete
    isCountComplete() {
        return this.electedCandidates.length === this.totalSeats ||
            this.candidates.filter(c => c.status === 'active').length <= this.totalSeats - this.electedCandidates.length;
    }

    // Run complete PR-STV count
    runFullCount(ballots) {
        console.log("Starting PR-STV Count");
        console.log(`Quota needed: ${this.quota} votes`);
        console.log(`Seats available: ${this.totalSeats}`);

        // First count
        let results = this.firstCount(ballots);

        // Continue counting until all seats filled
        while (!results.isComplete && this.currentCount < 20) { // Safetylimit
            
            // Check for surplus distribution
            const electedWithSurplus = this.candidates.find(c =>
                c.status === 'elected' && c.votes > this.quota
            );
            
            if (electedWithSurplus) {
                results = this.distributeSurplus(electedWithSurplus.id);
            } else {
                // Eliminate lowest candidate
                results = this.eliminateLowestCandidate();
            }
        }

        // Fill remaining seats with highest remaining candidates
        const activeCandidates = this.candidates.filter(c => c.status === 'active');
        const seatsRemaining = this.totalSeats - this.electedCandidates.length;

        if (seatsRemaining > 0 && activeCandidates.length > 0) {
            activeCandidates
                .sort((a, b) => b.votes - a.votes)
                .slice(0, seatsRemaining)
                .forEach(candidate => {
                    candidate.status = 'elected';
                    this.electedCandidates.push({
                        ...candidate,
                        electedOnCount: this.currentCount,
                        electedWithoutQuota: true
                    });
                });

                this.saveCount(`Final Count: Remaining seats filled by highest vote totals`);
        }

        return {
            finalResults: this.getCurrentResults(),
            allCounts: this.counts,
            summary: this.generateSummary()
        };
    }

    // Generate election Summary
    generateSummary() {
        return {
            totalCounts: this.counts.length,
            quota: this.quota,
            finalElected: this.electedCandidates.map(c => ({
                name: c.name,
                party: c.party,
                finalVotes: c.votes,
                electedOnCount: c.electedOnCount,
                metQuota: !c.electedWithoutQuota
            })),
            eliminationOrder: this.eliminatedCandidates.map(c => ({
                name: c.name, 
                party: c.party,
                eliminatedOnCount: c.eliminatedOnCount
            }))
        };
    }
}

// Utility function to run a complete simulation
export function runPRSTVSimulation(candidates, numVoters = 30, totalSeats = 3) {
    const counter = new PRSTVCounter(candidates, totalSeats);
    const ballots = counter.generateRandomBallots(numVoters);

    console.log("Generated Ballots:", ballots.slice(0, 5)); // Show first 5 ballots

    return {
        ballots,
        results: counter.runFullCount(ballots),
        counter
    };
}