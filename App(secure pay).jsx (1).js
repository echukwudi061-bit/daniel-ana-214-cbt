import React, { useState, useEffect, useRef } from 'react';
import { resultsupabase } from './resultsupabaseClient'; // For Results (Old DB)
import { questionSupabase } from './questionSupabaseClient'; // For Questions (New DB)
import { 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  FileText,
  Menu,
  X as XIcon, 
  LayoutGrid,
  Home,
  Tag,
  Check,
  X, 
  Minus,
  ClipboardList,
  Trophy,
  Loader2,
  User,
  Key,
  Lock // Imported Lock icon
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// --- HELPER: FISHER-YATES SHUFFLE ---
const shuffleArray = (array) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

// --- COMPONENT: GUEST ID BADGE ---
const GuestIdBadge = ({ id, className = "" }) => (
  <div className={`bg-blue-50 text-blue-800 border border-blue-100 rounded-full px-2 py-1 text-[10px] md:text-xs font-bold tracking-wide whitespace-nowrap ${className}`}>
    {id}
  </div>
);

export default function App() {
  // --- 1. CONFIGURATION STATE ---
  const [appName] = useState(() => localStorage.getItem('cbt_appName') || "DANIEL'S ANATOMY CBT APP");
  const [testTitle] = useState(() => localStorage.getItem('cbt_testTitle') || "ANA 213: GENERAL EMBRYO AND GEBETICS");
  const [testDuration, setTestDuration] = useState(() => {
    const saved = localStorage.getItem('cbt_duration');
    return saved ? parseInt(saved, 10) : 20;
  });
  const [marksPerQuestion, setMarksPerQuestion] = useState(() => {
    const saved = localStorage.getItem('cbt_marks');
    return saved ? parseInt(saved, 10) : 2;
  });
  const LOGO_URL = "https://raw.githubusercontent.com/danielsdigitalservices1-arch/Image-library-/e3e6abfd70dbb651b780cd8a841d5dea4beca979/logo.png";
  const [logoError, setLogoError] = useState(false);

  const [isTopicMenuOpen, setIsTopicMenuOpen] = useState(false);
  
  // Updated TOPICS with status control property
  const TOPICS = [
    { 
      id: 'topic1', 
      name: 'Chapter 1: Parasitism and other animals', 
      qTable: 'questions1', 
      rTable: 'test_results',
      duration: 10, 
      marks: 1,
      status: 'free'      
    },
    { 
      id: 'topic2', 
      name: 'chapter 2: Protozoan infectios and diseases', 
      qTable: 'questions2',
      rTable: 'test_results',
      duration: 10, 
      marks: 1,
      status: 'free'
    },
    { 
      id: 'topic3', 
      name: 'Chapter 3: Platyhelminthic Infections', 
      qTable: 'questions3',
      rTable: 'test_results',
      duration: 10, 
      marks: 1,
      status: 'free'
    },
    { 
      id: 'topic4', 
      name: 'Chapter 4: Parasitic Nematode Infections', 
      qTable: 'questions4',
      rTable: 'test_results',
      duration: 10, 
      marks: 1,
      status: 'locked'
    },
    { 
      id: 'topic5', 
      name: 'Chapter 5: Parasitic Arthropods other than insects', 
      qTable: 'questions5',
      rTable: 'test_results',
      duration: 10, 
      marks: 1,
      status: 'locked'
    },
    { 
      id: 'topic6', 
      name: 'Chapter 6: Insects of medical importance ', 
      qTable: 'questions6',
      rTable: 'test_results',
      duration: 10, 
      marks: 1,
      status: 'locked'
    },
    { 
      id: 'topic7', 
      name: 'Chapter 7: Viral infections and diseass', 
      qTable: 'questions7',
      rTable: 'test_results',
      duration: 10, 
      marks: 1,
      status: 'locked'
    },
    { 
      id: 'topic8', 
      name: 'Chapter 8: Rickettsial, spirichaetal and bacterial diseases', 
      qTable: 'questions8',
      rTable: 'test_results',
      duration: 10, 
      marks: 1,
      status: 'locked'
    },
    { 
      id: 'topic9', 
      name: 'Chapter 9: Basic immunology', 
      qTable: 'questions9',
      rTable: 'test_results',
      duration: 10, 
      marks: 1,
      status: 'locked'
    },
    { 
      id: 'topic10', 
      name: 'Chapter 10: Basic practical parasitology', 
      qTable: 'questions5',
      rTable: 'test_results',
      duration: 10, 
      marks: 1,
      status: 'locked'
    },
    { 
      id: 'all_topics', 
      name: 'Comprehensive Test', 
      qTable: 'questions',
      rTable: 'test_results',
      duration: 20, 
      marks: 2,
      status: 'locked'
    }
  ];

  const [selectedTopic, setSelectedTopic] = useState(() => {
    const saved = localStorage.getItem('cbt_selectedTopic');
    return saved ? JSON.parse(saved) : null;
  });

  // --- 2. QUESTIONS STATE ---
  const [questions, setQuestions] = useState([]);
  const [isProcessingStart, setIsProcessingStart] = useState(false);

  // --- NEW AUTHENTICATION STATE ---
  const [idNumber, setIdNumber] = useState(() => localStorage.getItem('cbt_idNumber') || '');
  const [token, setToken] = useState(() => localStorage.getItem('cbt_token') || '');
  const [authError, setAuthError] = useState('');

  // --- 3. VIEW STATE ---
  const [view, setView] = useState(() => {
    const savedEndTime = localStorage.getItem('cbt_endTime');
    if (savedEndTime && parseInt(savedEndTime, 10) > Date.now()) {
      // Restore dynamic evaluation session state safely
      const savedQuestions = localStorage.getItem('cbt_active_questions');
      if (savedQuestions) {
        try {
          setTimeout(() => setQuestions(JSON.parse(savedQuestions)), 50);
          return 'test';
        } catch (e) {
          console.error(e);
        }
      }
    }
    const savedResult = sessionStorage.getItem('cbt_currentResult');
    if (savedResult) {
      return 'result';
    }
    return 'welcome';
  });

  // --- 4. TEST TAKING STATE ---
  const [guestId] = useState(() => {
    const saved = localStorage.getItem('cbt_guestId');
    if (saved) return saved;
    const newId = `GUEST ID: ${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem('cbt_guestId', newId);
    return newId;
  });

  const [currentQIndex, setCurrentQIndex] = useState(() => {
    const saved = localStorage.getItem('cbt_currentIndex');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem('cbt_answers');
    return saved ? JSON.parse(saved) : {};
  });

  const [timeLeft, setTimeLeft] = useState(() => {
    const savedEndTime = localStorage.getItem('cbt_endTime');
    if (savedEndTime) {
      const diff = Math.ceil((parseInt(savedEndTime, 10) - Date.now()) / 1000);
      return diff > 0 ? diff : 0;
    }
    return 0;
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questionsRef = useRef(questions);
  const answersRef = useRef(answers);

  useEffect(() => {
    questionsRef.current = questions;
    answersRef.current = answers;
  }, [questions, answers]);

  // --- EFFECT: PERSIST CURRENT QUESTION INDEX ---
  useEffect(() => {
    if (view === 'test') {
      localStorage.setItem('cbt_currentIndex', currentQIndex.toString());
    }
  }, [currentQIndex, view]);

  // --- LOGIC: TIMER ---
  useEffect(() => {
    let interval;
    if (view === 'test') {
      const savedEndTime = localStorage.getItem('cbt_endTime');
      const updateTimer = () => {
        if (!savedEndTime) return;
        const end = parseInt(savedEndTime, 10);
        const now = Date.now();
        const diff = Math.ceil((end - now) / 1000);
        if (diff <= 0) {
          setTimeLeft(0);
          if (!isSubmitting) handleSubmit(); 
        } else {
          setTimeLeft(diff);
        }
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [view, isSubmitting]);

  // Setup function to start the test session
  const startTestSession = (fetchedQuestions) => {
    const randomized = shuffleArray([...fetchedQuestions]);
    setQuestions(randomized);

    localStorage.setItem('cbt_active_questions', JSON.stringify(randomized));

    const endTime = Date.now() + (testDuration * 60 * 1000);
    localStorage.setItem('cbt_endTime', endTime.toString());
    localStorage.setItem('cbt_answers', JSON.stringify({}));
    localStorage.setItem('cbt_currentIndex', '0');
    
    sessionStorage.removeItem('cbt_currentResult');
    
    setAnswers({});
    setCurrentQIndex(0);
    setView('test');
    setIsMobileMenuOpen(false);
  };

  // --- HANDLERS ---
  const handleStartProcess = async () => {
    setAuthError('');
    if (!selectedTopic) {
      alert("Please select a topic before starting.");
      return;
    }

    const isLocked = selectedTopic.status === 'locked';

    if (isLocked && (!idNumber.trim() || !token.trim())) {
      setAuthError('Please input both your ID NUMBER and TOKEN.');
      return;
    }

    setIsProcessingStart(true);

    try {
      // Fire requests to our brand new secure Vercel backend route endpoint instead of raw Supabase operations
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idNumber: idNumber.trim(),
          token: token.trim(),
          qTable: selectedTopic.qTable,
          isLocked: isLocked
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setAuthError(result.error || 'Verification failed.');
        return;
      }

      if (result.questions && result.questions.length > 0) {
        startTestSession(result.questions);
      } else {
        setAuthError('No questions found for this topic.');
      }
    } catch (err) {
      console.error("Token verification check failed:", err);
      setAuthError('Connection failed. Check your internet connectivity.');
    } finally {
      setIsProcessingStart(false);
    }
  };

  const handleAnswerSelect = (qId, option) => {
    const newAnswers = { ...answers, [qId]: option };
    setAnswers(newAnswers);
    localStorage.setItem('cbt_answers', JSON.stringify(newAnswers));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const latestAnswers = answersRef.current;
    const latestQuestions = questionsRef.current;
    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: latestAnswers,
          guestId,
          appName,
          testTitle: testTitle, 
          topic: selectedTopic ? selectedTopic.name : 'General',
          marksPerQuestion,
          testDuration,
          qTable: selectedTopic.qTable,
          rTable: selectedTopic.rTable
        })
      });
      if (!response.ok) throw new Error("Grading failed on server");
      
      const serverResult = await response.json();
      const questionsWithAnswers = latestQuestions.map(q => ({
        ...q,
        correctAnswer: serverResult.correctAnswersMap[q.id]
      }));
      const attemptedCount = Object.keys(latestAnswers).length;
      const savedEndTime = localStorage.getItem('cbt_endTime');
      const endTimeInt = savedEndTime ? parseInt(savedEndTime, 10) : Date.now();
      const durationMs = testDuration * 60 * 1000;
      const startTime = endTimeInt - durationMs; 
      let timeTakenMs = Date.now() - startTime;
      if (timeTakenMs > durationMs) timeTakenMs = durationMs;
      const resultData = {
        score: serverResult.score,
        total: serverResult.total,
        percentage: serverResult.percentage,
        statusTier: serverResult.statusTier, 
        questions: questionsWithAnswers,
        answers: latestAnswers, 
        completedAt: Date.now(),
        topicName: selectedTopic ? selectedTopic.name : testTitle,
        analytics: { timeTakenMs, attemptedCount }
      };
      sessionStorage.setItem('cbt_currentResult', JSON.stringify(resultData));
      localStorage.removeItem('cbt_endTime');
      localStorage.removeItem('cbt_answers');
      localStorage.removeItem('cbt_currentIndex');
      localStorage.removeItem('cbt_active_questions'); 
      setView('result');
    } catch (err) {
      console.error("Submission error:", err);
      alert("Failed to submit test. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitToWelcome = () => {
    localStorage.removeItem('cbt_endTime');
    localStorage.removeItem('cbt_answers');
    localStorage.removeItem('cbt_currentIndex');
    localStorage.removeItem('cbt_active_questions'); 
    setAuthError('');
    sessionStorage.removeItem('cbt_currentResult');
    setView('welcome');
  };

  const handleDirectExit = () => {
    handleExitToWelcome();
  };

  const formatTime = (seconds) => {
    if (seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // ---------------- RENDER: WELCOME ----------------
  if (view === 'welcome') {
    const isLocked = selectedTopic && selectedTopic.status === 'locked';

    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900 overflow-hidden">
        <div className="bg-white p-5 md:p-8 rounded-2xl shadow-xl max-w-xl w-full text-center border border-blue-100 relative flex flex-col justify-center shrink-0 max-h-full overflow-y-auto">
          
          <div className="absolute top-4 right-4">
            <GuestIdBadge id={guestId} />
          </div>

          <div className="mb-3 flex flex-col items-center justify-center gap-2">
             {!logoError ? (
               <img 
                 src={LOGO_URL}
                 alt="App Logo"
                 onError={() => setLogoError(true)}
                 className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border border-gray-100 shadow-sm"
               />
             ) : (
               <div className="bg-blue-100 p-3 rounded-full">
                  <FileText className="w-8 h-8 text-blue-600" />
               </div>
             )}
          </div>
          
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-0.5 uppercase tracking-tight">
            {appName}
          </h1>
          <p className="text-xs md:text-sm text-blue-700 font-medium mb-3">
            {testTitle}
          </p>
          
          {/* Custom Scrollable Dropdown Selector */}
          <div className="mb-3 relative text-left">
            <button
              type="button"
              onClick={() => setIsTopicMenuOpen(!isTopicMenuOpen)}
              className="w-full p-2.5 border-2 border-blue-200 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wide bg-blue-50 focus:outline-none focus:border-blue-500 flex justify-between items-center"
            >
              <span className="truncate flex-1">
                {selectedTopic ? selectedTopic.name : "-- Select a Topic --"}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                {selectedTopic && selectedTopic.status === 'locked' && <Lock className="w-3.5 h-3.5 text-red-500" />}
                <span className="text-gray-500 text-xs">▼</span>
              </div>
            </button>

            {isTopicMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsTopicMenuOpen(false)} 
                />
                
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border-2 border-blue-100 rounded-xl shadow-xl z-20 p-1 space-y-0.5 overscroll-contain">
                  {TOPICS.map((topic) => {
                    const isSelected = selectedTopic?.id === topic.id;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          setSelectedTopic(topic);
                          localStorage.setItem('cbt_selectedTopic', JSON.stringify(topic));
                          setTestDuration(topic.duration);
                          setMarksPerQuestion(topic.marks);
                          localStorage.setItem('cbt_duration', topic.duration.toString());
                          localStorage.setItem('cbt_marks', topic.marks.toString());
                          setIsTopicMenuOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition flex justify-between items-center ${
                          isSelected
                            ? 'bg-blue-600 text-white font-extrabold'
                            : 'text-gray-700 hover:bg-blue-50'
                        }`}
                      >
                        <span className="truncate mr-2 flex-1">{topic.name}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {topic.status === 'locked' && (
                            <Lock className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-red-500'}`} />
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Test Description */}
          <div className="text-left bg-gray-50 p-3 rounded-lg text-xs text-gray-700 mb-4 space-y-1">
            <p className="flex items-center"><Clock className="w-3.5 h-3.5 mr-2"/> <strong>Time Limit:</strong> {testDuration} Minutes</p>
            <p className="flex items-center"><Tag className="w-3.5 h-3.5 mr-2"/> <strong>Scoring:</strong> {marksPerQuestion} Marks / Question</p>
          </div>

          {/* Secure Credential Input Forms: ONLY render if topic status === 'locked' */}
          {isLocked && (
            <div className="space-y-2.5 mb-4 text-left transition-all">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">ID Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    type="text"
                    placeholder="Enter ID Number"
                    value={idNumber}
                    onChange={(e) => {
                      setIdNumber(e.target.value);
                      localStorage.setItem('cbt_idNumber', e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-xl font-medium text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Token Passkey</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Key className="w-4 h-4" />
                  </span>
                  <input 
                    type="password"
                    placeholder="Enter Token Key"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      localStorage.setItem('cbt_token', e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-xl font-medium text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <p className="mt-1.5 text-center text-xs font-bold text-blue-600 bg-blue-50/70 border border-blue-100 py-1.5 rounded-lg">
                  DM <a href="https://wa.me/8148800047/" target="_blank" rel="noreferrer" className="underline hover:text-blue-800">https://wa.me/8148800047/</a> for your ID NUMBER and TOKEN
                </p>
              </div>
            </div>
          )}

          <button 
            onClick={handleStartProcess}
            disabled={
              isProcessingStart || 
              (isLocked && (!idNumber.trim() || !token.trim()))
            }
            className={`
              w-full text-white font-bold py-3 rounded-xl shadow-md transition transform flex items-center justify-center flex-shrink-0
              ${(isProcessingStart || (isLocked && (!idNumber.trim() || !token.trim()))) 
                 ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                 : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}
            `}
          >
             {isProcessingStart ? (
               <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying & Loading...</>
             ) : (
               <><Play className="w-5 h-5 mr-2" /> Start Test</>
             )}
          </button>

          {/* Verification Warning Alert Box */}
          {authError && isLocked && (
            <p className="mt-3 text-sm font-bold text-red-600 bg-red-50 border border-red-200 py-2 rounded-xl text-center animate-pulse">
              {authError}
            </p>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col items-center gap-1">
            <p className="text-[9px] md:text-[10px] font-bold tracking-widest text-gray-400 uppercase text-center">
              THE APP IS PROVIDED BY ©️ {new Date().getFullYear()} DANNYBEST DIGITAL SERVICES. ALL RIGHTS RESERVED.
            </p>
            <p className="text-[9px] md:text-[10px] font-medium text-center">
               <span className="uppercase font-extrabold text-gray-400 mr-1">TECHNICAL SUPPORT:</span>
               <a href="mailto:dannybestdigitalservices@gmail.com" className="text-blue-600 hover:underline transition-all lowercase">
                 dannybestdigitalservices@gmail.com
               </a>
            </p>
          </div>

        </div>
      </div>
    );
  }

  // ---------------- RENDER: TEST ----------------
  if (view === 'test') {
    if (!questions || questions.length === 0) {
      return (
         <div className="flex h-screen items-center justify-center flex-col">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4"/>
            <p className="text-gray-500 font-bold">Loading Questions...</p>
         </div>
      );
    }
    
    const question = questions[currentQIndex];
    if(!question) return null;

    const answeredCount = Object.keys(answers).length;
    const totalCount = questions.length;

    return (
      <div className="h-[100dvh] bg-gray-50 flex flex-col font-sans">
        <header className="flex-shrink-0 z-50 bg-white/90 backdrop-blur-md shadow-sm px-3 md:px-6 py-3 flex justify-between items-center w-full relative transition-all">
          <div className="flex flex-1 items-center gap-2 overflow-hidden mr-2 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1 hover:bg-gray-100 rounded-lg flex-shrink-0"
            >
              <Menu className="w-6 h-6 text-gray-600"/>
            </button>

            {!logoError && (
               <img 
                src={LOGO_URL}
                alt="App Logo"
                onError={() => setLogoError(true)}
                className="hidden md:block w-10 h-10 md:w-16 md:h-16 rounded-full object-cover border border-gray-100 shadow-sm flex-shrink-0 mr-1"
               />
            )}

            <div className="flex flex-col overflow-hidden min-w-0 items-start flex-1 w-full">
              <span className="text-xs md:text-lg font-bold text-gray-900 uppercase truncate w-full block">{appName}</span>
               <h1 className="font-bold text-blue-600 text-xs md:text-lg uppercase truncate w-full block leading-tight mb-1">{selectedTopic ? selectedTopic.name : testTitle}</h1>
               <GuestIdBadge id={guestId} />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <div className={`font-mono font-bold text-sm md:text-xl ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-blue-600'} flex items-center`}>
              <Clock className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
              {formatTime(timeLeft)}
            </div>
            
            <button 
              disabled={isSubmitting} 
              onClick={() => { if(window.confirm("Are you sure you want to submit?")) handleSubmit(); }}
              className={`
                bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold shadow-md transition text-xs md:text-base whitespace-nowrap flex items-center
                ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}
              `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> 
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Submit
                </>
              )}
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
             {isMobileMenuOpen && (
              <div 
                className="absolute inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            <aside className={`
                fixed top-0 left-0 z-50 w-64 flex flex-col overflow-hidden
                bg-white border-r border-gray-200 shadow-xl
                transform transition-transform duration-300 ease-in-out h-[100dvh]
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                md:relative md:translate-x-0 md:shadow-none md:z-10 md:w-72 md:h-full
            `}>
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0 z-20">
                    <h2 className="font-bold text-gray-700 flex items-center text-sm md:text-base">
                        <LayoutGrid className="w-4 h-4 md:w-5 md:h-5 mr-2 text-blue-600"/> Navigator
                     </h2>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1 text-gray-500">
                      <XIcon className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="flex-1 md:flex-initial overflow-y-auto overscroll-y-contain p-4 min-h-0 bg-white">
                   <div className={`
                      grid gap-2 
                      ${questions.length < 25 ? 'grid-cols-3' : (questions.length < 50 ? 'grid-cols-4' : 'grid-cols-5')} 
                      md:grid-cols-5
                   `}>
                        {questions.map((q, idx) => {
                            const isAnswered = !!answers[q.id];
                            const isCurrent = idx === currentQIndex;
                            return (
                              <button
                                    key={q.id}
                                    onClick={() => { setCurrentQIndex(idx); setIsMobileMenuOpen(false); }}
                                    className={`
                                        w-full aspect-square md:w-10 md:h-10 md:aspect-auto rounded-lg text-xs md:text-sm font-bold transition flex items-center justify-center border
                                        ${isCurrent ? 'ring-2 ring-blue-600 ring-offset-1 border-blue-600 z-10' : ''}
                                        ${isAnswered ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}
                                    `}
                                >
                                    {idx + 1}
                              </button>
                            );
                        })}
                   </div>
                </div>

                <div className="p-4 pb-8 md:pb-4 border-t border-gray-200 bg-gray-50 text-xs font-medium space-y-2 flex-shrink-0 z-20 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-center">
                        <span className="flex items-center text-gray-600"><div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full mr-2"/> Answered</span>
                        <span className="font-bold">{answeredCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center text-gray-600"><div className="w-2 h-2 md:w-3 md:h-3 bg-gray-300 rounded-full mr-2"/> Unanswered</span>
                        <span className="font-bold">{totalCount - answeredCount}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="flex items-center text-gray-600">
                           <div className="w-2 h-2 md:w-3 md:h-3 rounded-full border-2 border-blue-600 mr-2" /> Current
                        </span>
                        <span className="font-bold">#{currentQIndex + 1}</span>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto bg-gray-50 p-3 md:p-8 w-full pb-32">
               <div className="max-w-5xl mx-auto w-full">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-10 min-h-[50vh]">
                     <div className="mb-4 md:mb-6 flex justify-between items-center">
                        <span className="bg-blue-100 text-blue-800 border border-blue-200 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
                           Question {currentQIndex + 1} of {questions.length}
                        </span>
                        <span className="bg-blue-100 text-blue-800 border border-blue-200 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
                          {answeredCount}/{totalCount} Done
                        </span>
                     </div>

                     <h2 className="text-lg md:text-2xl font-medium text-gray-800 mb-6 md:mb-8 leading-relaxed break-words whitespace-pre-wrap">
                        <Latex>{question.text}</Latex>
                     </h2>

                     <div className="space-y-3">
                        {['optionA', 'optionB', 'optionC', 'optionD'].map((optKey) => (
                           <button 
                              key={optKey} 
                              onClick={() => handleAnswerSelect(question.id, optKey)}
                              className={`
                                 w-full text-left p-3 md:p-4 rounded-xl border-2 transition-all duration-200 flex items-start md:items-center group
                                 ${answers[question.id] === optKey ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50' }
                              `}
                           >
                              <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 mr-3 md:mr-4 flex items-center justify-center flex-shrink-0 mt-0.5 md:mt-0 ${answers[question.id] === optKey ? 'border-blue-500' : 'border-gray-300'}`}>
                                 {answers[question.id] === optKey && <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-blue-500" />}
                              </div>
                              <span className="text-sm md:text-base text-gray-700 font-medium break-words">
                                 <span className="font-bold mr-2 uppercase text-xs md:text-sm">{optKey.replace('option', '')}.</span>
                                 <Latex>{question[optKey]}</Latex>
                              </span>
                           </button>
                        ))}
                     </div>

                     <div className="flex justify-between mt-8 md:mt-10 pt-6 border-t border-gray-100">
                        <button 
                           disabled={currentQIndex === 0}
                           onClick={() => setCurrentQIndex(prev => prev - 1)}
                           className="flex items-center text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-500 font-medium text-sm md:text-base"
                        >
                           <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 mr-1" /> Previous
                        </button>
                        <button 
                           disabled={currentQIndex === questions.length - 1}
                           onClick={() => setCurrentQIndex(prev => prev + 1)}
                           className="flex items-center text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:hover:text-blue-600 font-medium text-sm md:text-base"
                        >
                           Next <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-1" />
                        </button>
                     </div>
                  </div>
               </div>
            </main>
         </div>
      </div>
    );
  }

  // ---------------- RENDER: RESULT ----------------
  if (view === 'result') {
    const resultDataStr = sessionStorage.getItem('cbt_currentResult');
    if (!resultDataStr) {
      setView('welcome');
      return null;
    }
    const resultData = JSON.parse(resultDataStr);
    const pct = resultData.percentage;
    const statusTier = resultData.statusTier;

    let statusColor, statusBg, statusBorder, StatusIcon, statusMsg, scoreColor;
    if (statusTier === 'FAIL') {
      statusColor = 'text-red-600';
      statusBg = 'bg-red-50';
      statusBorder = 'border-red-200';
      StatusIcon = XCircle;
      statusMsg = "Don't give up! Review your mistakes and try again.";
      scoreColor = 'text-red-600';
    } else if (statusTier === 'PASS') {
      statusColor = 'text-green-600';
      statusBg = 'bg-green-50';
      statusBorder = 'border-green-200';
      StatusIcon = CheckCircle;
      statusMsg = "Good job! You have a solid understanding of this topic.";
      scoreColor = 'text-green-600';
    } else {
      statusColor = 'text-yellow-500';
      statusBg = 'bg-yellow-50';
      statusBorder = 'border-yellow-200';
      StatusIcon = Trophy;
      statusMsg = "Outstanding! You have mastered this Course.";
      scoreColor = 'text-yellow-500';
    }

    const totalQuestions = resultData.questions.length;
    const correctCount = resultData.questions.filter(q => resultData.answers[q.id] === q.correctAnswer).length;
    const analytics = resultData.analytics || {};
    const attemptedCount = analytics.attemptedCount ?? Object.keys(resultData.answers).length;
    const wrongCount = attemptedCount - correctCount;
    const skippedCount = totalQuestions - attemptedCount;
    const timeTakenMs = analytics.timeTakenMs || 0;
    
    const completedAt = resultData.completedAt || Date.now();
    const dateObj = new Date(completedAt);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const dateStr = `${day}-${month}-${year}`;
    const timeStr = dateObj.toLocaleTimeString([], { hour12: false });
    const timestampStr = `TEST COMPLETED ON: ${dateStr} • ${timeStr}`;

    return (
      <div className="fixed inset-0 bg-gray-50 flex flex-col font-sans text-gray-900 overflow-hidden">
        
        <div className="flex-shrink-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 px-4 py-3 flex items-center justify-between">
           
           <div className="w-12 md:w-16 flex-shrink-0 flex justify-start">
             <button 
               onClick={handleDirectExit}
               className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
             >
               <Home strokeWidth={1.5} className="text-gray-700 w-5 h-5 md:w-8 md:h-8" />
             </button>
           </div>

           <div className="flex-1 min-w-0 max-w-2xl mx-auto px-1 flex items-center justify-center">
               {!logoError && (
                  <img 
                     src={LOGO_URL} 
                     alt="App Logo"
                     onError={() => setLogoError(true)}
                     className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border border-gray-100 shadow-sm mr-3 flex-shrink-0"
                   />
               )}
               
               <div className="text-center truncate">
                   <h3 className="text-xs md:text-sm font-bold text-gray-900 uppercase tracking-tight leading-tight truncate w-full block">
                     {appName}
                   </h3>
                   <div className="text-xs md:text-sm font-bold text-blue-600 uppercase tracking-tight leading-tight truncate w-full block">
                     {resultData.topicName || testTitle}
                   </div>
               </div>
           </div>

           <div className="w-24 md:w-32 flex-shrink-0 flex justify-end">
              <GuestIdBadge id={guestId} />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto w-full">
            <div className="max-w-5xl mx-auto p-4 space-y-6 pb-24"> 
              
              <div className="bg-white p-8 rounded-2xl shadow-xl text-center relative overflow-hidden">
                <div className="mb-4 flex justify-center">
                    <StatusIcon className={`w-16 h-16 ${statusColor}`} />
                </div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">FINAL SCORE</h2>
                <div className={`text-5xl font-black mb-6 ${scoreColor}`}>
                    {resultData.score} <span className={`text-2xl font-bold ${scoreColor}`}>/ {resultData.total}</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 mb-8">
                    <div className={`${statusBg} ${statusBorder} border px-6 py-2 rounded-full`}>
                        <span className={`text-lg font-bold tracking-widest ${statusColor}`}>
                            {statusTier}
                        </span>
                    </div>
                    <p className={`text-sm font-medium ${statusColor} max-w-xs mx-auto leading-tight`}>
                      {statusMsg}
                    </p>
                </div>
                <div className="border-t border-gray-100 pt-4 mt-4">
                     <p className="text-[9px] font-bold tracking-widest text-gray-500 uppercase text-center">
                         {timestampStr}
                     </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider ml-1">Test Analytics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex flex-col items-center justify-center shadow-sm">
                        <Check className="w-5 h-5 text-green-600 mb-1" />
                        <span className="text-[10px] uppercase font-bold text-gray-400 text-center leading-tight">Correct</span>
                        <span className="text-lg font-bold text-gray-900 mt-1">{correctCount}</span>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex flex-col items-center justify-center shadow-sm">
                        <X className="w-5 h-5 text-red-600 mb-1" />
                        <span className="text-[10px] uppercase font-bold text-gray-400 text-center leading-tight">Wrong</span>
                        <span className="text-lg font-bold text-gray-900 mt-1">{wrongCount}</span>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex flex-col items-center justify-center shadow-sm">
                        <Minus className="w-5 h-5 text-orange-500 mb-1" />
                        <span className="text-[10px] uppercase font-bold text-gray-400 text-center leading-tight">Skipped</span>
                        <span className="text-lg font-bold text-gray-900 mt-1">{skippedCount}</span>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex flex-col items-center justify-center shadow-sm">
                        <Play className="w-5 h-5 text-blue-600 mb-1" />
                        <span className="text-[10px] uppercase font-bold text-gray-400 text-center leading-tight">Attempted</span>
                        <span className="text-lg font-bold text-gray-900 mt-1">{attemptedCount}</span>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-xl border border-gray-200 flex flex-col items-center justify-center shadow-sm">
                        <ClipboardList className="w-5 h-5 text-gray-600 mb-1" />
                        <span className="text-[10px] uppercase font-bold text-gray-400 text-center leading-tight">Total Questions</span>
                        <span className="text-lg font-bold text-gray-900 mt-1">{totalQuestions}</span>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex flex-col items-center justify-center shadow-sm">
                        <Clock className="w-5 h-5 text-purple-600 mb-1" />
                        <span className="text-[10px] uppercase font-bold text-gray-400 text-center leading-tight">Time Taken</span>
                        <span className="text-lg font-bold text-gray-900 mt-1">{formatDuration(timeTakenMs)}</span>
                    </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                 <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-900">
                    Detailed Test Review
                 </div>
                 <div className="divide-y divide-gray-100">
                    {resultData.questions.map((q, idx) => {
                        const userAns = resultData.answers[q.id];
                        const isCorrect = userAns === q.correctAnswer;
                        const skipped = !userAns;
                        return (
                            <div key={q.id} className="p-4 md:p-6">
                                <div className="flex gap-3">
                                    <span className="font-bold text-gray-900 text-sm md:text-base">{idx + 1}.</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 mb-3 text-sm md:text-base break-words"><Latex>{q.text}</Latex></p>
                                        <div className="flex flex-col gap-2 text-xs md:text-sm">
                                            <div className={`flex items-start p-2 rounded ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                                <span className="font-bold w-20 md:w-24 flex-shrink-0 uppercase text-[10px] md:text-xs mt-0.5">Your Answer:</span>
                                                <span className="break-words">
                                                   {skipped ? <span className="italic text-gray-500">Skipped</span> : <span><span className="font-bold uppercase mr-1">{userAns.replace('option','')}</span><Latex>{q[userAns]}</Latex></span>}
                                                   {isCorrect && <CheckCircle className="inline w-3 h-3 md:w-4 md:h-4 ml-2"/>}
                                                   {!isCorrect && !skipped && <XCircle className="inline w-3 h-3 md:w-4 md:h-4 ml-2"/>}
                                                </span>
                                            </div>

                                            {!isCorrect && (
                                                <div className="flex items-start p-2 rounded bg-green-50 text-green-800">
                                                    <span className="font-bold w-20 md:w-24 flex-shrink-0 uppercase text-[10px] md:text-xs mt-0.5">Correct Answer:</span>
                                                    <span className="break-words">
                                                       <span className="font-bold uppercase mr-1">{q.correctAnswer.replace('option','')}</span><Latex>{q[q.correctAnswer]}</Latex>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                 </div>
              </div>
              
              <div className="mt-12 pb-10">
                 <button 
                    onClick={handleDirectExit}
                    className="bg-gray-900 hover:bg-black text-white px-6 py-4 rounded-xl font-bold transition flex items-center justify-center w-full shadow-lg"
                 >
                    <RotateCcw className="w-5 h-5 mr-2" /> Back to Home
                 </button>
  
                 <div className="mt-12 pt-6 border-t border-gray-200 text-center">
                     <p className="text-[9px] md:text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">
                        THE APP IS PROVIDED BY ©️ {new Date().getFullYear()} DANNYBEST DIGITAL SERVICES. ALL RIGHTS RESERVED.
                     </p>
                     <p className="text-[10px] md:text-xs text-gray-500 font-medium">
                        Need help or noticed an issue? Email us at <a href="mailto:dannybestdigitalservices@gmail.com" className="text-blue-600 font-bold hover:underline">dannybestdigitalservices@gmail.com</a>.
                     </p>
                 </div>
              </div>
            </div> 
        </div> 
      </div> 
    );
  }
  
  return null;
}