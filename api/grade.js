import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // UPDATED: Destructure qTable, rTable, and topic from the request body
  const {
    answers = {}, 
    guestId, 
    appName, 
    testTitle,
    topic, // NEW: Catch the separate topic variable
    marksPerQuestion, 
    testDuration,
    qTable,
    rTable
  } = req.body;

  // Initialize Supabase clients using securely hidden SERVICE ROLE KEYS
  // These keys bypass RLS and should NEVER be in your React frontend
  const questionDb = createClient(
    process.env.VITE_QUESTION_SUPABASE_URL,
    process.env.SUPABASE_QUESTION_SERVICE_ROLE_KEY 
  );
  
  const resultDb = createClient(
    process.env.VITE_RESULT_SUPABASE_URL,
    process.env.SUPABASE_RESULT_SERVICE_ROLE_KEY
  );

  // NEW: Security check to ensure valid table names are provided
  const allowedTables = [
    'questions1', 'test_results', 
    'questions2', 'test_resuts', // Note: Make sure 'test_resuts' isn't a typo in your actual DB!
    'questions3', 'test_resuts',
    'questions4', 'test_resuts',
    'questions5', 'test_resuts',
    'ana214questions', 'test_results'
  ];

  if (!allowedTables.includes(qTable) || !allowedTables.includes(rTable)) {
    return res.status(400).json({ error: 'Invalid topic selected.' });
  }

  try {
    // 1. Fetch ALL questions from the database to get the real correct answers
    // UPDATED: Uses the dynamic qTable variable
    const { data: questions, error: fetchError } = await questionDb
      .from(qTable)
      .select('id, correct_answer');

    if (fetchError) throw fetchError;

    // 2. Calculate the score securely on the server
    let rawScore = 0;
    const totalQuestions = questions.length;
    
    // Create a map of correct answers for easy lookup
    const answerMap = {};
    questions.forEach(q => {
       // Normalize the correct answer format to match your frontend logic
       let correctKey = (q.correct_answer || '').trim().toLowerCase();
       if (['a','b','c','d'].includes(correctKey) || correctKey.includes('option')) {
          if(correctKey.includes('a')) correctKey = 'optionA';
          else if(correctKey.includes('b')) correctKey = 'optionB';
          else if(correctKey.includes('c')) correctKey = 'optionC';
          else if(correctKey.includes('d')) correctKey = 'optionD';
       } else { correctKey = 'optionA'; }
       answerMap[q.id] = correctKey;
    });

    // Compare user answers against the secure map
    Object.keys(answers).forEach(qId => {
      if (answers[qId] === answerMap[qId]) {
        rawScore += 1;
      }
    });

    const finalScore = rawScore * marksPerQuestion;
    const totalPossible = totalQuestions * marksPerQuestion;
    const percentage = totalPossible > 0 ? Math.round((finalScore / totalPossible) * 100) : 0;

    let dbStatus = 'FAIL';
    if (percentage >= 70) dbStatus = 'DISTINCTION';
    else if (percentage >= 40) dbStatus = 'PASS';

    // 3. Insert the result into the database securely
    // UPDATED: Uses the dynamic rTable variable
    const { error: insertError } = await resultDb
      .from(rTable)
      .insert([{
        guest_id: guestId,
        app_name: appName,
        test_title: testTitle, // Original test title saves here
        topic: topic,          // NEW: The specific topic saves here
        score: finalScore,
        total_possible: totalPossible,
        status: dbStatus
      }]);

    if (insertError) throw insertError;

    // 4. Send the calculated data back to the frontend to display the result UI
    res.status(200).json({
      score: finalScore,
      total: totalPossible,
      percentage: percentage,
      statusTier: dbStatus,
      correctAnswersMap: answerMap // Send answers back ONLY AFTER the test is submitted so the UI can show the review
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: 'Failed to grade test' });
  }
      }
