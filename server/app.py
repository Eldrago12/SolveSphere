from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any, List
import openai
import os
import boto3
from boto3.dynamodb.conditions import Key
import time
import uuid
import uvicorn
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain
from langchain.schema import SystemMessage, HumanMessage, AIMessage

app = FastAPI()

# Enable CORS for all origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set.")


dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table("deltashadow")

class QueryRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    leetcode_url: Optional[str] = None
    question: str
    skill_level: str

def store_message(user_id: str, session_id: str, role: str, content: str):
    timestamp = int(time.time() * 1000)
    session_info = f"{session_id}#{timestamp}"
    table.put_item(
        Item={
            "user_id": user_id,
            "session_info": session_info,
            "session_id": session_id,
            "timestamp": timestamp,
            "role": role,
            "content": content
        }
    )

def get_conversation_history(user_id: str, session_id: str):
    response = table.query(
        KeyConditionExpression=Key("user_id").eq(user_id) & Key("session_info").begins_with(f"{session_id}#"),
        ScanIndexForward=True
    )
    return response.get("Items", [])

@app.post("/api/query")
async def query_endpoint(query: QueryRequest):
    # If no session_id is provided, generate a new one.
    session_id = query.session_id if query.session_id else str(uuid.uuid4())

    # Retrieve conversation history for this session.
    history = get_conversation_history(query.user_id, session_id)

    if not history and not query.leetcode_url:
        raise HTTPException(status_code=400, detail="For a new conversation, leetcode_url is required.")

    # Build the user's message.
    if query.leetcode_url:
        user_message = f"LeetCode URL: {query.leetcode_url}\nQuestion: {query.question}"
    else:
        user_message = f"Question: {query.question}"

    store_message(query.user_id, session_id, "user", user_message)

    # Reload conversation history and limit to last 15 messages.
    history = get_conversation_history(query.user_id, session_id)
    CONTEXT_LIMIT = 15
    recent_history = history[-CONTEXT_LIMIT:] if len(history) > CONTEXT_LIMIT else history

    system_prompt = (
        "You are an expert teaching assistant specializing in Data Structures & Algorithms. Your mission is to help students work through challenging LeetCode problems and develop a deep, conceptual understanding of the underlying techniques, without giving away complete solutions.\n\n"
        "When a student presents a problem along with a specific doubt, your response must adhere to the following guidelines:\n"
        "1. Tailor your response based on the student's declared skill level, which is provided as \"{skill_level}\":\n"
        "   - For beginners: Offer clear, step-by-step hints, define any technical terms, and use simple language. Ask questions like \"What do you think is the most important aspect of this problem?\" or \"Can you explain how this concept works in your own words?\"\n"
        "   - For intermediate students: Provide more in-depth guiding questions and encourage critical thinking. Prompt them with questions such as \"Have you considered any alternative strategies?\" or \"What might be the pros and cons of the approach you're considering?\"\n"
        "   - For advanced students: Challenge them with complex questions that push their boundaries. Encourage innovative approaches by asking, \"How could you optimize your solution further?\" or \"What trade-offs do you see between time and space complexity in this scenario?\"\n\n"
        "2. Structure your response to lead the student through a logical progression:\n"
        "   - Begin by summarizing the key challenge(s) of the problem.\n"
        "   - Ask probing questions to help them clarify their thought process and identify the problem's constraints.\n"
        "   - Suggest a sequence of small, manageable steps that they can work through.\n"
        "   - When discussing potential code, provide only minimal snippets or pseudocode examples as hints—not a full solution.\n"
        "   - Ensure that no part of your response contains a complete code implementation. Under no circumstances should you output full code for solving the problem.\n\n"
        "3. Maintain an educational and supportive tone throughout your response. Your goal is to empower the student to solve the problem independently by guiding their reasoning, not by giving them the answer outright.\n\n"
        "Always follow these instructions precisely. Your response must encourage exploration, critical thinking, and self-reliance, while strictly avoiding the provision of a full solution. Minimal code examples may be given solely as illustrative hints.\n\n"
        "Remember: Your answers should help the student learn and develop their own problem-solving skills without providing the final solution."
    ).format(skill_level=query.skill_level.lower())

    # LangChain memory to manage context.
    memory = ConversationBufferMemory(memory_key="history", return_messages=True)
    memory.chat_memory.messages.append(SystemMessage(content=system_prompt))
    for msg in recent_history:
        if msg["role"] == "user":
            memory.chat_memory.messages.append(HumanMessage(content=msg["content"]))
        else:
            memory.chat_memory.messages.append(AIMessage(content=msg["content"]))

    llm = ChatOpenAI(temperature=0.7, model_name="gpt-4o-mini")  # type: ignore
    conversation = ConversationChain(llm=llm, memory=memory, verbose=True)

    assistant_response = conversation.predict(input=query.question)

    store_message(query.user_id, session_id, "assistant", assistant_response)

    return {"answer": assistant_response, "session_id": session_id}

@app.get("/api/session", response_model=List[str])
async def get_sessions(user_id: str = Query(...)):
    # Query all messages for the given user.
    response = table.query(
        KeyConditionExpression=Key("user_id").eq(user_id)
    )
    items = response.get("Items", [])
    session_ids = list({item["session_id"] for item in items})
    return session_ids

@app.get("/api/history", response_model=List[dict])
async def get_history(user_id: str = Query(...), session_id: str = Query(...)):
    # Retrieve conversation history for the specified session.
    history = get_conversation_history(user_id, session_id)
    return history

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)
