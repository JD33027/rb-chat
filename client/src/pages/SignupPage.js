import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { countryCodes } from '../data/countryCodes';

const SignupPage = () => {
  const [step, setStep] = useState(1); // 1 for phone number, 2 for OTP
  const [countryCode, setCountryCode] = useState('+1'); // Default to US
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState(''); // For displaying the dev OTP
  const [loading, setLoading] = useState(false);

  const { sendOtp, signup } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await sendOtp(countryCode, phoneNumber);
      if (response && response.devOtp) setDevOtp(response.devOtp); // Capture dev OTP
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(countryCode, phoneNumber, password, otp);
      // On success, user is logged in. Redirect to set up their profile.
      navigate('/setup-profile');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          {step === 1 ? 'Create your account' : 'Verify your number'}
        </h2>

        {error && <p className="text-sm text-center text-red-600">{error}</p>}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
              <label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</label>
              <p className="mt-1 text-xs text-gray-500">
                Note: In this development version, a real SMS will not be sent.
                The verification code will be shown on the next screen.
              </p>
              <div className="flex mt-1">
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="w-1/3 rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                  {countryCodes.map((country) => (
                    <option key={country.code} value={country.dial_code}>
                      {country.name} ({country.dial_code})
                    </option>
                  ))}
                </select>
                <input type="tel" id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required className="w-2/3 rounded-r-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="555-555-5555" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-6">
            <p className="text-sm text-center text-gray-600">Enter the 6-digit code sent to {countryCode}{phoneNumber}</p>
            {devOtp && (
              <div className="p-3 text-center bg-yellow-100 border border-yellow-300 rounded-md">
                <p className="text-sm text-yellow-800">Dev OTP: <strong className="font-mono">{devOtp}</strong></p>
              </div>
            )}
            <div>
              <label htmlFor="otp" className="text-sm font-medium text-gray-700">Verification Code</label>
              <input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required className="w-full px-3 py-2 mt-1 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2 mt-1 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <button type="submit" disabled={loading} className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              {loading ? 'Signing up...' : 'Create Account'}
            </button>
          </form>
        )}

        <p className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
