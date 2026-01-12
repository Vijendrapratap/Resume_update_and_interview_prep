import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Upload, CheckCircle, AlertTriangle, FileText, ArrowRight,
    User, GraduationCap, Briefcase, Shield, X, Check
} from 'lucide-react';
import { verifyIdentity, getResume } from '../services/api';
import toast from 'react-hot-toast';

export default function VerificationPage() {
    const { resumeId } = useParams();
    const navigate = useNavigate();
    const [resumeData, setResumeData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeDocType, setActiveDocType] = useState('id');

    // Document states
    const [documents, setDocuments] = useState({
        id: { file: null, status: 'pending', result: null },
        education: { file: null, status: 'pending', result: null },
        employment: { file: null, status: 'pending', result: null },
    });

    const docTypes = [
        {
            key: 'id',
            label: 'ID Document',
            icon: User,
            description: 'Passport, Driver\'s License, or Government ID',
            required: true,
        },
        {
            key: 'education',
            label: 'Education',
            icon: GraduationCap,
            description: 'Degree certificate, transcript, or diploma',
            required: false,
        },
        {
            key: 'employment',
            label: 'Employment',
            icon: Briefcase,
            description: 'Employment letter, pay stub, or offer letter',
            required: false,
        },
    ];

    useEffect(() => {
        const fetchResume = async () => {
            try {
                const data = await getResume(resumeId);
                setResumeData(data);
            } catch (error) {
                toast.error('Failed to load resume details');
            }
        };
        if (resumeId) fetchResume();
    }, [resumeId]);

    const handleFileChange = (docType, e) => {
        if (e.target.files && e.target.files[0]) {
            setDocuments(prev => ({
                ...prev,
                [docType]: { ...prev[docType], file: e.target.files[0], status: 'pending' }
            }));
        }
    };

    const handleVerify = async (docType) => {
        const doc = documents[docType];
        if (!doc.file) return toast.error('Please select a document first');

        setLoading(true);
        setDocuments(prev => ({
            ...prev,
            [docType]: { ...prev[docType], status: 'verifying' }
        }));

        try {
            const result = await verifyIdentity(resumeId, doc.file, docType);
            const status = result.overall_status === 'verified' ? 'verified' : 'flagged';

            setDocuments(prev => ({
                ...prev,
                [docType]: { ...prev[docType], status, result }
            }));

            if (status === 'verified') {
                toast.success(`${docTypes.find(d => d.key === docType)?.label} verified!`);
            } else {
                toast.error('Verification issues detected');
            }
        } catch (error) {
            setDocuments(prev => ({
                ...prev,
                [docType]: { ...prev[docType], status: 'error' }
            }));
            toast.error(error.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleProceed = () => {
        navigate(`/interview/${resumeId}`);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'verified':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'flagged':
            case 'error':
                return <AlertTriangle className="w-5 h-5 text-red-400" />;
            case 'verifying':
                return <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />;
            default:
                return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
        }
    };

    const idVerified = documents.id.status === 'verified';

    return (
        <div className="max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white">Document Verification</h1>
                    <p className="mt-1 text-gray-400">
                        Verify candidate credentials to reduce hiring fraud risk
                    </p>
                </div>

                {/* Progress Summary */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                            {docTypes.map((doc) => (
                                <div key={doc.key} className="flex items-center space-x-2">
                                    {getStatusIcon(documents[doc.key].status)}
                                    <span className={`text-sm ${
                                        documents[doc.key].status === 'verified'
                                            ? 'text-green-400'
                                            : documents[doc.key].status === 'flagged'
                                            ? 'text-red-400'
                                            : 'text-gray-400'
                                    }`}>
                                        {doc.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Shield className="w-5 h-5 text-purple-400" />
                            <span className="text-sm text-gray-400">
                                {Object.values(documents).filter(d => d.status === 'verified').length}/3 Verified
                            </span>
                        </div>
                    </div>
                </div>

                {/* Document Type Tabs */}
                <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
                    {docTypes.map((doc) => {
                        const Icon = doc.icon;
                        const isActive = activeDocType === doc.key;
                        return (
                            <button
                                key={doc.key}
                                onClick={() => setActiveDocType(doc.key)}
                                className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                            >
                                <Icon className="w-4 h-4 mr-2" />
                                {doc.label}
                                {doc.required && <span className="ml-1 text-red-400">*</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Upload Section */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                    {docTypes.filter(d => d.key === activeDocType).map((doc) => {
                        const docState = documents[doc.key];
                        const Icon = doc.icon;

                        return (
                            <div key={doc.key} className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="p-3 bg-blue-500/20 rounded-lg">
                                        <Icon className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{doc.label}</h3>
                                        <p className="text-gray-400 text-sm">{doc.description}</p>
                                    </div>
                                </div>

                                {/* Upload Area */}
                                <div
                                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                        docState.file
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-gray-600 hover:border-gray-500'
                                    }`}
                                >
                                    {docState.file ? (
                                        <div className="flex items-center justify-center space-x-3">
                                            <FileText className="w-8 h-8 text-blue-400" />
                                            <div className="text-left">
                                                <p className="text-white font-medium">{docState.file.name}</p>
                                                <p className="text-gray-400 text-sm">
                                                    {(docState.file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setDocuments(prev => ({
                                                    ...prev,
                                                    [doc.key]: { file: null, status: 'pending', result: null }
                                                }))}
                                                className="p-1 text-gray-400 hover:text-red-400"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                                            <label className="cursor-pointer">
                                                <span className="text-white font-medium hover:text-blue-400 transition-colors">
                                                    Click to upload
                                                </span>
                                                <span className="text-gray-400"> or drag and drop</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={(e) => handleFileChange(doc.key, e)}
                                                />
                                            </label>
                                            <p className="mt-2 text-xs text-gray-500">PDF, JPG, PNG up to 5MB</p>
                                        </>
                                    )}
                                </div>

                                {/* Verify Button */}
                                <div className="flex justify-center">
                                    <button
                                        onClick={() => handleVerify(doc.key)}
                                        disabled={loading || !docState.file || docState.status === 'verified'}
                                        className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors flex items-center ${
                                            loading || !docState.file
                                                ? 'bg-gray-600 cursor-not-allowed'
                                                : docState.status === 'verified'
                                                ? 'bg-green-600 cursor-default'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    >
                                        {docState.status === 'verifying' ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                                Verifying...
                                            </>
                                        ) : docState.status === 'verified' ? (
                                            <>
                                                <Check className="w-4 h-4 mr-2" />
                                                Verified
                                            </>
                                        ) : (
                                            'Verify Document'
                                        )}
                                    </button>
                                </div>

                                {/* Verification Result */}
                                {docState.result && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-4 rounded-lg border ${
                                            docState.status === 'verified'
                                                ? 'bg-green-500/10 border-green-500/30'
                                                : 'bg-red-500/10 border-red-500/30'
                                        }`}
                                    >
                                        <div className="flex items-start space-x-3">
                                            {docState.status === 'verified' ? (
                                                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                                            ) : (
                                                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                <h4 className={`font-medium ${
                                                    docState.status === 'verified' ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    {docState.status === 'verified' ? 'Verification Successful' : 'Verification Issues'}
                                                </h4>

                                                {/* ID Details */}
                                                {doc.key === 'id' && docState.result.identity_verification && (
                                                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                                        <div>
                                                            <span className="text-gray-400">Name:</span>
                                                            <span className="text-white ml-2">
                                                                {docState.result.identity_verification.full_name}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">DOB:</span>
                                                            <span className="text-white ml-2">
                                                                {docState.result.identity_verification.date_of_birth}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">Document:</span>
                                                            <span className="text-white ml-2">
                                                                {docState.result.identity_verification.document_type || 'ID Card'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">Expiry:</span>
                                                            <span className="text-white ml-2">
                                                                {docState.result.identity_verification.expiry_date || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Gap Analysis */}
                                                {docState.result.gap_analysis && docState.result.gap_analysis.career_gaps?.length > 0 && (
                                                    <div className="mt-3">
                                                        <p className="text-sm text-yellow-400 font-medium">Career Gaps Detected:</p>
                                                        <ul className="mt-1 space-y-1">
                                                            {docState.result.gap_analysis.career_gaps.map((gap, i) => (
                                                                <li key={i} className="text-sm text-gray-300 flex items-center">
                                                                    <AlertTriangle className="w-3 h-3 text-yellow-400 mr-2" />
                                                                    {gap.start} to {gap.end} ({gap.duration_months} months)
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Proceed Button */}
                {idVerified && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-end"
                    >
                        <button
                            onClick={handleProceed}
                            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                            <span>Proceed to Interview</span>
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}

                {/* Verification Benefits */}
                <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                    <h3 className="text-white font-semibold mb-4">Why Document Verification?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-start space-x-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Shield className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-medium">Reduce Fraud</h4>
                                <p className="text-gray-400 text-sm">Validate credentials and reduce hiring fraud risk</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <Check className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-medium">Verify Claims</h4>
                                <p className="text-gray-400 text-sm">Cross-reference education and employment history</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <User className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-medium">Confirm Identity</h4>
                                <p className="text-gray-400 text-sm">Ensure candidate is who they claim to be</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
