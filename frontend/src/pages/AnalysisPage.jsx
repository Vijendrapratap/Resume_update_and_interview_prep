import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  FileText,
  Loader2,
  ArrowRight,
  RefreshCw,
  User,
  Briefcase,
  Code,
  Database,
  Cloud,
  Wrench,
  Award,
  TrendingUp,
  MessageSquare,
  GraduationCap,
  Building,
  AlertCircle,
  Target,
  Lightbulb,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeResume, getResume } from '../services/api'

export default function AnalysisPage() {
  const { resumeId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [resume, setResume] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const jobDescription = location.state?.jobDescription || ''

  useEffect(() => {
    loadAnalysis()
  }, [resumeId])

  const loadAnalysis = async () => {
    setLoading(true)
    try {
      const resumeData = await getResume(resumeId)
      setResume(resumeData)

      const analysisResult = await analyzeResume(resumeId, jobDescription || null)
      setAnalysis(analysisResult)
    } catch (error) {
      console.error('Error loading analysis:', error)
      toast.error(error.message || 'Failed to analyze resume')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-500/10 border-green-500/30'
    if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/30'
    return 'bg-red-500/10 border-red-500/30'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-white">Analyzing resume...</p>
          <p className="text-gray-400 text-sm">Extracting candidate information and calculating scores</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Failed to load analysis</p>
        <button onClick={loadAnalysis} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Try Again
        </button>
      </div>
    )
  }

  const profile = analysis.candidate_profile || {}
  const techSkills = analysis.technical_skills || {}
  const domainExpertise = analysis.domain_expertise || {}

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Candidate Analysis</h1>
          <p className="text-gray-400 text-sm flex items-center mt-1">
            <FileText className="w-4 h-4 mr-1" />
            {resume?.filename}
          </p>
        </div>
        <button
          onClick={loadAnalysis}
          className="flex items-center text-gray-400 hover:text-white text-sm"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </button>
      </div>

      {/* Candidate Profile Card */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white">
              {profile.title || 'Professional'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded">
                {profile.career_stage || 'Professional'}
              </span>
              <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                {profile.domain || 'Technology'}
              </span>
              {profile.years_experience && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                  {profile.years_experience}
                </span>
              )}
            </div>
            {(profile.current_company || profile.current_role) && (
              <p className="text-sm text-gray-400 mt-2 flex items-center">
                <Building className="w-4 h-4 mr-1" />
                {profile.current_role && <span>{profile.current_role}</span>}
                {profile.current_role && profile.current_company && <span className="mx-1">at</span>}
                {profile.current_company && <span className="font-medium text-white">{profile.current_company}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Recruiter Verdict */}
        {analysis.verdict && (
          <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <p className="text-sm text-blue-300">
              <strong className="text-blue-400">Recruiter Assessment:</strong> {analysis.verdict}
            </p>
          </div>
        )}
      </div>

      {/* JD Recommendation Banner - Show when no JD provided */}
      {(!jobDescription && (analysis.jd_recommendation || !analysis.jd_match_score)) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">
                Add a Job Description for Better Insights
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                {analysis.jd_recommendation?.recommendation_message ||
                  "Provide a job description to unlock skills gap analysis, match percentage, and role-specific interview questions."}
              </p>
              <div className="flex flex-wrap gap-2">
                {(analysis.jd_recommendation?.benefits_of_jd || [
                  "Skills match analysis",
                  "Gap identification",
                  "Match percentage",
                  "Tailored interview questions"
                ]).map((benefit, idx) => (
                  <span key={idx} className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full flex items-center">
                    <Lightbulb className="w-3 h-3 mr-1" />
                    {benefit}
                  </span>
                ))}
              </div>
              <button
                onClick={() => navigate('/', { state: { resumeId, showJdInput: true } })}
                className="mt-4 inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Target className="w-4 h-4 mr-2" />
                Add Job Description
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strengths & Concerns - New section */}
      {(analysis.strengths?.length > 0 || analysis.concerns?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.strengths?.length > 0 && (
            <div className="bg-white rounded-xl border border-green-200 p-5">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                Key Strengths
              </h3>
              <div className="space-y-2">
                {analysis.strengths.map((strength, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{strength}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {analysis.concerns?.length > 0 && (
            <div className="bg-white rounded-xl border border-orange-200 p-5">
              <h3 className="font-semibold text-orange-800 mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
                Areas to Explore
              </h3>
              <div className="space-y-2">
                {analysis.concerns.map((concern, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-orange-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{concern}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Skills Match Analysis - Show when JD is provided */}
      {analysis.skills_match?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-primary-600" />
            Skills Match Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.skills_match.map((match, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${match.status === 'strong_match'
                  ? 'bg-green-50 border border-green-200'
                  : match.status === 'match'
                    ? 'bg-blue-50 border border-blue-200'
                    : match.status === 'weak_match'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
              >
                <div>
                  <span className="font-medium text-sm">{match.skill}</span>
                  {match.evidence && (
                    <p className="text-xs text-gray-500 mt-0.5">{match.evidence}</p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${match.status === 'strong_match'
                    ? 'bg-green-200 text-green-800'
                    : match.status === 'match'
                      ? 'bg-blue-200 text-blue-800'
                      : match.status === 'weak_match'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-red-200 text-red-800'
                    }`}
                >
                  {match.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gap Analysis - Show when JD is provided */}
      {analysis.gap_analysis && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
            Gap Analysis
          </h3>
          <div className="space-y-4">
            {analysis.gap_analysis.missing_required?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-red-600 uppercase mb-2">Missing Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.gap_analysis.missing_required.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {analysis.gap_analysis.missing_preferred?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-yellow-600 uppercase mb-2">Missing Preferred Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.gap_analysis.missing_preferred.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {analysis.gap_analysis.transferable_skills?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-green-600 uppercase mb-2">Transferable Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.gap_analysis.transferable_skills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hiring Recommendation - Show when JD is provided */}
      {analysis.hiring_recommendation && (
        <div className={`rounded-xl border p-5 ${analysis.hiring_recommendation.decision === 'strong_yes'
          ? 'bg-green-50 border-green-300'
          : analysis.hiring_recommendation.decision === 'yes'
            ? 'bg-green-50 border-green-200'
            : analysis.hiring_recommendation.decision === 'maybe'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Hiring Recommendation</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${analysis.hiring_recommendation.decision === 'strong_yes'
              ? 'bg-green-200 text-green-800'
              : analysis.hiring_recommendation.decision === 'yes'
                ? 'bg-green-100 text-green-700'
                : analysis.hiring_recommendation.decision === 'maybe'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
              {analysis.hiring_recommendation.decision.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          {analysis.hiring_recommendation.key_reasons?.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Key Reasons</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {analysis.hiring_recommendation.key_reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.hiring_recommendation.interview_focus?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Interview Focus Areas</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.hiring_recommendation.interview_focus.map((focus, idx) => (
                  <span key={idx} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded">
                    {focus}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Score Cards - Weighted Scoring */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`p-4 rounded-lg border ${getScoreBg(analysis.overall_score)} bg-gray-800`}>
          <span className="text-xs font-medium text-gray-400">Overall Score</span>
          <div className={`text-3xl font-bold ${getScoreColor(analysis.overall_score)}`}>
            {Math.round(analysis.overall_score || 0)}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-700 bg-gray-800">
          <span className="text-xs font-medium text-gray-400">Skills (40%)</span>
          <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.skills_score || analysis.technical_score)}`}>
            {Math.round(analysis.skills_score || analysis.technical_score || 0)}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-700 bg-gray-800">
          <span className="text-xs font-medium text-gray-400">Experience (30%)</span>
          <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.experience_score)}`}>
            {Math.round(analysis.experience_score || 0)}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-700 bg-gray-800">
          <span className="text-xs font-medium text-gray-400">Education (20%)</span>
          <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.education_score)}`}>
            {Math.round(analysis.education_score || 0)}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-700 bg-gray-800">
          <span className="text-xs font-medium text-gray-400">Quality (10%)</span>
          <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.quality_score)}`}>
            {Math.round(analysis.quality_score || 0)}
          </div>
        </div>
      </div>

      {/* Red Flags Section */}
      {(analysis.red_flags?.length > 0 || analysis.red_flag_count > 0) && (
        <div className={`p-5 rounded-xl border ${
          analysis.red_flag_severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
          analysis.red_flag_severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
          'bg-gray-800 border-gray-700'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white flex items-center">
              <AlertTriangle className={`w-5 h-5 mr-2 ${
                analysis.red_flag_severity === 'high' ? 'text-red-400' :
                analysis.red_flag_severity === 'medium' ? 'text-yellow-400' :
                'text-gray-400'
              }`} />
              Red Flag Assessment
            </h3>
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                analysis.red_flag_severity === 'high' ? 'bg-red-500/20 text-red-400' :
                analysis.red_flag_severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                analysis.red_flag_severity === 'low' ? 'bg-blue-500/20 text-blue-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {analysis.red_flag_count || 0} flags ({analysis.red_flag_severity || 'none'})
              </span>
              <span className="text-sm text-gray-400">
                Authenticity: <span className={getScoreColor(analysis.authenticity_score)}>{analysis.authenticity_score || 100}%</span>
              </span>
            </div>
          </div>
          {analysis.red_flags?.length > 0 && (
            <div className="space-y-2">
              {analysis.red_flags.map((flag, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    flag.severity === 'high' ? 'text-red-400' :
                    flag.severity === 'medium' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`} />
                  <span className="text-gray-300">
                    <span className="font-medium text-white">{flag.type?.replace('_', ' ')}:</span> {flag.description}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Key Skills - Core Competencies */}
      {analysis.key_skills?.length > 0 && (
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Award className="w-5 h-5 mr-2 text-primary-600" />
            Core Competencies
          </h3>
          <div className="flex flex-wrap gap-2">
            {analysis.key_skills.map((skill, idx) => (
              <span key={idx} className="px-4 py-2 bg-white text-primary-700 text-sm font-medium rounded-lg border border-primary-200 shadow-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Technical Skills */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Code className="w-5 h-5 mr-2 text-primary-600" />
          Technical Skills
        </h3>
        <div className="space-y-4">
          {techSkills.languages?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center">
                <Code className="w-3 h-3 mr-1" /> Languages
              </h4>
              <div className="flex flex-wrap gap-2">
                {techSkills.languages.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {techSkills.frameworks?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center">
                <Wrench className="w-3 h-3 mr-1" /> Frameworks & Libraries
              </h4>
              <div className="flex flex-wrap gap-2">
                {techSkills.frameworks.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {techSkills.databases?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center">
                <Database className="w-3 h-3 mr-1" /> Databases
              </h4>
              <div className="flex flex-wrap gap-2">
                {techSkills.databases.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {techSkills.cloud_devops?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center">
                <Cloud className="w-3 h-3 mr-1" /> Cloud & DevOps
              </h4>
              <div className="flex flex-wrap gap-2">
                {techSkills.cloud_devops.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-orange-50 text-orange-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {techSkills.tools?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center">
                <Wrench className="w-3 h-3 mr-1" /> Tools & Platforms
              </h4>
              <div className="flex flex-wrap gap-2">
                {techSkills.tools.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Domain Expertise & Certifications */}
      {(domainExpertise.industries?.length > 0 || domainExpertise.specializations?.length > 0 || domainExpertise.certifications?.length > 0 || analysis.certifications?.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-primary-600" />
            Domain Expertise
          </h3>
          <div className="space-y-4">
            {domainExpertise.industries?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Industries</h4>
                <div className="flex flex-wrap gap-2">
                  {domainExpertise.industries.map((item, idx) => (
                    <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {domainExpertise.specializations?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Specializations</h4>
                <div className="flex flex-wrap gap-2">
                  {domainExpertise.specializations.map((item, idx) => (
                    <span key={idx} className="px-3 py-1 bg-teal-50 text-teal-700 text-sm rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(domainExpertise.certifications?.length > 0 || analysis.certifications?.length > 0) && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Certifications</h4>
                <div className="flex flex-wrap gap-2">
                  {(domainExpertise.certifications || analysis.certifications || []).map((cert, idx) => (
                    <span key={idx} className="px-3 py-1 bg-yellow-50 text-yellow-700 text-sm rounded-full font-medium">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Soft Skills */}
      {analysis.soft_skills?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-primary-600" />
            Leadership & Soft Skills
          </h3>
          <div className="space-y-2">
            {analysis.soft_skills.map((skill, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{skill}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Career Highlights */}
      {analysis.career_highlights?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Key Achievements
          </h3>
          <div className="space-y-3">
            {analysis.career_highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience Summary */}
      {analysis.experience_summary?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Briefcase className="w-5 h-5 mr-2 text-primary-600" />
            Work History
          </h3>
          <div className="space-y-4">
            {analysis.experience_summary.map((exp, idx) => (
              <div key={idx} className="border-l-2 border-primary-200 pl-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{exp.role}</h4>
                  <span className="text-xs text-gray-500">{exp.duration}</span>
                </div>
                <p className="text-sm text-primary-600">{exp.company}</p>
                {exp.highlight && (
                  <p className="text-sm text-gray-600 mt-1">{exp.highlight}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {analysis.education?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <GraduationCap className="w-5 h-5 mr-2 text-primary-600" />
            Education
          </h3>
          <div className="space-y-3">
            {analysis.education.map((edu, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{edu.degree}</h4>
                  <p className="text-sm text-gray-600">{edu.institution}</p>
                  {edu.year && <p className="text-xs text-gray-500">{edu.year}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interview Topics */}
      {analysis.interview_topics?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
            Suggested Interview Topics
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Key areas to explore during the interview:
          </p>
          <div className="space-y-2">
            {analysis.interview_topics.map((topic, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg border border-primary-100">
                <span className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {idx + 1}
                </span>
                <p className="text-sm text-gray-700">{topic}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/verification/${resumeId}`)}
            className="flex items-center px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Award className="w-5 h-5 mr-2" />
            Verify Identity
          </button>
          <button
            onClick={() => navigate(`/interview/${resumeId}`, { state: { jobDescription } })}
            className="flex items-center px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Start Mock Interview
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  )
}
