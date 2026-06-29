use crate::db::get_connection;
use crate::models::AiParseResult;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::AppHandle;

/// Chat message for AI conversation (OpenAI-compatible format)
#[derive(Debug, Deserialize, Serialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

fn ensure_chat_url(endpoint: &str) -> String {
    let trimmed = endpoint.trim_end_matches('/');
    if trimmed.ends_with("/chat/completions") {
        trimmed.to_string()
    } else {
        format!("{}/chat/completions", trimmed)
    }
}

/// AI parse: natural language → structured todo items (batch)
#[tauri::command]
pub async fn ai_parse(app: AppHandle, text: String) -> Result<Vec<AiParseResult>, String> {
    let (api_key, endpoint, model) = read_ai_settings(&app)?;

    if api_key.is_empty() {
        return Err("请先在设置中配置 AI API Key".to_string());
    }

    let url = ensure_chat_url(&endpoint);

    // Read existing blocks so AI knows which categories are available
    let block_names = get_existing_block_names(&app);

    let block_names_str = if block_names.is_empty() {
        "待办".to_string()
    } else {
        block_names.join("、")
    };

    // Get current date so AI can correctly compute relative dates
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let tomorrow = chrono::Local::now()
        .format("%Y-%m-%d")
        .to_string()
        .parse::<chrono::NaiveDate>()
        .ok()
        .map(|d| d + chrono::Duration::days(1))
        .map(|d| d.format("%Y-%m-%d").to_string())
        .unwrap_or_else(|| "2026-07-01".to_string());

    let system_prompt = format!(
        r#"你是一个待办事项解析器。将用户的自然语言输入解析为结构化的待办事项数据。

当前日期：{today}

用户已有的区块（分类）：【{blocks}】

请严格按以下 JSON 格式返回一个数组（只返回纯 JSON，不要 markdown 代码块标记）：
[
  {{
    "content": "事项内容",
    "date": "2026-06-30" 或 null,
    "item_type": "todo" | "idea",
    "priority": "urgent_important" | "important_not_urgent" | "urgent_not_important" | "neither",
    "block_name": "区块名称（从用户已有的区块中选择最匹配的，不要编造不存在的区块名）",
    "reason": "解析理由说明或 null"
  }}
]

规则：
- content: 提取核心待办内容，简洁明确
- date: 提取日期（格式 YYYY-MM-DD），无明确日期则 null。当前日期是 {today}，务必正确计算"明天""后天""下周"等相对日期。例如今天 {today}，明天是 {tomorrow}
- item_type: 待办为 todo，灵感/想法为 idea
- priority: urgent_important=紧急重要, important_not_urgent=重要不紧急, urgent_not_important=紧急不重要, neither=一般
- block_name: 从用户已有的区块中选择最匹配的。例如"买酱油"应归入"买东西"而非"待办"。只有当所有已有区块都不匹配时才用"待办"
- reason: 简要说明为什么这样解析

示例：
输入："6.30 买眼线笔，比较急"
输出：[{{"content":"买眼线笔","date":"2026-06-30","item_type":"todo","priority":"urgent_important","block_name":"待办","reason":"指定日期6.30且说明比较急"}}]

输入："周内注册公司\n明天买牛奶"
输出：[{{"content":"注册公司","date":"{today}","item_type":"todo","priority":"important_not_urgent","block_name":"待办","reason":"周内需要完成"}},{{"content":"买牛奶","date":"{tomorrow}","item_type":"todo","priority":"neither","block_name":"买东西","reason":"日常购物"}}]"#,
        today = today, tomorrow = tomorrow, blocks = block_names_str
    );

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&json!({
            "model": model,
            "max_tokens": 2048,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ]
        }))
        .send()
        .await
        .map_err(|e| format!("AI 请求失败: {}", e))?;

    eprintln!("[ai_parse] status: {}", response.status());

    let body: Value = response
        .json()
        .await
        .map_err(|e| format!("解析 AI 响应失败: {}（检查 Endpoint 和 API Key 是否正确）", e))?;

    // Check for API error (OpenAI format: {"error": {"message": "...", "type": "..."}})
    if let Some(err_msg) = body["error"]["message"].as_str() {
        let err_type = body["error"]["type"].as_str().unwrap_or("unknown");
        return Err(format!("API 错误 [{}]: {}", err_type, err_msg));
    }

    let content_text = body["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| {
            let err = body["error"]["message"].as_str().unwrap_or("未知响应格式");
            format!("AI 返回异常: {} (响应: {})", err, body)
        })?;

    eprintln!("[ai_parse] raw AI output: {}", content_text);

    // Try to extract JSON array from the response (handle possible code fences)
    let cleaned = content_text.trim();
    let json_str = if cleaned.starts_with("```") {
        // Extract JSON from code fence
        let lines: Vec<&str> = cleaned.lines().collect();
        let start = lines.iter().position(|l| l.contains('[') || l.contains('{')).unwrap_or(1);
        let end = lines.iter().rposition(|l| l.contains(']') || l.contains('}')).map(|i| i + 1).unwrap_or(lines.len());
        lines[start..end].join("\n")
    } else {
        cleaned.to_string()
    };

    // Try as array first, then wrap single object in array
    let parsed: Vec<AiParseResult> = match serde_json::from_str(&json_str) {
        Ok(arr) => arr,
        Err(_) => {
            let single: AiParseResult = serde_json::from_str(&json_str)
                .map_err(|e| format!("解析 AI 返回格式异常: {} - 原始内容: {}", e, json_str))?;
            vec![single]
        }
    };

    Ok(parsed)
}

/// AI chat: conversational mode
#[tauri::command]
pub async fn ai_chat(app: AppHandle, messages: Vec<ChatMessage>) -> Result<String, String> {
    let (api_key, endpoint, model) = read_ai_settings(&app)?;

    if api_key.is_empty() {
        return Err("请先在设置中配置 AI API Key".to_string());
    }

    let url = ensure_chat_url(&endpoint);

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&json!({
            "model": model,
            "max_tokens": 2048,
            "messages": messages
        }))
        .send()
        .await
        .map_err(|e| format!("AI 请求失败: {}", e))?;

    eprintln!("[ai_chat] status: {}", response.status());

    let body: Value = response
        .json()
        .await
        .map_err(|e| format!("解析 AI 响应失败: {}", e))?;

    if let Some(err_msg) = body["error"]["message"].as_str() {
        let err_type = body["error"]["type"].as_str().unwrap_or("unknown");
        return Err(format!("API 错误 [{}]: {}", err_type, err_msg));
    }

    let reply = body["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| {
            let err = body["error"]["message"].as_str().unwrap_or("未知响应格式");
            format!("AI 返回异常: {} (响应: {})", err, body)
        })?
        .to_string();

    Ok(reply)
}

fn read_ai_settings(app: &AppHandle) -> Result<(String, String, String), String> {
    let conn = get_connection(app);
    let conn = conn.lock().map_err(|e| e.to_string())?;

    let read = |key: &str, default: &str| -> String {
        conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![key],
            |row| row.get::<_, String>(0),
        )
        .unwrap_or_else(|_| default.to_string())
    };

    Ok((
        read("ai_api_key", ""),
        read("ai_endpoint", "https://api.deepseek.com"),
        read("ai_model", "deepseek-chat"),
    ))
}

/// Read existing block names from the database so AI can categorize correctly
fn get_existing_block_names(app: &AppHandle) -> Vec<String> {
    let conn = get_connection(app);
    let conn = match conn.lock() {
        Ok(c) => c,
        Err(_) => return vec![],
    };

    let mut stmt = match conn.prepare("SELECT name FROM blocks ORDER BY sort_order") {
        Ok(s) => s,
        Err(_) => return vec![],
    };

    let names: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .unwrap_or_else(|_| unreachable!())
        .filter_map(|r| r.ok())
        .collect();

    names
}
