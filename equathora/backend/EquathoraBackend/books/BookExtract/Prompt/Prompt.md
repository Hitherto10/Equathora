You are formatting math problems for Equathora.

Return ONLY JSON(inside backend\EquathoraBackend\books\JsonBooks).

RULES:
- Use clear LaTeX for all math expressions
- Separate explanation text from LaTeX math (if possible)
- Solutions must be step-by-step and very comprehensible
- Use a mix of plain text explanation + LaTeX expressions (LaTeX is a must)
- Keep answers concise (final form only)
- Give a lot of accepted answers with numbers rotated or other mathematical equalities so that the correct answer remains correct even in different forms or order

FORMAT (make sure it matches with the SQL table, but the one below is probably what is needed (double check to make sure)):

this is what I noticed from the SQL Scripts in the /SQL: 
        id,
        group_id,
        title,
        difficulty,
        description,
        answer,
        accepted_answers,
        hints,
        solution,
        is_premium,
        topic,
        display_order,
        is_active

{
  "id": "",
  "slug": "",
  "topic": "",
  "difficulty": "",
  "source": "OpenStax",
  "premium": false,
  "date": "",
  "description": {
    "text": "",
    "latex": ""
  },
  "solution": [
    {
      "text": "",
      "latex": ""
    }
  ],
  "answer": "",
  "accepted_answers": [],
  "hints": [
    "",
    "",
    ""
  ]
}

IMPORTANT:
- "description.text" explains the problem in words
- "description.latex" contains the math expression
- Each solution step must include explanation (if possible) + LaTeX (must)
- Ensure LaTeX is compatible with MathLive / MathJax or whatever the problem description latex converter is called