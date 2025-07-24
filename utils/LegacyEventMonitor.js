// LegacyEventMonitor.js

class LegacyEventMonitor {
    constructor() {
        this.contract = null;
        this.provider = null;
        this.auditEvents = [];
        this.listeners = new Map();
        this.isMonitoring = false;
    }

    async initialise(contract, provider) {
        this.contract = contract;
        this.provider = provider;
        console.log("Legacy Event Monitor initialised");
    }

    async startMonitoring() {
        if (!this.contract || this.isMonitoring) return;
        
        this.isMonitoring = true;
        console.log("Starting legacy event monitoring...");

        /* this.setupBasicEventListeners();
        await this.loadHistoricalEvents(); */
        
        // Add simulated events for demo
        setTimeout(() => {
            this.simulateAdminAction('CANDIDATE_ADDED', 'Admin added candidate via legacy system');
            this.simulateAdminAction('ELECTION_SETUP', 'Election configuration completed');
        }, 2000);

        console.log("Legacy event monitoring started (simulation mode)");
    }

    /*setupBasicEventListeners() {
        try {
            console.log("Setting up basic event listeners...");
            
            // Monitor basic events that exist in your current contract
            this.contract.on('VoteCommitted', (voter, nullifier, event) => {
                this.handleEvent('VOTE_COMMITTED', {
                    voter,
                    nullifier,
                    timestamp: Date.now() / 1000,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash
                });
            });

            this.contract.on('VoteRevealed', (voter, event) => {
                this.handleEvent('VOTE_REVEALED', {
                    voter,
                    timestamp: Date.now() / 1000,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash
                });
            });

            this.contract.on('VoterAuthorised', (voter, event) => {
                this.handleEvent('VOTER_AUTHORISED', {
                    voter,
                    timestamp: Date.now() / 1000,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash
                });
            });

            this.contract.on('PhaseChanged', (newPhase, event) => {
                this.handleEvent('PHASE_CHANGED', {
                    newPhase: this.getPhaseString(Number(newPhase)),
                    timestamp: Date.now() / 1000,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash
                });
            });

            // Only try to set up listeners for events that exist
            const possibleEvents = ['VoteCommitted', 'VoteRevealed', 'VoterAuthorised', 'PhaseChanged'];
        
            possibleEvents.forEach(eventName => {
            try {
                if (this.contract.filters && this.contract.filters[eventName]) {
                    // Set up the specific event listener here
                    console.log(`${eventName} listener set up successfully`);
                }
            } catch (error) {
                console.log(`${eventName} event not available in contract (this is normal)`);
            }
        });

            console.log("Legacy event listeners set up successfully");
        } catch (error) {
            console.warn("Some event listeners could not be set up:", error.message);
        }
    }

    async loadHistoricalEvents() {
        try {
            console.log("Loading historical events (legacy mode)...");
            
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 1000); // Last ~1k blocks
            
            // Try to load basic events that exist
            const eventTypes = ['VoteCommitted', 'VoteRevealed', 'VoterAuthorised', 'PhaseChanged'];

            for (const eventType of eventTypes) {
                try {
                    if (this.contract.filters && this.contract.filters[eventType]) {
                        const filter = this.contract.filters[eventType]();
                        const events = await this.contract.queryFilter(filter, fromBlock, currentBlock);
                        
                        events.forEach(event => {
                            this.processLegacyHistoricalEvent(eventType, event);
                        });
                    }
                } catch (error) {
                    console.warn(`Could not load ${eventType} events:`, error.message);
                }
            }

            console.log(`Loaded ${this.auditEvents.length} historical events (legacy mode)`);
            this.notifyListeners('HISTORY_LOADED', { count: this.auditEvents.length });
            
        } catch (error) {
            console.error("Error loading historical events:", error);
        }
    }

    processLegacyHistoricalEvent(eventType, event) {
        let processedEvent;

        switch (eventType) {
            case 'VoteCommitted':
                processedEvent = {
                    type: 'VOTE_COMMITTED',
                    voter: event.args.voter,
                    nullifier: event.args.nullifier,
                    timestamp: Date.now() / 1000, // Approximate
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash
                };
                break;

            case 'VoteRevealed':
                processedEvent = {
                    type: 'VOTE_REVEALED',
                    voter: event.args.voter,
                    timestamp: Date.now() / 1000,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash
                };
                break;

            case 'VoterAuthorised':
                processedEvent = {
                    type: 'VOTER_AUTHORISED',
                    voter: event.args.voter,
                    timestamp: Date.now() / 1000,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash
                };
                break;

            case 'PhaseChanged':
                processedEvent = {
                    type: 'PHASE_CHANGED',
                    newPhase: this.getPhaseString(Number(event.args.newPhase)),
                    timestamp: Date.now() / 1000,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash
                };
                break;

            default:
                return;
        }

        if (processedEvent) {
            this.auditEvents.push({
                ...processedEvent,
                id: `${event.blockNumber}-${event.transactionIndex}`,
                isHistorical: true,
                data: processedEvent
            });
        }
    }
    */
    handleEvent(type, data) {
        const auditEvent = {
            id: `${data.blockNumber}-${data.transactionHash}-${Date.now()}`,
            type,
            timestamp: data.timestamp,
            blockNumber: data.blockNumber,
            transactionHash: data.transactionHash,
            data,
            isHistorical: false,
            receivedAt: new Date().toISOString()
        };

        this.auditEvents.push(auditEvent);
        console.log(`New legacy audit event: ${type}`, auditEvent);

        this.notifyListeners(type, auditEvent);
        this.notifyListeners('NEW_EVENT', auditEvent);
    }

    // Simulate admin actions for demo purposes
    simulateAdminAction(actionType, details) {
        const simulatedEvent = {
            id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'ADMIN_ACTION',
            timestamp: Date.now() / 1000,
            blockNumber: 'simulated',
            transactionHash: `0x${'0'.repeat(64)}`,
            data: {
                actionType,
                admin: 'current_admin',
                details,
                timestamp: Date.now() / 1000
            },
            isHistorical: false,
            receivedAt: new Date().toISOString()
        };

        this.auditEvents.push(simulatedEvent);
        console.log(`Simulated admin action: ${actionType}`, simulatedEvent);

        this.notifyListeners('ADMIN_ACTION', simulatedEvent);
        this.notifyListeners('NEW_EVENT', simulatedEvent);
    }

    // simulate vote actions for when votes are cast
    simulateVoteAction(actionType, voterAddress, details) {
        const simulatedEvent = {
            id: `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'VOTE_ACTION',
            timestamp: Date.now() / 1000,
            blockNumber: 'simulated',
            transactionHash: `0x${'0'.repeat(64)}`,
            data: {
                actionType,
                voter: voterAddress,
                details,
                timestamp: Date.now() / 1000
            },
            isHistorical: false,
            receivedAt: new Date().toISOString()
        };

        this.auditEvents.push(simulatedEvent);
        console.log(`Simulated vote action: ${actionType}`, simulatedEvent);

        this.notifyListeners('VOTE_ACTION', simulatedEvent);
        this.notifyListeners('NEW_EVENT', simulatedEvent);
    }

    subscribe(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);

        return () => {
            const callbacks = this.listeners.get(eventType);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    notifyListeners(eventType, data) {
        const callbacks = this.listeners.get(eventType);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event callback for ${eventType}:`, error);
                }
            });
        }
    }

    getAllEvents() {
        return [...this.auditEvents].sort((a, b) => b.timestamp - a.timestamp);
    }

    getEventsByType(type) {
        return this.auditEvents.filter(event => event.type === type);
    }

    getElectionTimeline() {
        return this.auditEvents.sort((a, b) => a.timestamp - b.timestamp);
    }

    getVotingStats() {
        const voteActions = this.getEventsByType('VOTE_ACTION');
        const adminActions = this.getEventsByType('ADMIN_ACTION');

        return {
            totalVoteActions: voteActions.length,
            totalAdminActions: adminActions.length,
            totalCommitments: 0,
            totalReveal: 0,
            lastUpdated: Date.now() / 1000
        };
    }
  exportAuditTrail() {
        return {
            exportedAt: new Date().toISOString(),
            totalEvents: this.auditEvents.length,
            events: this.getAllEvents(),
            mode: 'legacy-simulation',
            contractInfo: {
                hasEvents: false,
                note: 'Contract does not emit events - using simulation mode'
            },
            summary: {
                eventTypes: [...new Set(this.auditEvents.map(e => e.type))],
                timeRange: this.auditEvents.length > 0 ? {
                    earliest: Math.min(...this.auditEvents.map(e => e.timestamp)),
                    latest: Math.max(...this.auditEvents.map(e => e.timestamp))
                } : null,
                blockRange: null // No real blocks in simulation mode
            }
        };
    }

    formatEventForDisplay(event) {
        const baseInfo = {
            id: event.id,
            type: event.type,
            timestamp: new Date(event.timestamp * 1000).toLocaleString(),
            blockNumber: event.blockNumber,
            transactionHash: typeof event.transactionHash === 'string' ? event.transactionHash.slice(0, 10) + '...' : 'N/A',
            isHistorical: event.isHistorical
        };

        switch (event.type) {
            case 'ADMIN_ACTION':
                return {
                    ...baseInfo,
                    title: `Admin Action: ${event.data.actionType}`,
                    description: event.data.details,
                    actor: event.data.admin,
                };

            case 'VOTE_ACTION':
                return {
                    ...baseInfo,
                    title: `Vote Action: ${event.data.actionType}`,
                    description: event.data.details,
                    actor: event.data.voter ? `${event.data.voter.slice(0, 8)}...` : 'Unknown',
                };

            default:
                return {
                    ...baseInfo,
                    title: `Event: ${event.type}`,
                    description: 'Simulated event',
                    actor: 'System',
                };
        }
    }

    getPhaseString(phaseNumber) {
        const phases = ['Registration', 'Commitment', 'Reveal', 'Ended'];
        return phases[phaseNumber] || 'Unknown';
    }

    stopMonitoring() {
        if (this.isMonitoring) {
            // No real listeners to remove since contract has no events
            this.isMonitoring = false;
            console.log("Legacy event monitoring stopped");
        }
    }
}

// Create singleton instance
const legacyEventMonitor = new LegacyEventMonitor();

export default legacyEventMonitor;