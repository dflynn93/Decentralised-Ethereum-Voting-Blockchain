import React, { useState } from 'react';

// Import candidate images
import Candidate1 from '../images/Candidate1.jpg';
import Candidate2 from '../images/Candidate2.jpg';
import Candidate3 from '../images/Candidate3.jpg';
import Candidate4 from '../images/Candidate4.jpg';
import Candidate5 from '../images/Candidate5.jpg';
import Candidate6 from '../images/Candidate6.jpg';
import Candidate7 from '../images/Candidate7.jpg';

// Array of candidate images in order
const candidateImages = [
    Candidate1,
    Candidate2,
    Candidate3,
    Candidate4,
    Candidate5,
    Candidate6,
    Candidate7
];

const DigitalBallot = ({ 
    candidates, 
    onVote, 
    hasVoted, 
    votingClosed, 
    isPreviewMode = false, 
    rankings = {}, 
    onRankingChange, 
    onSubmit, 
    isRankingSystem = false,
    constituency = "BallyBeg",
    userConstituency = "BallyBeg" 
}) => {
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleVote = async () => {
        if (!selectedCandidate || votingClosed || hasVoted) return;
        
        setIsSubmitting(true);
        try {
            await onVote(selectedCandidate);
        } catch (error) {
            console.error("Voting error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getBallotStatus = () => {
        if (isPreviewMode) return "BALLOT PREVIEW";
        if (votingClosed) return "VOTING CLOSED";
        if (hasVoted) return "VOTE CAST";
        return "OFFICIAL BALLOT";
    };

    const getStatusColor = () => {
        if (isPreviewMode) return "#ffc107";
        if (votingClosed) return "#dc3545";
        if (hasVoted) return "#28a745";
        return "#0056b3";
    };

    // Function to get candidate image based on their order
    const getCandidateImage = (candidateIndex) => {
        return candidateImages[candidateIndex] || null;
    };

    // Check if user can vote in this constituency
    const canVoteInConstituency = userConstituency === constituency;

    return (
        <div style={{
            maxWidth: '800px',
            margin: '20px auto',
            backgroundColor: 'white',
            border: '3px solid #000',
            borderRadius: '8px',
            fontFamily: '"Times New Roman", Times, serif',
            position: 'relative',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
            {/* Watermark */}
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                transform: 'rotate(15deg)',
                fontSize: '48px',
                color: 'rgba(220, 53, 69, 0.1)',
                fontWeight: 'bold',
                zIndex: 1,
                userSelect: 'none',
                pointerEvents: 'none'
            }}>
                {getBallotStatus()}
            </div>

            {/* Header */}
            <div style={{
                backgroundColor: getStatusColor(),
                color: 'white',
                padding: '15px 20px',
                textAlign: 'center',
                borderRadius: '5px 5px 0 0'
            }}>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem' }}>
                    DIGITAL BALLOT PAPER
                </h2>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: 'normal' }}>
                    CONSTITUENCY OF {constituency.toUpperCase()}, CO. DONEGAL
                </h3>
                <p style={{ margin: '0', fontSize: '1rem', opacity: 0.9 }}>
                    {isPreviewMode ? "Preview Mode - No votes will be recorded" : 
                     votingClosed ? "Voting has ended" :
                     hasVoted ? "Thank you for voting" : 
                     "Select your preferred candidate"}
                </p>
            </div>

            {/* Constituency Verification Notice */}
            {!isPreviewMode && (
                <div style={{
                    padding: '15px 20px',
                    backgroundColor: canVoteInConstituency ? '#d4edda' : '#f8d7da',
                    border: `2px solid ${canVoteInConstituency ? '#c3e6cb' : '#f5c6cb'}`,
                    color: canVoteInConstituency ? '#155724' : '#721c24'
                }}>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>
                        Constituency Verification
                    </h4>
                    <p style={{ margin: '0', fontSize: '0.9rem' }}>
                        {canVoteInConstituency ? (
                            <>
                                <strong>✓ Authorised:</strong> You are registered to vote in {constituency}, Co. Donegal
                            </>
                        ) : (
                            <>
                                <strong>✗ Not Authorised:</strong> You are registered in {userConstituency} but this ballot is for {constituency}
                            </>
                        )}
                    </p>
                </div>
            )}

            {/* Instructions */}
            <div style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6'
            }}>
                <h3 style={{ 
                    margin: '0 0 10px 0', 
                    color: '#495057',
                    fontSize: '1.1rem'
                }}>
                    INSTRUCTIONS FOR {constituency.toUpperCase()} CONSTITUENCY
                </h3>
                <ol style={{ 
                    margin: '0', 
                    paddingLeft: '20px',
                    color: '#6c757d',
                    lineHeight: '1.5'
                }}>
                    <li>See that the official mark is on the digital ballot.</li>
                    <li>Verify you are voting in the correct constituency: <strong>{constituency}, Co. Donegal</strong></li>
                    {isRankingSystem ? (
                        <>
                            <li>Enter numbers 1, 2, 3, etc. to rank candidates in order of preference.</li>
                            <li>Click "Submit Ranked Vote" to cast your ballot securely to the blockchain.</li>
                        </>
                    ) : (
                        <>
                            <li>Click the circle beside your preferred candidate.</li>
                            <li>Click "Cast Vote" to submit your selection securely to the blockchain.</li>
                        </>
                    )}
                    <li>Candidate photographs are provided for identification purposes only.</li>
                </ol>
            </div>

            {/* Candidates Section */}
            <div style={{ padding: '0' }}>
                {candidates.length === 0 ? (
                    <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: '#6c757d',
                        fontSize: '1.1rem'
                    }}>
                        No candidates have been registered for {constituency} constituency yet.
                    </div>
                ) : (
                    <>
                        {/* Constituency Header for Candidates */}
                        <div style={{
                            padding: '15px 20px',
                            backgroundColor: '#e9ecef',
                            borderBottom: '2px solid #dee2e6',
                            textAlign: 'center'
                        }}>
                            <h4 style={{ margin: '0', fontSize: '1.1rem', color: '#495057' }}>
                                CANDIDATES FOR {constituency.toUpperCase()}, CO. DONEGAL
                            </h4>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#6c757d' }}>
                                ({candidates.length} candidate{candidates.length !== 1 ? 's' : ''} registered)
                            </p>
                        </div>
                    
                        {candidates.map((candidate, index) => {
                            const candidateImage = getCandidateImage(index);
                            
                            return (
                                <div
                                    key={candidate.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '20px',
                                        borderBottom: index < candidates.length - 1 ? '2px solid #dee2e6' : 'none',
                                        backgroundColor: selectedCandidate === candidate.id ? '#e3f2fd' : 'white',
                                        cursor: (!votingClosed && !hasVoted && !isPreviewMode && canVoteInConstituency) ? 'pointer' : 'default',
                                        transition: 'background-color 0.2s ease',
                                        opacity: (votingClosed || hasVoted || isPreviewMode || !canVoteInConstituency) ? 0.7 : 1
                                    }}
                                    onClick={() => {
                                        if (!votingClosed && !hasVoted && !isPreviewMode && !isRankingSystem && canVoteInConstituency) {
                                            setSelectedCandidate(candidate.id);
                                        }
                                    }}
                                >
                                    {/* Selection Circle or Ranking Input */}
                                    {isRankingSystem ? (
                                        <div style={{
                                            width: '80px',
                                            height: '40px',
                                            border: '3px solid #000',
                                            marginRight: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: 'white',
                                            flexShrink: 0
                                        }}>
                                            <input
                                                type="number"
                                                min="1"
                                                max={candidates.length}
                                                value={rankings[candidate.id] || ""}
                                                onChange={(e) => {
                                                    if (!votingClosed && !hasVoted && !isPreviewMode && onRankingChange && canVoteInConstituency) {
                                                        const rank = parseInt(e.target.value);
                                                        onRankingChange(candidate.id, rank);
                                                    }
                                                }}
                                                disabled={votingClosed || hasVoted || isPreviewMode || !canVoteInConstituency}
                                                style={{
                                                    width: '60px',
                                                    height: '30px',
                                                    textAlign: 'center',
                                                    border: 'none',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: 'transparent'
                                                }}
                                                placeholder="?"
                                            />
                                        </div>
                                    ) : (
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            border: '3px solid #000',
                                            borderRadius: '50%',
                                            marginRight: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: selectedCandidate === candidate.id ? '#0056b3' : 'white',
                                            flexShrink: 0
                                        }}>
                                            {selectedCandidate === candidate.id && (
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    backgroundColor: 'white',
                                                    borderRadius: '50%'
                                                }} />
                                            )}
                                        </div>
                                    )}

                                    {/* Party Logo Placeholder */}
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        border: '2px solid #dee2e6',
                                        marginRight: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#f8f9fa',
                                        fontSize: '0.8rem',
                                        textAlign: 'center',
                                        color: '#6c757d',
                                        flexShrink: 0
                                    }}>
                                        {candidate.party ? 
                                            candidate.party.substring(0, 3).toUpperCase() : 
                                            'IND'
                                        }
                                    </div>

                                    {/* Candidate Information */}
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{
                                            margin: '0 0 5px 0',
                                            fontSize: '1.3rem',
                                            fontWeight: 'bold',
                                            color: '#212529',
                                            textTransform: 'uppercase'
                                        }}>
                                            {candidate.name} - {candidate.party || 'NON-PARTY'}
                                        </h3>
                                        <p style={{
                                            margin: '0',
                                            color: '#6c757d',
                                            fontSize: '1rem',
                                            lineHeight: '1.4'
                                        }}>
                                            ({candidate.name} of {constituency}, Co. Donegal;<br/>
                                            {candidate.party ? `${candidate.party} Representative` : 'Independent Candidate'})
                                        </p>
                                    </div>

                                    {/* Candidate Photo - Using actual images */}
                                    <div style={{
                                        width: '100px',
                                        height: '120px',
                                        border: '2px solid #dee2e6',
                                        marginLeft: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#f8f9fa',
                                        fontSize: '0.8rem',
                                        textAlign: 'center',
                                        color: '#6c757d',
                                        flexShrink: 0,
                                        overflow: 'hidden'
                                    }}>
                                        {candidateImage ? (
                                            <img 
                                                src={candidateImage} 
                                                alt={`${candidate.name} photo`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        ) : (
                                            <>CANDIDATE<br/>PHOTO</>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {/* Voting Actions */}
            {!isPreviewMode && candidates.length > 0 && (
                <div style={{
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderTop: '2px solid #dee2e6',
                    textAlign: 'center'
                }}>
                    {!canVoteInConstituency ? (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#f8d7da',
                            border: '1px solid #f5c6cb',
                            borderRadius: '4px',
                            color: '#721c24'
                        }}>
                            <p style={{ margin: '0', fontWeight: 'bold' }}>
                                You cannot vote in this constituency. You are registered in {userConstituency}.
                            </p>
                        </div>
                    ) : votingClosed ? (
                        <p style={{
                            color: '#dc3545',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            margin: '0'
                        }}>
                            Voting has ended. No more votes can be cast.
                        </p>
                    ) : hasVoted ? (
                        <p style={{
                            color: '#28a745',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            margin: '0'
                        }}>
                            Your vote has been successfully recorded on the blockchain.
                        </p>
                    ) : isRankingSystem ? (
                        <div>
                            <button
                                onClick={onSubmit}
                                disabled={Object.keys(rankings).length === 0}
                                style={{
                                    backgroundColor: Object.keys(rankings).length > 0 ? '#28a745' : '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    padding: '15px 40px',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                    borderRadius: '5px',
                                    cursor: Object.keys(rankings).length > 0 ? 'pointer' : 'not-allowed',
                                    transition: 'background-color 0.2s ease'
                                }}
                            >
                                {Object.keys(rankings).length > 0 ? 'SUBMIT RANKED VOTE' : 'RANK CANDIDATES FIRST'}
                            </button>
                            {Object.keys(rankings).length > 0 && (
                                <p style={{
                                    marginTop: '10px',
                                    color: '#495057',
                                    fontSize: '0.9rem'
                                }}>
                                    Ranked {Object.keys(rankings).length} of {candidates.length} candidates for {constituency}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <button
                                onClick={handleVote}
                                disabled={!selectedCandidate || isSubmitting}
                                style={{
                                    backgroundColor: selectedCandidate ? '#28a745' : '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    padding: '15px 40px',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                    borderRadius: '5px',
                                    cursor: selectedCandidate ? 'pointer' : 'not-allowed',
                                    transition: 'background-color 0.2s ease'
                                }}
                            >
                                {isSubmitting ? 'Casting Vote...' : 
                                 selectedCandidate ? 'CAST VOTE' : 
                                 'SELECT A CANDIDATE FIRST'}
                            </button>
                            {selectedCandidate && (
                                <p style={{
                                    marginTop: '10px',
                                    color: '#495057',
                                    fontSize: '0.9rem'
                                }}>
                                    Selected: <strong>{candidates.find(c => c.id === selectedCandidate)?.name}</strong> for {constituency}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Blockchain Security Notice */}
            <div style={{
                padding: '10px 20px',
                backgroundColor: '#e8f5e9',
                borderTop: '1px solid #c8e6c9',
                fontSize: '0.85rem',
                color: '#2e7d32',
                textAlign: 'center'
            }}>
                This ballot is secured by blockchain technology ensuring transparency and immutability • {constituency}, Co. Donegal
            </div>
        </div>
    );
};

export default DigitalBallot;