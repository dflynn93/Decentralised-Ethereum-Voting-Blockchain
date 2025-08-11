/* import React, { useState } from 'react';

const VoterRegistrationPortal = ({ onRegistrationSubmitted }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        ppsNumber: '',
        address: ''
    });

    const handleSubmit = () => {
        if (!formData.fullName || !formData.ppsNumber || !formData.address) {
            alert('Please fill all fields');
            return;
        }

        const registrationData = {
            ...formData,
            id: Date.now(),
            status: 'pending',
            submittedDate: new Date().toISOString()
        };

        // Save to localStorage for now
        const existing = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
        existing.push(registrationData);
        localStorage.setItem('voterRegistrations', JSON.stringify(existing));

        if (onRegistrationSubmitted) {
            onRegistrationSubmitted(registrationData);
        }

        alert('Registration submitted!');
        setFormData({ fullName: '', ppsNumber: '', address: '' });
    };

    return (
        <div>
            <h2>Voter Registration</h2>
            <div>
                <div>
                    <label>Full Name:</label>
                    <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    />
                </div>

                <div>
                    <label>PPS Number:</label>
                    <input
                        type="text"
                        value={formData.ppsNumber}
                        onChange={(e) => setFormData({...formData, ppsNumber: e.target.value})}
                    />
                </div>

                <div>
                    <label>Address:</label>
                    <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                </div>

                <button onClick={handleSubmit}>Submit Registration</button>
            </div>
        </div>
    );
};

export default VoterRegistrationPortal;

*/