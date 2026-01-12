import { useState } from 'react';
import { Link } from 'react-router-dom';
import JDGenerator from '../components/JDGenerator';
import {
    Users, FileText, CheckCircle, Clock, AlertTriangle,
    TrendingUp, Upload, Eye, PlayCircle, FileCheck,
    ThumbsUp, ThumbsDown, HelpCircle, ChevronRight,
    BarChart3, Shield, Briefcase
} from 'lucide-react';

export default function RecruiterDashboard() {
    const [activeTab, setActiveTab] = useState('overview');

    // Mock data - enhanced with decision support metrics
    const candidates = [
        {
            id: 1,
            name: "Alice Johnson",
            role: "Senior Engineer",
            status: "Interviewed",
            resumeScore: 85,
            interviewScore: 82,
            overallScore: 84,
            verified: true,
            redFlags: 0,
            recommendation: "strong_yes",
            competencies: { technical: 88, communication: 80, analytical: 85, behavioral: 82, leadership: 78 }
        },
        {
            id: 2,
            name: "Bob Smith",
            role: "Product Manager",
            status: "Screening",
            resumeScore: 72,
            interviewScore: null,
            overallScore: 72,
            verified: false,
            redFlags: 2,
            recommendation: "maybe",
            competencies: null
        },
        {
            id: 3,
            name: "Charlie Brown",
            role: "Data Scientist",
            status: "New",
            resumeScore: null,
            interviewScore: null,
            overallScore: null,
            verified: false,
            redFlags: 0,
            recommendation: null,
            competencies: null
        },
        {
            id: 4,
            name: "Diana Lee",
            role: "Frontend Developer",
            status: "Verified",
            resumeScore: 91,
            interviewScore: null,
            overallScore: 91,
            verified: true,
            redFlags: 0,
            recommendation: "yes",
            competencies: null
        },
        {
            id: 5,
            name: "Ethan Wilson",
            role: "DevOps Engineer",
            status: "Interviewed",
            resumeScore: 68,
            interviewScore: 65,
            overallScore: 66,
            verified: true,
            redFlags: 3,
            recommendation: "no",
            competencies: { technical: 62, communication: 70, analytical: 65, behavioral: 68, leadership: 55 }
        },
    ];

    const getRecommendationBadge = (rec) => {
        const badges = {
            strong_yes: { icon: ThumbsUp, bg: 'bg-green-500/20', text: 'text-green-400', label: 'Strong Yes' },
            yes: { icon: ThumbsUp, bg: 'bg-green-500/10', text: 'text-green-300', label: 'Yes' },
            maybe: { icon: HelpCircle, bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Maybe' },
            no: { icon: ThumbsDown, bg: 'bg-red-500/20', text: 'text-red-400', label: 'No' },
            strong_no: { icon: ThumbsDown, bg: 'bg-red-500/30', text: 'text-red-500', label: 'Strong No' },
        };
        if (!rec) return null;
        const badge = badges[rec];
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                <Icon className="w-3 h-3 mr-1" />
                {badge.label}
            </span>
        );
    };

    const getStatusBadge = (status) => {
        const styles = {
            'New': 'bg-gray-700 text-gray-300',
            'Screening': 'bg-blue-500/20 text-blue-400',
            'Verified': 'bg-purple-500/20 text-purple-400',
            'Interviewed': 'bg-green-500/20 text-green-400',
            'Rejected': 'bg-red-500/20 text-red-400',
            'Hired': 'bg-emerald-500/20 text-emerald-400',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles['New']}`}>
                {status}
            </span>
        );
    };

    const getScoreColor = (score) => {
        if (!score) return 'text-gray-500';
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    // Pipeline stats
    const pipelineStats = {
        new: candidates.filter(c => c.status === 'New').length,
        screening: candidates.filter(c => c.status === 'Screening').length,
        verified: candidates.filter(c => c.status === 'Verified').length,
        interviewed: candidates.filter(c => c.status === 'Interviewed').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Recruiter Dashboard</h1>
                    <p className="text-gray-400 mt-1">Hiring pipeline & decision support</p>
                </div>
                <Link
                    to="/analyze"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Upload className="w-4 h-4 mr-2" />
                    Analyze New Resume
                </Link>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'overview'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                >
                    Pipeline & Candidates
                </button>
                <button
                    onClick={() => setActiveTab('jd-generator')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'jd-generator'
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                >
                    JD Generator
                </button>
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase">New</p>
                                    <p className="text-2xl font-bold text-white mt-1">{pipelineStats.new}</p>
                                </div>
                                <div className="p-2 bg-gray-700 rounded-lg">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase">Screening</p>
                                    <p className="text-2xl font-bold text-blue-400 mt-1">{pipelineStats.screening}</p>
                                </div>
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Eye className="w-5 h-5 text-blue-400" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase">Verified</p>
                                    <p className="text-2xl font-bold text-purple-400 mt-1">{pipelineStats.verified}</p>
                                </div>
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <Shield className="w-5 h-5 text-purple-400" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase">Interviewed</p>
                                    <p className="text-2xl font-bold text-green-400 mt-1">{pipelineStats.interviewed}</p>
                                </div>
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                            to="/analyze"
                            className="flex items-center p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors group"
                        >
                            <div className="p-3 bg-blue-500/20 rounded-lg mr-4">
                                <Upload className="w-6 h-6 text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-medium">Upload Resume</h3>
                                <p className="text-gray-400 text-sm">Analyze with AI scoring</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" />
                        </Link>
                        <div className="flex items-center p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500 transition-colors group cursor-pointer">
                            <div className="p-3 bg-purple-500/20 rounded-lg mr-4">
                                <FileCheck className="w-6 h-6 text-purple-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-medium">Verify Documents</h3>
                                <p className="text-gray-400 text-sm">ID, education, employment</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
                        </div>
                        <div className="flex items-center p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-green-500 transition-colors group cursor-pointer">
                            <div className="p-3 bg-green-500/20 rounded-lg mr-4">
                                <PlayCircle className="w-6 h-6 text-green-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-medium">Send Interview Link</h3>
                                <p className="text-gray-400 text-sm">AI-powered interview</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-colors" />
                        </div>
                    </div>

                    {/* Candidate Table with Decision Support */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Candidate Pipeline</h2>
                            <span className="text-sm text-gray-400">{candidates.length} candidates</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-900/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Candidate</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Resume</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Interview</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Red Flags</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Verified</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Recommendation</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {candidates.map((candidate) => (
                                        <tr key={candidate.id} className="hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-white">{candidate.name}</div>
                                                    <div className="text-xs text-gray-400">{candidate.role}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(candidate.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-medium ${getScoreColor(candidate.resumeScore)}`}>
                                                    {candidate.resumeScore || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-medium ${getScoreColor(candidate.interviewScore)}`}>
                                                    {candidate.interviewScore || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {candidate.redFlags > 0 ? (
                                                    <span className="inline-flex items-center text-red-400 text-sm">
                                                        <AlertTriangle className="w-4 h-4 mr-1" />
                                                        {candidate.redFlags}
                                                    </span>
                                                ) : (
                                                    <span className="text-green-400 text-sm">None</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {candidate.verified ? (
                                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                                ) : (
                                                    <span className="text-xs text-gray-500">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getRecommendationBadge(candidate.recommendation)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    <button className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors" title="View Details">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors" title="Start Interview">
                                                        <PlayCircle className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-colors" title="View Report">
                                                        <BarChart3 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Decision Support Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Ready to Interview */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
                                Ready to Interview
                            </h3>
                            <div className="space-y-3">
                                {candidates.filter(c => c.verified && !c.interviewScore && c.resumeScore >= 70).map(c => (
                                    <div key={c.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                        <div>
                                            <p className="text-white font-medium">{c.name}</p>
                                            <p className="text-gray-400 text-sm">{c.role} • Score: {c.resumeScore}</p>
                                        </div>
                                        <button className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                                            Schedule
                                        </button>
                                    </div>
                                ))}
                                {candidates.filter(c => c.verified && !c.interviewScore && c.resumeScore >= 70).length === 0 && (
                                    <p className="text-gray-400 text-sm">No candidates ready for interview</p>
                                )}
                            </div>
                        </div>

                        {/* Needs Attention */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
                                Needs Attention
                            </h3>
                            <div className="space-y-3">
                                {candidates.filter(c => c.redFlags > 0 || (c.resumeScore && c.resumeScore < 70)).map(c => (
                                    <div key={c.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                        <div>
                                            <p className="text-white font-medium">{c.name}</p>
                                            <p className="text-gray-400 text-sm">
                                                {c.redFlags > 0 ? `${c.redFlags} red flags` : `Low score: ${c.resumeScore}`}
                                            </p>
                                        </div>
                                        <button className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-500 transition-colors">
                                            Review
                                        </button>
                                    </div>
                                ))}
                                {candidates.filter(c => c.redFlags > 0 || (c.resumeScore && c.resumeScore < 70)).length === 0 && (
                                    <p className="text-gray-400 text-sm">No candidates need attention</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'jd-generator' && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                    <JDGenerator />
                </div>
            )}
        </div>
    );
}
