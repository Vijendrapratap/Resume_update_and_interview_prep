"use client"

import { mockCandidates, mockJobs } from "@/lib/mockData"
import Link from "next/link"

import { use } from "react"
import {
    ArrowLeft, CheckCircle, AlertTriangle, FileText,
    Shield, Mail, Send, Zap
} from "lucide-react"

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const candidate = mockCandidates.find(c => c.id === id)
    if (!candidate) return <div className="p-8">Candidate not found</div>

    const job = mockJobs.find(j => j.id === candidate.job_id)

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <Link href="/dashboard/candidates" className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Candidates
            </Link>

            {/* Header Profile Card */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200">
                            {candidate.avatar}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-1">{candidate.name}</h1>
                            <div className="flex flex-wrap gap-4 text-gray-500 text-sm">
                                <span className="flex items-center gap-1"><Mail size={16} /> {candidate.email}</span>
                                <span className="flex items-center gap-1"><Briefcase size={16} /> {candidate.role_applied}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href={`/interview/mock-session-${candidate.id}`}
                            target="_blank"
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2"
                        >
                            <Send size={18} /> Start Interview Now
                        </Link>
                    </div>
                </div>

                {/* Score Breakdown Widget - NEW */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 border-t border-gray-100 pt-8">
                    <ScoreCard label="Experience" score={candidate.resume_analysis.experience_score} color="text-blue-600" bg="bg-blue-50" />
                    <ScoreCard label="Education" score={candidate.resume_analysis.education_score} color="text-purple-600" bg="bg-purple-50" />
                    <ScoreCard label="Tech Skills" score={candidate.resume_analysis.technical_score} color="text-indigo-600" bg="bg-indigo-50" />
                    <ScoreCard label="Soft Skills" score={candidate.resume_analysis.soft_skills_score} color="text-green-600" bg="bg-green-50" />
                </div>
            </div>

            {/* Red Flags Alert - NEW */}
            {
                candidate.analytics && (candidate.analytics.job_stability?.job_hopping_risk || candidate.analytics.gap_analysis?.has_gaps) && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 flex items-start gap-4">
                        <div className="bg-red-100 p-2 rounded-lg text-red-600">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-800 mb-2">Attention Required</h3>
                            <div className="space-y-1">
                                {candidate.analytics.job_stability?.job_hopping_risk && (
                                    <div className="text-red-700 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                                        Job Hopping Detected: {candidate.analytics.job_stability.flags[0]}
                                    </div>
                                )}
                                {candidate.analytics.gap_analysis?.has_gaps && candidate.analytics.gap_analysis.gaps.map((gap: { duration_months: number; between: string }, i: number) => (
                                    <div key={i} className="text-red-700 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                                        Employment Gap: {gap.duration_months} months between {gap.between}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Analysis */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Identity Verification Analysis - NEW */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="text-green-600" /> Identity Verification
                            </h3>
                            {candidate.verification.status === 'Verified' ? (
                                <span className="text-sm font-semibold bg-green-50 px-3 py-1 rounded-full text-green-700 border border-green-100 flex items-center gap-1">
                                    <CheckCircle size={14} /> Verified
                                </span>
                            ) : (
                                <span className="text-sm font-semibold bg-gray-50 px-3 py-1 rounded-full text-gray-600 border border-gray-200">
                                    Pending
                                </span>
                            )}
                        </div>
                        <div className="p-6">
                            {candidate.verification.id_data ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Government ID</div>
                                        <div className="font-semibold text-gray-900">{candidate.verification.id_data.id_type}</div>
                                        <div className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle size={10} /> Validated</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Age Verified</div>
                                        <div className="font-semibold text-gray-900">{candidate.verification.id_data.age_verified} yrs</div>
                                        <div className="text-xs text-gray-400">DOB: {candidate.verification.id_data.dob}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Face Match</div>
                                        <div className="font-semibold text-gray-900">{candidate.verification.id_data.face_match}%</div>
                                        <div className="text-xs text-green-600">High Confidence</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Nationality</div>
                                        <div className="font-semibold text-gray-900">{candidate.verification.id_data.nationality}</div>
                                    </div>
                                    <div className="col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Data Consistency Check</div>
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <CheckCircle size={14} className="text-green-500" /> Name match
                                            <CheckCircle size={14} className="text-green-500" /> DOB match
                                            <CheckCircle size={14} className="text-green-500" /> Ethnicity Inference ({candidate.verification.id_data.ethnicity_check})
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-500">
                                    <Shield size={40} className="mx-auto text-gray-200 mb-2" />
                                    <p>No government ID data uploaded yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* JD Compatibility - NEW */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Zap className="text-yellow-600" /> JD Skills Compatibility
                            </h3>
                            <span className="text-sm font-semibold text-gray-600">
                                Target: {job?.title}
                            </span>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-wrap gap-2 mb-6">
                                {/* Combined list logic (mocked) */}
                                {job?.required_skills?.map(skill => {
                                    const hasSkill = candidate.resume_analysis.skills_found.includes(skill);
                                    return (
                                        <span key={skill} className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1 ${hasSkill
                                            ? "bg-green-50 text-green-700 border-green-200"
                                            : "bg-red-50 text-red-700 border-red-200"
                                            }`}>
                                            {hasSkill ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                                            {skill}
                                        </span>
                                    )
                                })}
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <h4 className="text-blue-800 font-bold text-sm mb-2">AI Recommendation Engine</h4>
                                <p className="text-blue-700 text-sm leading-relaxed">
                                    Candidate is a {candidate.recommendation.toLowerCase()} match. They possess strong
                                    fundamentals in {candidate.resume_analysis.skills_found.slice(0, 3).join(", ")}.
                                    {candidate.resume_analysis.skills_missing.length > 0
                                        ? ` However, they are missing critical requirements: ${candidate.resume_analysis.skills_missing.join(", ")}.`
                                        : " No critical skill gaps identified."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Resume Analysis (Existing but condensed) */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        {/* ... reuse content from before or keep simplified ... */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="text-blue-600" /> Deep Resume Analysis
                            </h3>
                            <div className="flex gap-4">
                                <span className="text-sm text-gray-600">Quality: <b>{candidate.resume_analysis.quality_score}/100</b></span>
                                <span className="text-sm text-gray-600">ATS: <b>{candidate.resume_analysis.ats_score}/100</b></span>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Technical Skills Detected</h4>
                                <div className="flex flex-wrap gap-2">
                                    {candidate.resume_analysis.skills_found.map(skill => (
                                        <span key={skill} className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-sm">{skill}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Career Analytics - NEW */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="text-purple-600" /> Career Analytics
                            </h3>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Tenure & Stability */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Job Stability</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <div className="text-xs text-gray-500 font-medium mb-1">Avg Tenure</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {candidate.analytics?.job_stability?.average_tenure_years || "N/A"} <span className="text-sm font-normal text-gray-500">years</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <div className="text-xs text-gray-500 font-medium mb-1">Risk Level</div>
                                        <div className={`text-lg font-bold ${candidate.analytics?.job_stability?.job_hopping_risk ? "text-red-600" : "text-green-600"}`}>
                                            {candidate.analytics?.job_stability?.job_hopping_risk ? "High Risk" : "Low Risk"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Leadership */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Leadership Signals</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(candidate.analytics?.leadership_signals?.length || 0) > 0 ? candidate.analytics?.leadership_signals.map((signal: string) => (
                                        <span key={signal} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium border border-purple-100">
                                            {signal}
                                        </span>
                                    )) : (
                                        <span className="text-gray-500 text-sm italic">No strong leadership signals detected in resume text.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column: Interview & Documents */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Verification Documents</h3>
                        <div className="space-y-3">
                            {candidate.verification.docs.map(doc => (
                                <div key={doc} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                                    <Shield size={18} className="text-green-600" />
                                    <span className="text-sm font-medium text-gray-700 flex-1">{doc}</span>
                                    <span className="text-xs text-green-600 font-bold">Valid</span>
                                </div>
                            ))}
                            {candidate.verification.docs.length === 0 && <p className="text-sm text-gray-500">No documents uploaded.</p>}
                        </div>
                    </div>
                </div>

            </div>
        </div >
    )
}

function Briefcase({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
    )
}

function ScoreCard({ label, score, color, bg }: { label: string, score: number, color: string, bg: string }) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${bg} ${color}`}>
                {score}
            </div>
            <div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">{label}</div>
                <div className="w-24 h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                    <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${score}%` }}></div>
                </div>
            </div>
        </div>
    )
}
