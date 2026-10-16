import asyncio
import argparse
from google.adk.runners import Runner
from google.genai.types import Content, Part
from agency_director.agent import root_agent
from firestore_session import FirestoreSessionService
from shared.config import APP_NAME
import sys

async def main():
    parser = argparse.ArgumentParser(description="New Dawn Agency OS CLI")
    parser.add_argument("--user", type=str, default="local_user", help="User ID for the session")
    parser.add_argument("--session", type=str, default="local_session", help="Session ID")
    args = parser.parse_args()

    runner = Runner(
        agent=root_agent,
        app_name=APP_NAME,
        session_service=FirestoreSessionService(),
        auto_create_session=True
    )

    print("==========================================")
    print(" Welcome to New Dawn Agency OS Director!  ")
    print("==========================================")
    print("Type 'quit' or 'exit' to end the session.")
    
    while True:
        try:
            user_input = input("\nYou: ")
        except EOFError:
            break
        
        if user_input.lower() in ["quit", "exit"]:
            print("Goodbye!")
            break
        
        if not user_input.strip():
            continue
            
        new_message = Content(parts=[Part.from_text(text=user_input)], role="user")
        
        print("Agent: ", end="", flush=True)
        try:
            async for event in runner.run_async(
                user_id=args.user,
                session_id=args.session,
                new_message=new_message
            ):
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            print(part.text, end="", flush=True)
                        elif part.function_call:
                            print(f"\n[Tool Execution: {part.function_call.name}]", end="", flush=True)
            print()
        except Exception as e:
            print(f"\n[Error: {e}]")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nSession interrupted. Goodbye!")
        sys.exit(0)
