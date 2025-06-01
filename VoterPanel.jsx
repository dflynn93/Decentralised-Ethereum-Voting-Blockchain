import React from "react";


function VoterPanel({ candidates, hasVoted, onVote, votingClosed}) {
    return (
        <div style={{ marginTop: "2rem" }}>
            <h2>Cast Your Vote</h2>

            <ul>
                {candidates.map((c) => (
                    <li key={c.id}>
                        {c.name} - {c.votes} votes
                                <button
                                 onClick={() => onVote(c.id)}
                                disabled={hasVoted}
                                style={{ marginLeft: '1rem' }}
                                > 
                                Vote
                                </button>
                            </li>
                        ))}
                    </ul>

                    {hasVoted && (
                        <p style={{ color: "green", marginTop: "1rem" }}>
                            Your vote has been cast!
                        </p>
                    )}
                        {votingClosed && (
                            <p style={{ color: "red", marginTop: "1rem" }}>
                                Voting is closed. No more votes can be cast.
                            </p>
                        )}
                 </div>
            );
        }

        export default VoterPanel;

                                
                    
