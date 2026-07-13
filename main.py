import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from model_bridge_sdk import (
    ModelBridge,
    ApiError,
    AuthenticationError,
    RateLimitError,
    InsufficientCreditsError,
    ProviderError,
    ValidationError,
)

client = ModelBridge(
    api_key=os.environ.get("MODELBRIDGE_API_KEY", "sk-your-api-key"),
    timeout=30.0,
    max_retries=3,
)


# # ─────────────────────────────────────────────
# # Example 1: Basic Chat Completion
# # ─────────────────────────────────────────────
# async def basic_chat_completion():
#     print("Example 1: Basic Chat Completion")

#     response = await client.chat.completions.create(
#         model="gpt-4",
#         messages=[
#             {"role": "user", "content": "What is the capital of France?"}
#         ],
#         temperature=0.7,
#         max_tokens=100,
#     )

#     print("Response:", response)


# # ─────────────────────────────────────────────
# # Example 2: Streaming Chat Completion
# # ─────────────────────────────────────────────
# async def streaming_chat_completion():
#     print("\nExample 2: Streaming Chat Completion")

#     stream = await client.chat.completions.create(
#         model="gpt-4",
#         messages=[
#             {"role": "user", "content": "Write a short poem about Python"}
#         ],
#         stream=True,
#     )

#     async for chunk in stream:
#         content = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
#         if content:
#             print(content, end="", flush=True)

#     print("\n")


# # ─────────────────────────────────────────────
# # Example 3: Streaming with Error Handling
# # ─────────────────────────────────────────────
# async def streaming_with_error_handling():
#     print("\nExample 3: Streaming with Error Handling")

#     try:
#         stream = await client.chat.completions.create(
#             model="gpt-4",
#             messages=[{"role": "user", "content": "Hello"}],
#             stream=True,
#             timeout=10.0,   # custom timeout (replaces { timeout: 10000 } in TS)
#         )

#         async for chunk in stream:
#             content = chunk.get("choices", [{}])[0].get("delta", {}).get("content") or ""
#             print(content, end="", flush=True)

#     except RateLimitError as e:
#         print("Rate limited. Retry after:", e.retry_after, "seconds")
#     except InsufficientCreditsError as e:
#         print("Insufficient credits", {"required": e.required, "available": e.available})
#     except ProviderError as e:
#         print("Provider error:", e.provider)


# # ─────────────────────────────────────────────
# # Example 4: Chat with System Prompt and Tools
# # ─────────────────────────────────────────────
# async def chat_with_tools():
#     print("\nExample 4: Chat with Tools")

#     response = await client.chat.completions.create(
#         model="gpt-4",
#         messages=[
#             {"role": "system", "content": "You are a helpful assistant with access to tools."},
#             {"role": "user",   "content": "Get the weather for New York"},
#         ],
#         tools=[
#             {
#                 "type": "function",
#                 "function": {
#                     "name": "get_weather",
#                     "description": "Get the weather for a location",
#                     "parameters": {
#                         "type": "object",
#                         "properties": {
#                             "location": {"type": "string"}
#                         },
#                         "required": ["location"],
#                     },
#                 },
#             }
#         ],
#         tool_choice="auto",
#     )

#     print("Response:", response)


# ─────────────────────────────────────────────
# Example 5: List Models
# ─────────────────────────────────────────────
async def list_models():
    print("\nExample 5: List Models")

    models = await client.models.list(limit=10, offset=0)
    print("Available models:", models)

    # Get specific model details
    gpt4 = await client.models.retrieve("1")
    print("Model Details:", gpt4)

    # Get model pricing (requires real API - not available on mock server)
    # pricing = await client.models.get_pricing("1")
    # print("Pricing:", pricing)


# ─────────────────────────────────────────────
# Example 6: Usage Tracking
# ─────────────────────────────────────────────
async def usage_tracking():
    print("\nExample 6: Usage Tracking")

    # Get current usage
    current = await client.usage.get_current()
    print("Current usage:", current)

    # Get usage history
    history = await client.usage.list(
        start_date="2024-01-01",
        end_date="2024-01-31",
        limit=100,
        offset=0,
    )
    print("Usage history:", history)

    # Get usage by model
    by_model = await client.usage.by_model(
        start_date="2024-01-01",
        end_date="2024-01-31",
    )
    print("Usage by model:", by_model)

    # Get costs
    costs = await client.usage.get_costs(
        start_date="2024-01-01",
        end_date="2024-01-31",
    )
    print("Costs breakdown:", costs)


# ─────────────────────────────────────────────
# Example 7: Credit Management
# ─────────────────────────────────────────────
async def credit_management():
    print("\nExample 7: Credit Management")

    # Get credit balance
    balance = await client.credits.balance()
    print("Credit balance:", balance)

    # Get credit history
    history = await client.credits.history(limit=50, offset=0)
    print("Credit history:", history)

    # Get payment methods
    payment_methods = await client.credits.get_payment_methods()
    print("Payment methods:", payment_methods)


# ─────────────────────────────────────────────
# Example 8: Error Handling
# ─────────────────────────────────────────────
async def error_handling():
    print("\nExample 8: Error Handling")

    try:
        await client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": "Hello"}],
        )
    except AuthenticationError as e:
        print("Authentication failed:", e)
    except ValidationError as e:
        print("Validation errors:", e.validation_errors)
    except RateLimitError as e:
        print("Rate limited:", e)
        print("Retry after:", e.retry_after, "seconds")
    except InsufficientCreditsError as e:
        print("Insufficient credits:", e)
        print("Required:", e.required, "Available:", e.available)
    except ProviderError as e:
        print("Provider error:", e)
        print("Provider:", e.provider)
        print("Retryable:", e.retryable)
    except ApiError as e:
        print("API error:", e)
        print("Status:", e.status)
        print("Code:", e.code)
        print("Details:", e.details)


# ─────────────────────────────────────────────
# Example 9: Batch Processing with Retries
# ─────────────────────────────────────────────
async def batch_processing():
    print("\nExample 9: Batch Processing")

    messages = [
        "What is Python?",
        "How does async/await work?",
        "Explain decorators",
    ]

    # asyncio.gather() is the Python equivalent of Promise.all()
    responses = await asyncio.gather(*[
        client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": msg}],
            max_tokens=100,
        )
        for msg in messages
    ])

    for i, response in enumerate(responses):
        print(f"Question {i + 1}:", messages[i])
        print("Answer:", response)
        print("---")


# ─────────────────────────────────────────────
# Example 10: Advanced Configuration
# ─────────────────────────────────────────────
async def advanced_configuration():
    print("\nExample 10: Advanced Configuration")

    # Create client with custom base URL and timeouts
    custom_client = ModelBridge(
        api_key=os.environ.get("MODELBRIDGE_API_KEY", "sk-your-api-key"),
        base_url="https://custom.api.modelbridge.ai/v1",
        timeout=60.0,       # 60 seconds
        max_retries=5,
    )

    print("Client configuration:", custom_client.get_config())

    await custom_client.close()


# ─────────────────────────────────────────────
# Example 11: Token Counting
# ─────────────────────────────────────────────
async def token_counting():
    print("\nExample 11: Token Counting")

    messages = [
        {"role": "user",      "content": "What is the capital of France?"},
        {"role": "assistant", "content": "The capital of France is Paris."},
    ]

    token_count = await client.chat.completions.count_tokens("gpt-4", messages)
    print("Token count:", token_count)


# ─────────────────────────────────────────────
# Example 12: Abort / Cancellation
# (Python equivalent of AbortController + AbortSignal)
# ─────────────────────────────────────────────
async def abort_signal():
    print("\nExample 12: Cancellation with asyncio")

    async def make_request():
        return await client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": "Write a long story"}],
            max_tokens=1000,
        )

    try:
        # Cancel after 5 seconds — equivalent to AbortController timeout
        response = await asyncio.wait_for(make_request(), timeout=5.0)
        print("Response:", response)
    except asyncio.TimeoutError:
        print("Request was cancelled (timed out after 5 seconds)")


# ─────────────────────────────────────────────
# Run Examples
# ─────────────────────────────────────────────
async def run_examples():
    try:
        # Uncomment the examples you want to run:
        # NOTE: examples 1-4, 9, 11, 12 require a real ModelBridge API key
        # await basic_chat_completion()
        # await streaming_chat_completion()
        # await streaming_with_error_handling()
        # await chat_with_tools()
        await list_models()         # works with mock server
        # await usage_tracking()
        # await credit_management()
        # await error_handling()
        # await batch_processing()
        # await advanced_configuration()
        # await token_counting()
        # await abort_signal()

        print("\nExamples completed successfully!")
    except Exception as e:
        print("Error running examples:", e)
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(run_examples())