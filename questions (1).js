import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { idNumber, token, qTable, isLocked } = req.body;

  if (!qTable) {
    return res.status(400).json({ error: 'Missing target table reference.' });
  }

  // Define allowed tables list to guard against SQL injection manipulation
  const allowedTables = [
    'questions1', 'questions2', 'questions3', 'questions4', 
    'questions5', 'questions6', 'questions7', 'questions8', 
    'questions9', 'questions'
  ];

  if (!allowedTables.includes(qTable)) {
    return res.status(400).json({ error: 'Unauthorized table reference.' });
  }

  try {
    // Initialize Supabase client securely on the server
    const questionDb = createClient(
      process.env.VITE_QUESTION_SUPABASE_URL,
      process.env.SUPABASE_QUESTION_SERVICE_ROLE_KEY 
    );

    // 1. If the topic is locked, enforce token validation first
    if (isLocked) {
      if (!idNumber || !token) {
        return res.status(401).json({ error: 'Please input both your ID NUMBER and TOKEN.' });
      }

      const { data: authData, error: authError } = await questionDb
        .from('student_token')
        .select('*')
        .eq('id_number', idNumber.trim())
        .eq('token', token.trim());

      if (authError) throw authError;

      if (!authData || authData.length === 0) {
        return res.status(401).json({ error: 'Incorrect ID number or Token, try again.' });
      }
    }

    // 2. Fetch the questions now that validation has passed (or if the topic is free)
    const { data: questionData, error: fetchError } = await questionDb
      .from(qTable)
      .select('id, question, option_a, option_b, option_c, option_d');

    if (fetchError) throw fetchError;

    // 3. Format structural properties perfectly before dispatching to frontend
    const clean = (str) => str?.toString().trim() || '';
    const formattedQuestions = (questionData || []).map((item, idx) => ({
      id: item.id || `q-${idx}`,
      text: clean(item.question),
      optionA: clean(item.option_a),
      optionB: clean(item.option_b),
      optionC: clean(item.option_c),
      optionD: clean(item.option_d)
    }));

    // Return the verified payload data back to the frontend browser context
    return res.status(200).json({ questions: formattedQuestions });

  } catch (error) {
    console.error("Backend error serving questions:", error);
    return res.status(500).json({ error: 'Internal server validation error.' });
  }
}