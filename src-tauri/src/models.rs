use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Block {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub sort_order: i32,
    pub show_on_desktop: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Item {
    pub id: String,
    pub block_id: String,
    pub content: String,
    pub item_type: String,
    pub priority: String,
    pub status: String,
    pub due_date: Option<String>,
    pub start_date: Option<String>,
    pub is_date_linked: bool,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateItemInput {
    pub block_id: String,
    pub content: String,
    pub item_type: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
    pub start_date: Option<String>,
    pub is_date_linked: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateItemInput {
    pub id: String,
    pub content: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub due_date: Option<String>,
    pub start_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompletionRecord {
    pub id: String,
    pub item_id: String,
    pub original_block_id: String,
    pub completed_date: String,
    pub completed_at: String,
}

#[derive(Debug, Serialize)]
pub struct CalendarDay {
    pub date: String,
    pub day_of_month: u32,
    pub is_current_month: bool,
    pub is_today: bool,
    pub items: Vec<ItemWithCompletion>,
}

#[derive(Debug, Serialize)]
pub struct ItemWithCompletion {
    pub item: Item,
    pub completed_on_this_date: bool,
}

#[derive(Debug, Serialize)]
pub struct CalendarMonthData {
    pub year: i32,
    pub month: u32,
    pub days: Vec<CalendarDay>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiParseResult {
    pub content: String,
    pub date: Option<String>,
    pub item_type: String,
    pub priority: String,
    pub block_name: String,
    pub reason: Option<String>,
}
