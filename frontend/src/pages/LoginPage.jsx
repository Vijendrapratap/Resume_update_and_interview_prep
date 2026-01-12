import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(email, password);
        } catch (error) {
            // Error handled in context
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl"
            >
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                        Sign in to AI Interviewer
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-400">
                        Or{' '}
                        <Link to="/register" className="font-medium text-blue-500 hover:text-blue-400">
                            create a new account
                        </Link>
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>

                {/* Demo Credentials */}
                <div className="mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <p className="text-xs text-gray-400 text-center mb-3">Demo Accounts (click to fill)</p>
                    <div className="space-y-2">
                        <button
                            onClick={() => { setEmail('recruiter@company.com'); setPassword('recruiter123'); }}
                            className="w-full text-left px-3 py-2 bg-gray-800 rounded-md hover:bg-gray-600 transition-colors"
                        >
                            <span className="text-sm text-white">recruiter@company.com</span>
                            <span className="text-xs text-gray-400 ml-2">/ recruiter123</span>
                        </button>
                        <button
                            onClick={() => { setEmail('hr@techcorp.com'); setPassword('hr123456'); }}
                            className="w-full text-left px-3 py-2 bg-gray-800 rounded-md hover:bg-gray-600 transition-colors"
                        >
                            <span className="text-sm text-white">hr@techcorp.com</span>
                            <span className="text-xs text-gray-400 ml-2">/ hr123456</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
