import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Download,
  CheckCircle,
  XCircle,
  TrendingUp,
  Award,
  Target,
  Brain,
  MessageSquare,
  Loader2,
  Home,
  RefreshCw
} from 'lucide-react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts'
import toast from 'react-hot-toast'
import { getInterviewReport, downloadReportPDF } from '../services/api'

export default function ReportPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)

  useEffect(() => {
    loadReport()
  }, [sessionId])

  const loadReport = async () => {
    setLoading(true)
    try {
      const result = await getInterviewReport(sessionId)
      setReport(result)
    } catch (error) {
      console.error('Error loading report:', error)
      toast.error(error.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      await downloadReportPDF(sessionId, 'interview')
      toast.success('Report downloaded!')
    } catch (error) {
      toast.error('Failed to download report')
    }
  }

  const getRecommendationColor = (rec) => {
    switch (rec) {
      case 'Strong Hire': return 'bg-success-500'
      case 'Hire': return 'bg-success-400'
      case 'Maybe': return 'bg-warning-500'
      case 'No Hire': return 'bg-danger-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">Generating your report...</p>
          <p className="text-gray-500">Analyzing your interview performance</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load report</p>
        <button onClick={loadReport} className="btn btn-primary mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    )
  }

  const radarData = Object.entries(report.performance_metrics || {}).map(([key, value]) => ({
    subject: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    score: value,
    fullMark: 100
  }))

  const barData = (report.question_feedback || []).map((q, idx) => ({
    name: `Q${idx + 1}`,
    score: q.score * 10,
    fullScore: 100
  }))

  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316']

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Interview Report</h1>
          <p className="text-gray-500 mt-1">
            Your comprehensive performance analysis
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/')} className="btn btn-secondary">
            <Home className="w-4 h-4 mr-2" />
            Home
          </button>
          <button onClick={handleDownloadPDF} className="btn btn-primary">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </button>
        </div>
      </motion.div>

      {/* OVI-Inspired Pipeline Tracker */}
      <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center overflow-x-auto">
        {['Received', 'CV Screen', 'Link Sent', 'AI Interview', 'Report Ready'].map((step, idx) => (
          <div key={step} className="flex flex-col items-center min-w-[100px]">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mb-2 
                  ${idx <= 3 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              {idx <= 3 ? <CheckCircle className="w-5 h-5" /> : idx + 1}
            </div>
            <span className={`text-xs font-medium ${idx <= 3 ? 'text-green-700' : 'text-gray-400'}`}>{step}</span>
            {idx <= 3 && <span className="text-[10px] text-green-600 mt-1">Completed</span>}
          </div>
        ))}
      </div>

      {/* Tenure & Experience Metrics (New) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Experience</p>
          <p className="text-xl font-bold text-gray-900 mt-1">7 Years</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Avg Tenure</p>
          <p className="text-xl font-bold text-gray-900 mt-1">2.3 Years</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Current Tenure</p>
          <p className="text-xl font-bold text-gray-900 mt-1">0.9 Years</p>
        </div>
      </div>

      {/* Overall Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm font-medium mb-2">Overall Score</p>
            <div className="text-6xl font-bold mb-2">
              {Math.round(report.overall_score)}
              <span className="text-2xl text-primary-200">/100</span>
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full ${getRecommendationColor(report.recommendation)}`}>
              <Award className="w-4 h-4 mr-1" />
              {report.recommendation}
            </div>
          </div>
          <div className="text-right">
            <div className="w-32 h-32 rounded-full border-8 border-white/20 flex items-center justify-center">
              <div className="text-4xl font-bold">{Math.round(report.overall_score)}%</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Verification & Trust Score - NEW */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={`card border-l-4 ${report.verification_status?.overall === 'verified' ? 'border-green-500' : 'border-orange-500'}`}
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Award className={`w-5 h-5 mr-2 ${report.verification_status?.overall === 'verified' ? 'text-green-600' : 'text-orange-600'}`} />
            Identity Verification
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Document Status</p>
              <p className={`font-semibold ${report.verification_status?.overall === 'verified' ? 'text-green-700' : 'text-orange-700'}`}>
                {report.verification_status?.overall === 'verified' ? 'Verified ID' : 'Verification Flagged'}
              </p>
            </div>
            {report.verification_status?.overall === 'verified' ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <XCircle className="w-8 h-8 text-orange-500" />
            )}
          </div>
          {report.verification_status?.fraud_checks && (
            <div className="mt-4 text-xs text-gray-500">
              <p>Checks passed: {report.verification_status.fraud_checks.passed}/{report.verification_status.fraud_checks.total}</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="card border-l-4 border-blue-500"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Career Gap Analysis
          </h2>
          <div className="space-y-2">
            {report.gap_analysis?.has_gaps ? (
              <div>
                <p className="text-sm font-medium text-orange-600">Gaps/Inconsistencies Detected</p>
                <ul className="mt-2 text-xs text-gray-600 list-disc list-inside">
                  {report.gap_analysis.details.map((gap, i) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center text-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Timeline verified and consistent.</span>
              </div>
            )}
          </div>
        </motion.div>
      </div >

      {/* Executive Summary */}
      {
        report.executive_summary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-primary-600" />
              Executive Summary
            </h2>
            <p className="text-gray-700 leading-relaxed">{report.executive_summary}</p>
          </motion.div>
        )
      }

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid lg:grid-cols-2 gap-6"
      >
        {/* Radar Chart - Performance Metrics */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Question Scores */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Question-by-Question Scores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Strengths and Improvements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid md:grid-cols-2 gap-6"
      >
        {/* Strengths */}
        <div className="card border-l-4 border-success-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-success-500" />
            Strengths
          </h3>
          <ul className="space-y-3">
            {(report.strengths || []).slice(0, 5).map((strength, idx) => (
              <li key={idx} className="flex items-start">
                <span className="w-2 h-2 bg-success-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="card border-l-4 border-warning-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-warning-500" />
            Areas for Improvement
          </h3>
          <ul className="space-y-3">
            {(report.areas_for_improvement || []).slice(0, 5).map((area, idx) => (
              <li key={idx} className="flex items-start">
                <span className="w-2 h-2 bg-warning-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span className="text-gray-700">{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Detailed Question Feedback (OVI Style) */}
      {
        report.question_feedback?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="card overflow-hidden"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
              Interview Transcript & Analysis
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="py-3 pl-4">Q#</th>
                    <th className="py-3">Question</th>
                    <th className="py-3">Summary & Analysis</th>
                    <th className="py-3 text-right pr-4">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.question_feedback.map((q, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-4 align-top w-12 text-center">
                        <span className="inline-block w-6 h-6 bg-gray-100 text-gray-600 text-xs font-bold rounded-full pt-1">
                          {q.question_number}
                        </span>
                      </td>
                      <td className="py-4 align-top w-1/3 pr-4">
                        <p className="text-sm font-medium text-gray-900">{q.question}</p>
                      </td>
                      <td className="py-4 align-top">
                        <p className="text-sm text-gray-600 mb-2 font-medium">Response Summary:</p>
                        <p className="text-sm text-gray-600 mb-3">{q.response_summary}</p>

                        {(q.strengths?.length > 0 || q.improvements?.length > 0) && (
                          <div className="flex gap-4">
                            {q.strengths?.length > 0 && (
                              <span className="inline-flex items-center text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Strong Point
                              </span>
                            )}
                            {q.improvements?.length > 0 && (
                              <span className="inline-flex items-center text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Needs Improvement
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 align-top text-right pr-4">
                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-xs
                          ${q.score >= 7 ? 'border-green-500 text-green-600' :
                            q.score >= 5 ? 'border-orange-500 text-orange-600' :
                              'border-red-500 text-red-600'
                          }`}>
                          {q.score}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )
      }

      {/* Improvement Roadmap */}
      {
        report.improvement_roadmap && Object.keys(report.improvement_roadmap).length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
              Improvement Roadmap
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {['immediate_actions', 'short_term', 'medium_term'].map((period, idx) => {
                const items = report.improvement_roadmap[period] || []
                const labels = ['30 Days', '60 Days', '90 Days']
                const colors = ['bg-primary-50 border-primary-200', 'bg-blue-50 border-blue-200', 'bg-purple-50 border-purple-200']

                return items.length > 0 ? (
                  <div key={period} className={`p-4 rounded-lg border ${colors[idx]}`}>
                    <h4 className="font-medium text-gray-900 mb-3">{labels[idx]}</h4>
                    <ul className="space-y-2 text-sm">
                      {items.slice(0, 4).map((item, i) => (
                        <li key={i} className="flex items-start text-gray-700">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              })}
            </div>
          </motion.div>
        )
      }

      {/* Interview Tips */}
      {
        report.interview_tips?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="card bg-gradient-to-r from-primary-50 to-blue-50"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pro Tips for Next Time</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {report.interview_tips.slice(0, 6).map((tip, idx) => (
                <div key={idx} className="flex items-start">
                  <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-gray-700 text-sm">{tip}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )
      }

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex justify-center gap-4"
      >
        <button onClick={() => navigate('/')} className="btn btn-secondary">
          <Home className="w-4 h-4 mr-2" />
          Back to Home
        </button>
        <button onClick={handleDownloadPDF} className="btn btn-primary">
          <Download className="w-4 h-4 mr-2" />
          Download Full Report
        </button>
      </motion.div>
    </div >
  )
}
