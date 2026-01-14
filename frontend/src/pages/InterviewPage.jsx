import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Loader2,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle,
  ArrowRight,
  User,
  Bot,
  PlayCircle,
  StopCircle,
  Settings,
  Maximize,
  Minimize,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  startInterview,
  submitResponse,
  endInterview,
  synthesizeSpeech
} from '../services/api'

export default function InterviewPage() {
  const { resumeId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [session, setSession] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [response, setResponse] = useState('')
  const [messages, setMessages] = useState([])
  const [mode, setMode] = useState('voice') // text or voice - default to voice for audio interviewer
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [audioEnabled, setAudioEnabled] = useState(true) // Auto-speak questions
  const [audioLoading, setAudioLoading] = useState(false)

  // Proctoring State
  const [cameraActive, setCameraActive] = useState(false)
  const [warnings, setWarnings] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenDismissed, setFullscreenDismissed] = useState(false)
  const videoRef = useRef(null)
  const containerRef = useRef(null)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)

  const jobDescription = location.state?.jobDescription || ''

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += transcript + ' '
          } else {
            interim += transcript
          }
        }

        if (final) {
          setResponse(prev => prev + final)
        }
        setInterimTranscript(interim)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone permissions.')
        } else if (event.error !== 'no-speech') {
          toast.error(`Speech recognition error: ${event.error}`)
        }
        setIsRecording(false)
      }

      recognitionRef.current.onend = () => {
        // Restart if still supposed to be recording
        if (isRecording && recognitionRef.current) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            console.log('Recognition already started')
          }
        }
      }
    } else {
      toast.error('Speech recognition is not supported in this browser. Please use Chrome.')
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      stopCamera()
    }
  }, [])

  // Proctoring: Webcam Setup
  useEffect(() => {
    startCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (err) {
      console.error("Camera error:", err)
      toast.error("Camera access required for proctoring")
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop())
    }
  }

  // Proctoring: Fullscreen Mode
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen()
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen()
      }
      setIsFullscreen(true)
    } catch (err) {
      console.error("Fullscreen error:", err)
      toast.error("Could not enter fullscreen mode")
    }
  }

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen()
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen()
    }
    setIsFullscreen(false)
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      )
      setIsFullscreen(isCurrentlyFullscreen)

      // Log warning if user exits fullscreen during interview
      if (!isCurrentlyFullscreen && session && session.status === 'in_progress' && !isComplete) {
        const warning = `Exited fullscreen at ${new Date().toLocaleTimeString()}`
        setWarnings(prev => [...prev, warning])
        toast.error("Warning: Fullscreen mode exited!", { icon: '⚠️' })
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('msfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', handleFullscreenChange)
    }
  }, [session, isComplete])

  // Proctoring: Tab Switching Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const warning = `Tab switch detected at ${new Date().toLocaleTimeString()}`
        setWarnings(prev => [...prev, warning])
        toast.error("Warning: Switching tabs is monitored during the interview!", { icon: '⚠️' })
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  useEffect(() => {
    initializeInterview()
  }, [resumeId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeInterview = async () => {
    setLoading(true)
    try {
      const result = await startInterview({
        resumeId,
        jobDescription: jobDescription || null,
        interviewType: 'comprehensive',
        numQuestions: 7,
        mode,
        difficulty: 'mid'
      })

      setSession(result)
      setCurrentQuestion(result.first_question)

      // Add intro message
      setMessages([
        {
          type: 'system',
          content: result.intro_message
        },
        {
          type: 'question',
          content: result.first_question.question,
          questionNumber: result.first_question.question_number,
          totalQuestions: result.first_question.total_questions,
          topic: result.first_question.topic
        }
      ])

      // Auto-speak the intro and first question when audio is enabled
      if (audioEnabled) {
        // Small delay to let the UI render first
        setTimeout(() => {
          speakText(result.intro_message + ' ' + result.first_question.question)
        }, 500)
      }
    } catch (error) {
      console.error('Error starting interview:', error)
      toast.error(error.message || 'Failed to start interview')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitResponse = async () => {
    const finalResponse = response.trim()
    if (!finalResponse || submitting) return

    // Stop recording if active
    if (isRecording) {
      stopRecording()
    }

    setSubmitting(true)
    setInterimTranscript('')

    // Add user message
    setMessages(prev => [...prev, {
      type: 'answer',
      content: finalResponse
    }])

    setResponse('')

    try {
      const result = await submitResponse(session.session_id, finalResponse)

      // Add feedback message
      setMessages(prev => [...prev, {
        type: 'feedback',
        content: result.evaluation_summary,
        scores: result.scores
      }])

      if (result.is_complete) {
        setIsComplete(true)
        setMessages(prev => [...prev, {
          type: 'system',
          content: "Great job completing the interview! Click 'View Report' to see your detailed feedback and scores."
        }])
        if (audioEnabled) {
          speakText("Great job completing the interview! You can now view your detailed report.")
        }
      } else if (result.next_question) {
        setCurrentQuestion(result.next_question)
        setMessages(prev => [...prev, {
          type: 'question',
          content: result.next_question.question,
          questionNumber: result.next_question.question_number,
          totalQuestions: result.next_question.total_questions,
          topic: result.next_question.topic
        }])

        // Auto-speak the next question when audio is enabled
        if (audioEnabled) {
          speakText(result.next_question.question)
        }
      }
    } catch (error) {
      console.error('Error submitting response:', error)
      toast.error(error.message || 'Failed to submit response')
    } finally {
      setSubmitting(false)
    }
  }

  const speakText = async (text) => {
    if (!audioEnabled || !text) return

    // Stop any currently playing audio
    stopSpeaking()

    try {
      setAudioLoading(true)
      setIsSpeaking(true)

      // Use backend TTS for high-quality neural voice
      const result = await synthesizeSpeech(text)

      if (result?.audio_url) {
        // Create audio element and play
        const audio = new Audio(result.audio_url)
        audioRef.current = audio

        audio.onended = () => {
          setIsSpeaking(false)
          setAudioLoading(false)
        }
        audio.onerror = () => {
          setIsSpeaking(false)
          setAudioLoading(false)
          // Fallback to browser TTS
          fallbackSpeakText(text)
        }

        await audio.play()
        setAudioLoading(false)
      } else {
        // Fallback to browser TTS
        fallbackSpeakText(text)
      }
    } catch (error) {
      console.error('TTS error, falling back to browser:', error)
      setAudioLoading(false)
      // Fallback to browser's speech synthesis
      fallbackSpeakText(text)
    }
  }

  const fallbackSpeakText = (text) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
  }

  const stopSpeaking = () => {
    // Stop backend TTS audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    // Stop browser TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    setAudioLoading(false)
  }

  const startRecording = () => {
    if (recognitionRef.current) {
      try {
        setInterimTranscript('')
        recognitionRef.current.start()
        setIsRecording(true)
        toast.success('Listening... Speak your answer')
      } catch (error) {
        console.error('Failed to start recognition:', error)
        toast.error('Failed to start voice recognition')
      }
    } else {
      toast.error('Speech recognition not available')
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
      setInterimTranscript('')
    }
  }

  const handleEndInterview = async () => {
    try {
      await endInterview(session.session_id)
      navigate(`/report/${session.session_id}`)
    } catch (error) {
      console.error('Error ending interview:', error)
      navigate(`/report/${session.session_id}`)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitResponse()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">Setting up your interview...</p>
          <p className="text-gray-500 text-sm">Preparing personalized questions</p>
        </div>
      </div>
    )
  }

  // Fullscreen prompt before interview starts
  if (!isFullscreen && !fullscreenDismissed && session) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Enter Fullscreen Mode</h2>
          <p className="text-gray-600 mb-6">
            For the best interview experience and to enable proctoring, please enter fullscreen mode.
            This helps minimize distractions and ensures accurate monitoring.
          </p>
          <div className="space-y-3">
            <button
              onClick={enterFullscreen}
              className="w-full px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              Enter Fullscreen & Start
            </button>
            <button
              onClick={() => setFullscreenDismissed(true)}
              className="w-full px-6 py-2 text-gray-600 hover:text-gray-900 text-sm"
            >
              Continue without fullscreen
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Note: Exiting fullscreen during the interview will be logged.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mock Interview</h1>
          <p className="text-gray-500 text-sm">
            Question {currentQuestion?.question_number || 1} of {currentQuestion?.total_questions || 7}
            {isSpeaking && <span className="ml-2 text-primary-600">(Alex is speaking...)</span>}
            {audioLoading && <span className="ml-2 text-gray-400">(Loading audio...)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Audio Toggle - Interviewer Voice */}
          <button
            onClick={() => {
              setAudioEnabled(!audioEnabled)
              if (audioEnabled) stopSpeaking()
            }}
            className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${audioEnabled
              ? 'bg-primary-50 border-primary-200 text-primary-700'
              : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            title={audioEnabled ? 'Interviewer voice enabled' : 'Interviewer voice disabled'}
          >
            {audioEnabled ? (
              <>
                <Volume2 className="w-4 h-4 mr-1.5" />
                Audio On
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 mr-1.5" />
                Audio Off
              </>
            )}
          </button>
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setMode('text'); stopRecording(); }}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'text' ? 'bg-white shadow text-primary-600' : 'text-gray-600'
                }`}
            >
              <MessageSquare className="w-4 h-4 mr-1.5" />
              Text
            </button>
            <button
              onClick={() => setMode('voice')}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'voice' ? 'bg-white shadow text-primary-600' : 'text-gray-600'
                }`}
            >
              <Mic className="w-4 h-4 mr-1.5" />
              Voice
            </button>
          </div>
          {/* Fullscreen Toggle */}
          <button
            onClick={isFullscreen ? exitFullscreen : enterFullscreen}
            className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
              isFullscreen
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4 mr-1.5" />
                Exit FS
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4 mr-1.5" />
                Fullscreen
              </>
            )}
          </button>
          {!isComplete && (
            <button
              onClick={handleEndInterview}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
            >
              End
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${((currentQuestion?.question_number || 1) / (currentQuestion?.total_questions || 7)) * 100}%` }}
        />
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-xl border border-gray-200 h-[500px] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'answer' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'system' ? (
                <div className="max-w-[85%] p-3 bg-blue-50 rounded-lg text-blue-800 text-sm">
                  {message.content}
                </div>
              ) : message.type === 'question' ? (
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary-600">Q{message.questionNumber}</span>
                      <span className="text-xs text-gray-500">{message.topic}</span>
                      {isSpeaking && index === messages.length - 1 && (
                        <span className="text-xs text-primary-500 animate-pulse">Speaking...</span>
                      )}
                    </div>
                    <p className="text-gray-800 text-sm">{message.content}</p>
                    <button
                      onClick={() => isSpeaking ? stopSpeaking() : speakText(message.content)}
                      disabled={audioLoading}
                      className="mt-2 text-primary-600 hover:text-primary-700 text-xs flex items-center disabled:opacity-50"
                    >
                      {audioLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : isSpeaking ? (
                        <>
                          <VolumeX className="w-3 h-3 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 mr-1" />
                          Replay
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : message.type === 'answer' ? (
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="bg-primary-600 text-white rounded-lg p-3">
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              ) : message.type === 'feedback' ? (
                <div className="max-w-[85%] p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">{message.content}</p>
                  {message.scores && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(message.scores).slice(0, 4).map(([key, value]) => (
                        <span key={key} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          {key.replace(/_/g, ' ')}: {value}/10
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-100 p-4">
          {isComplete ? (
            <button
              onClick={handleEndInterview}
              className="w-full flex items-center justify-center px-4 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
            >
              View Report
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : mode === 'text' ? (
            <div className="flex gap-3">
              <textarea
                ref={textareaRef}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none h-20 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                disabled={submitting}
              />
              <button
                onClick={handleSubmitResponse}
                disabled={!response.trim() || submitting}
                className="self-end px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Voice transcription display */}
              {(response || interimTranscript) && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 min-h-[60px]">
                  {response}
                  <span className="text-gray-400">{interimTranscript}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-primary-500 hover:bg-primary-600'
                    }`}
                >
                  {isRecording ? (
                    <MicOff className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-white" />
                  )}
                </button>

                {response.trim() && (
                  <button
                    onClick={handleSubmitResponse}
                    disabled={submitting}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Submit
                        <Send className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>
                )}
              </div>

              <p className="text-center text-xs text-gray-500">
                {isRecording ? 'Listening... Click mic to stop' : 'Click mic to start speaking'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Proctoring HUD */}
      <div className="fixed bottom-4 right-4 w-52 bg-gray-900 rounded-lg overflow-hidden shadow-lg border border-gray-700 z-50">
        {/* Camera Feed */}
        <div className="relative aspect-video bg-gray-900">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
              No Camera
            </div>
          )}
          <div className="absolute top-1 left-1 bg-red-600 rounded-full w-2 h-2 animate-pulse" title="Recording"></div>
          {/* Proctoring Status Badge */}
          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] text-white">
            PROCTORED
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-2 py-1.5 bg-gray-800 text-[10px] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Camera</span>
            <span className={cameraActive ? 'text-green-400' : 'text-red-400'}>
              {cameraActive ? '● Active' : '○ Inactive'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Fullscreen</span>
            <span className={isFullscreen ? 'text-green-400' : 'text-yellow-400'}>
              {isFullscreen ? '● Active' : '○ Off'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Tab Focus</span>
            <span className="text-green-400">● Focused</span>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="px-2 py-1.5 bg-red-900/90 border-t border-red-800">
            <div className="flex items-center text-white text-[10px]">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {warnings.length} Warning{warnings.length > 1 ? 's' : ''} Recorded
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
