use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Status of a planning session
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PlanStatus {
    /// Claude is processing/exploring
    Processing,
    /// Waiting for user to answer a question
    WaitingForAnswer,
    /// Planning complete, showing summary
    Summary,
    /// Task created from plan
    Completed,
    /// User cancelled
    Cancelled,
    /// Error occurred
    Error,
}

/// A single option in a question
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionOption {
    pub label: String,
    pub description: String,
}

/// A question from Claude during planning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanQuestion {
    pub index: usize,
    pub question: String,
    pub header: String,
    pub options: Vec<QuestionOption>,
    pub multi_select: bool,
    pub tool_use_id: String,
}

/// An answer from the user
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanAnswer {
    pub question_index: usize,
    pub answers: Vec<String>,
}

/// Serializable info about a planning session (for API responses)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanSessionInfo {
    pub id: String,
    pub title: String,
    pub prompt: String,
    pub questions: Vec<PlanQuestion>,
    pub answers: Vec<PlanAnswer>,
    pub status: PlanStatus,
    pub summary: Option<String>,
    /// Whether Claude should ask clarifying questions (uses PLAN_MODE_SUFFIX)
    pub ask_questions: bool,
}

/// A planning session that tracks Q&A state
pub struct PlanSession {
    pub id: String,
    pub title: String,
    pub prompt: String,
    pub questions: Vec<PlanQuestion>,
    pub answers: Vec<PlanAnswer>,
    pub status: PlanStatus,
    pub summary: Option<String>,
    #[allow(dead_code)]
    pub created_at: Instant,
    pub last_activity: Instant,
    /// Accumulated output from Claude (used for context in re-spawn)
    pub accumulated_output: String,
    /// Current questions waiting for answers (if any)
    pub pending_questions: Vec<PlanQuestion>,
    /// Whether Claude should ask clarifying questions (uses PLAN_MODE_SUFFIX)
    pub ask_questions: bool,
    /// Content of the plan file written by Claude (extracted from Write tool)
    pub plan_content: Option<String>,
}

impl PlanSession {
    pub fn new(id: String, title: String, prompt: String, ask_questions: bool) -> Self {
        let now = Instant::now();
        Self {
            id,
            title,
            prompt,
            questions: Vec::new(),
            answers: Vec::new(),
            status: PlanStatus::Processing,
            summary: None,
            created_at: now,
            last_activity: now,
            accumulated_output: String::new(),
            pending_questions: Vec::new(),
            ask_questions,
            plan_content: None,
        }
    }

    pub fn add_questions(&mut self, questions: Vec<PlanQuestion>) {
        self.pending_questions = questions.clone();
        self.questions.extend(questions);
        self.status = PlanStatus::WaitingForAnswer;
        self.last_activity = Instant::now();
    }

    pub fn add_answers(&mut self, answers: Vec<PlanAnswer>) {
        self.answers.extend(answers);
        self.pending_questions.clear();
        self.status = PlanStatus::Processing;
        self.last_activity = Instant::now();
    }

    #[allow(dead_code)]
    pub fn add_answer(&mut self, answer: PlanAnswer) {
        self.answers.push(answer);
        // Only clear pending if all questions answered
        let answered_count = self.answers.iter()
            .filter(|a| self.pending_questions.iter().any(|q| q.index == a.question_index))
            .count();
        if answered_count >= self.pending_questions.len() {
            self.pending_questions.clear();
            self.status = PlanStatus::Processing;
        }
        self.last_activity = Instant::now();
    }

    pub fn append_output(&mut self, line: &str) {
        self.accumulated_output.push_str(line);
        self.accumulated_output.push('\n');
        self.last_activity = Instant::now();
    }

    pub fn set_summary(&mut self, summary: String) {
        self.summary = Some(summary);
        self.status = PlanStatus::Summary;
        self.last_activity = Instant::now();
    }

    #[allow(dead_code)]
    pub fn is_expired(&self, timeout_secs: u64) -> bool {
        self.last_activity.elapsed().as_secs() > timeout_secs
    }

    pub fn current_question_index(&self) -> usize {
        self.questions.len()
    }

    /// Build a prompt that includes conversation history for re-spawn
    pub fn build_respawn_prompt(&self) -> String {
        let mut prompt = self.prompt.clone();

        if !self.questions.is_empty() {
            prompt.push_str("\n\n## Previous conversation with the user\n\n");

            for (q, a) in self.questions.iter().zip(self.answers.iter()) {
                prompt.push_str(&format!("**Question ({})**: {}\n", q.header, q.question));
                prompt.push_str(&format!("**User's answer**: {}\n\n", a.answers.join(", ")));
            }

            prompt.push_str("## Continue from here\n\n");
            prompt.push_str("Based on the user's answers above, continue the planning process. ");
            prompt.push_str("Ask more questions if needed or provide the final implementation plan.");
        }

        prompt
    }

    pub fn to_info(&self) -> PlanSessionInfo {
        PlanSessionInfo {
            id: self.id.clone(),
            title: self.title.clone(),
            prompt: self.prompt.clone(),
            questions: self.questions.clone(),
            answers: self.answers.clone(),
            status: self.status.clone(),
            summary: self.summary.clone(),
            ask_questions: self.ask_questions,
        }
    }
}

/// Suffix to append to prompts when Plan Mode is enabled
pub const PLAN_MODE_SUFFIX: &str = r#"

Interview me in detail using the AskUserQuestionTool about literally anything: technical implementation, UI & UX, concerns, tradeoffs, etc. but make sure the questions are not obvious.
Be very in-depth and continue interviewing me continually until it's complete. After gathering all information, provide a summary of the implementation plan."#;
