from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.sqlite import SqliteSaver
from typing import TypedDict, Literal
import sqlite3
from dotenv import load_dotenv
import os 

load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.6)

user_db = None

conn = sqlite3.connect("chatbot.db", check_same_thread=False)
checkpointer = SqliteSaver(conn)

class State(TypedDict):
    question: str
    context: str
    type: str
    ans: str

def take_query(state: State):
    global user_db

    if user_db is None:
        return {"context": "No document uploaded yet."}

    docs = user_db.similarity_search(state["question"], k=3)

    context = ""
    for doc in docs:
        page = doc.metadata.get("page", "unknown")
        context += f"(Page {page}) {doc.page_content}\n\n"

    return {"context": context}

def decide(state: State):
    prompt = f"""
Return ONLY ONE WORD:

MATHS / AGAIN / GENERAL

Question: {state['question']}
"""
    res = llm.invoke(prompt).content.strip().upper()
    return {"type": res.split()[0]}

def build_prompt(state: State):
    return f"""
Answer using context only.
If not found say "Not in document".

Context:
{state['context']}

Question:
{state['question']}
"""

def general(state: State):
    return {"ans": llm.invoke(build_prompt(state)).content}

def maths(state: State):
    return {"ans": llm.invoke(build_prompt(state) + "\nGive simple example.").content}

def more(state: State):
    return {"ans": llm.invoke(build_prompt(state) + "\nExplain deeply.").content}

def route(state: State) -> Literal["general", "maths", "more"]:
    if "MATHS" in state["type"]:
        return "maths"
    elif "AGAIN" in state["type"]:
        return "more"
    return "general"

graph = StateGraph(State)

graph.add_node("take_query", take_query)
graph.add_node("decide", decide)
graph.add_node("general", general)
graph.add_node("maths", maths)
graph.add_node("more", more)

graph.add_edge(START, "take_query")
graph.add_edge("take_query", "decide")

graph.add_conditional_edges("decide", route, {
    "general": "general",
    "maths": "maths",
    "more": "more"
})

graph.add_edge("general", END)
graph.add_edge("maths", END)
graph.add_edge("more", END)

graph_app = graph.compile(checkpointer=checkpointer)