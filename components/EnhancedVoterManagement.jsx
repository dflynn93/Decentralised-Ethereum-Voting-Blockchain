/* import React, { useState } from 'react';

const EnhancedVoterManagement = ({ voterRegistrations = [], updateVoterRegistrationStatus }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredVoters = voterRegistrations.filter(voter => 
        voter.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <h3>Voter Registration</h3>
            
            <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>PPS</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredVoters.map((reg) => (
                        <tr key={reg.id}>
                            <td>{reg.fullName}</td>
                            <td>{reg.ppsNumber}</td>
                            <td>{reg.status}</td>
                            <td>
                                {reg.status === 'pending' && (
                                    <div>
                                        <button onClick={() => updateVoterRegistrationStatus(reg.id, 'approved')}>
                                            Approve
                                        </button>
                                        <button onClick={() => updateVoterRegistrationStatus(reg.id, 'rejected')}>
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {filteredVoters.length === 0 && <p>No voters found</p>}
        </div>
    );
};

export default EnhancedVoterManagement;
*/