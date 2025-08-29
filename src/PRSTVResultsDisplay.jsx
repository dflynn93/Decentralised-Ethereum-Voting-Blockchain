import React, { useState } from 'react';

const PRSTVResultsDisplay = ({ prstResults, ballots, onRunNewSimulation }) => {
    const [selectedCount, setSelectedCount] = useState(0);
    const [showBallots, setShowBallots] = useState(false);

    if (!prstResults) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h3>Ready to Run PR-STV Simulation</h3>
            </div>
        );
    }

    const { finalResults, allCounts, summary } = prstResults;

    return (
        <div style={{ marginTop: '2rem' }}>
            <div style={{
                padding: '1.5rem',
                backgroundColor: '#e8f5e9',
                border: '2px solid #4caf50',
                borderRadius: '8px',
                marginBottom: '2rem'
            }}>
                <h2 style={{ margin: '0 0 1rem 0', color: '#2e7d32' }}>
                    PR-STV Irish Election Results - BallyBeg, Co. Donegal
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                        <strong>Quota Required:</strong>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {finalResults.quota} votes
                        </p>
                    </div>
                    <div>
                        <strong>Total Counts:</strong>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {summary.totalCounts}
                        </p>
                    </div>
                    <div>
                        <strong>Seats Available:</strong>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {finalResults.totalSeats}
                        </p>
                    </div>
                    <div>
                        <strong>Ballots Cast:</strong>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {ballots?.length || 0}
                        </p>
                    </div>
                </div>
            </div>

            {/* Final Elected Candidates */}   
            <div style={{
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #4caf50',
                borderRadius: '8px',
                marginBottom: '2rem'
            }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#2e7d32' }}>
                    Final Elected Candidates for BallyBeg, Co. Donegal
                </h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {summary.finalElected.map((candidate, index) => (
                        <div key={index} style={{
                            padding: '1rem',
                            backgroundColor: '#e8f5e9',
                            border: '1px solid #4caf50',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div> 
                                <strong style={{ fontSize: '1.1rem' }}>
                                    {candidate.name}
                                </strong>
                                <div style={{ color: '#666', fontSize: '0.9rem' }}>
                                    {candidate.party}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2e7d32' }}>
                                    {candidate.finalVotes} votes
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                    Elected on Count {candidate.electedOnCount}
                                    {!candidate.metQuota && ' (without quota)'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Count by Count Results */}
            <div style={{
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '8px',
                marginBottom: '2rem'
            }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>Count-by-Count Results for BallyBeg</h3>

                {/* Count Selection */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Select Count to View:
                    </label>
                    <select
                        value={selectedCount}
                        onChange={(e) => setSelectedCount(parseInt(e.target.value))}
                        style={{
                            padding: '0.5rem',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '1rem'
                        }}
                    >
                        {allCounts.map((count, index) => (
                            <option key={index} value={index}>
                                Count {count.count}: {count.description}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Selected Count Results */}
                {allCounts[selectedCount] && (
                    <div>
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: '6px',
                            marginBottom: '1rem'
                        }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>
                                {allCounts[selectedCount].description}
                            </h4>
                            <p style={{ margin: '0', color: '#666' }}>
                                Quota: {allCounts[selectedCount].quota} votes • 
                                Seats Remaining: {allCounts[selectedCount].seatsRemaining}
                            </p>
                        </div>

                        {/* Fixed Table with Alignment */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '0.9rem',
                                tableLayout: 'fixed'
                            }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8f9fa'}}>
                                        <th style={{ 
                                            padding: '0.75rem', 
                                            textAlign: 'left', 
                                            borderBottom: '2px solid #dee2e6',
                                            width: '35%'
                                        }}>
                                            Candidate
                                        </th>
                                        <th style={{ 
                                            padding: '0.75rem', 
                                            textAlign: 'left', 
                                            borderBottom: '2px solid #dee2e6',
                                            width: '25%'
                                        }}>
                                            Party
                                        </th>
                                        <th style={{ 
                                            padding: '0.75rem', 
                                            textAlign: 'center', 
                                            borderBottom: '2px solid #dee2e6',
                                            width: '20%'
                                        }}>
                                            Votes
                                        </th>
                                        <th style={{ 
                                            padding: '0.75rem', 
                                            textAlign: 'center', 
                                            borderBottom: '2px solid #dee2e6',
                                            width: '20%'
                                        }}>
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allCounts[selectedCount].candidates
                                    .sort((a,b) => b.votes - a.votes)
                                    .map((candidate, index) => (
                                        <tr key={candidate.id} style={{
                                            backgroundColor: candidate.status === 'elected' ? '#e8f5e9' :
                                                            candidate.status === 'eliminated' ? '#ffebee' : '#fff'
                                        }}>
                                            <td style={{ 
                                                padding: '0.75rem', 
                                                borderBottom: '1px solid #dee2e6',
                                                textAlign: 'left'
                                            }}>
                                                <strong>{candidate.name}</strong>
                                            </td>
                                            <td style={{ 
                                                padding: '0.75rem', 
                                                borderBottom: '1px solid #dee2e6',
                                                textAlign: 'left'
                                            }}>
                                                {candidate.party}
                                            </td>
                                            <td style={{
                                                padding: '0.75rem',
                                                borderBottom: '1px solid #dee2e6',
                                                textAlign: 'center',
                                                fontWeight: 'bold'
                                            }}>
                                                {candidate.votes}
                                                {candidate.votes >= allCounts[selectedCount].quota &&
                                                    <span style={{ color: '#4caf50', marginLeft: '0.5rem' }}>✓</span>
                                                }
                                            </td>
                                            <td style={{
                                                padding: '0.75rem',
                                                borderBottom: '1px solid #dee2e6',
                                                textAlign: 'center'
                                            }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: candidate.status === 'elected' ? '#4caf50' :
                                                                    candidate.status === 'eliminated' ? '#f44336' : '#ffc107',
                                                    color: 'white',
                                                    display: 'inline-block',
                                                    minWidth: '70px'
                                                }}>
                                                    {candidate.status.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Sample Ballots */}
            <div style={{
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '8px',
                marginBottom: '2rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: '0' }}>Sample Voter Ballots from BallyBeg</h3>
                    <button
                        onClick={() => setShowBallots(!showBallots)}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {showBallots ? 'Hide Ballots' : 'Show Sample Ballots'}
                    </button>
                </div>

                {showBallots && ballots && (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {ballots.slice(0, 10).map((ballot, index) => (
                                <div key={ballot.id} style={{
                                    padding: '0.75rem',
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '4px'
                                }}>
                                    <strong>BallyBeg Ballot {index + 1}:</strong>
                                    <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                                        {Object.entries(ballot.preferences)
                                            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                                            .map(([rank, candidateId]) => {
                                                const candidate = finalResults.candidates.find(c => c.id === candidateId);
                                                return `${rank}. ${candidate?.name} (${candidate?.party})`;
                                            })
                                            .join(' → ')
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
                            Showing 10 of {ballots.length} ballots from BallyBeg constituency
                        </p>
                    </div>
                )}
            </div>

            {/* Control Buttons */}
            <div style={{ textAlign: 'center' }}>
                <button
                    onClick={onRunNewSimulation}
                    style={{
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Run New PR-STV Simulation for BallyBeg
                </button>
            </div>
        </div>
    );
};

export default PRSTVResultsDisplay;