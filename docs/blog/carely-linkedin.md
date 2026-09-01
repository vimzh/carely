# LinkedIn post

This is my grandparents' phone: physical buttons, saved numbers, and no reliable way to use Gemini.

They can call me, but sometimes the question feels too small. They think I may be busy, or they do not want to feel like a burden.

Carely gives them another number to call.

Carely is a family-grounded voice agent for older adults who are comfortable with a telephone but not with apps. My grandparents call from the phone they already know and speak naturally. Our family manages trusted contacts, routines, appliance guides, household instructions, and reminders through a web dashboard.

Behind that simple call is an agentic system built with:

- Gemini 3.5 Flash-Lite for reasoning and tool orchestration
- Gemini Live for real-time, interruptible voice conversations
- Gemini Embedding 2 and family-scoped retrieval for grounded answers
- Google ADK for tools, context, and confirmed actions
- Vertex AI for production inference
- Twilio as the bridge carrying audio between the telephone and Carely

Gemini is not used as a generic chatbot. The agent decides when to retrieve private family knowledge, search current information, or perform a bounded action. Deterministic application code still owns identity, authorization, emergency handling, validation, and confirmation.

For example, Carely cannot create a reminder merely because it was mentioned. It collects the required details, repeats the complete reminder, asks for confirmation, and only then invokes the tool.

Accessibility sometimes means simplifying a screen. Here, it means removing the screen entirely.

We built Carely for the All Things Agentic Hackathon, and I'm excited to finally share it.

Demo: https://youtu.be/Uv9Kt1cK2vs

#AllThingsAgentic #AllThingsAgenticHackathon #GoogleGemini #GoogleCloud #GoogleADK #VertexAI #VoiceAI #Accessibility
