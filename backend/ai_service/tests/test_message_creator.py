"""
Message Creator Feature Tests.
Tests prompt construction, language handling, truncation, and endpoint behavior.
"""
import json
import pytest
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage


def _make_llm_capturing(response_text: str):
    """Returns (mock_llm, captured_messages_list)."""
    captured = []
    llm = MagicMock()
    def _invoke(messages):
        captured.extend(messages)
        return AIMessage(content=response_text)
    llm.invoke.side_effect = _invoke
    return llm, captured


class TestMessageCreatorPrompts:
    @patch("message_creator.service.LLMRouter")
    def test_referral_uses_referral_prompt(self, mock_router, fake_api_keys):
        import asyncio
        llm, captured = _make_llm_capturing("Hi, I'd love a referral...")
        mock_router.get_model.return_value = llm

        from message_creator.models import MessageRequest
        from message_creator.service import generate_networking_message

        payload = MessageRequest(purpose="referral", api_keys=fake_api_keys)
        asyncio.get_event_loop().run_until_complete(generate_networking_message(payload))

        system_msgs = [m for m in captured if isinstance(m, SystemMessage)]
        assert any("referral" in m.content.lower() for m in system_msgs)

    @patch("message_creator.service.LLMRouter")
    def test_apply_uses_apply_prompt(self, mock_router, fake_api_keys):
        import asyncio
        llm, captured = _make_llm_capturing("Dear hiring team...")
        mock_router.get_model.return_value = llm

        from message_creator.models import MessageRequest
        from message_creator.service import generate_networking_message

        payload = MessageRequest(purpose="apply", api_keys=fake_api_keys)
        asyncio.get_event_loop().run_until_complete(generate_networking_message(payload))

        system_msgs = [m for m in captured if isinstance(m, SystemMessage)]
        assert any("applying for a job" in m.content.lower() for m in system_msgs)

    @patch("message_creator.service.LLMRouter")
    def test_hebrew_language_instruction(self, mock_router, fake_api_keys):
        import asyncio
        llm, captured = _make_llm_capturing("שלום...")
        mock_router.get_model.return_value = llm

        from message_creator.models import MessageRequest
        from message_creator.service import generate_networking_message

        payload = MessageRequest(purpose="apply", language="He", api_keys=fake_api_keys)
        asyncio.get_event_loop().run_until_complete(generate_networking_message(payload))

        system_msgs = [m for m in captured if isinstance(m, SystemMessage)]
        assert any("hebrew" in m.content.lower() for m in system_msgs)

    @patch("message_creator.service.LLMRouter")
    def test_english_language_instruction(self, mock_router, fake_api_keys):
        import asyncio
        llm, captured = _make_llm_capturing("Hello...")
        mock_router.get_model.return_value = llm

        from message_creator.models import MessageRequest
        from message_creator.service import generate_networking_message

        payload = MessageRequest(purpose="apply", language="En", api_keys=fake_api_keys)
        asyncio.get_event_loop().run_until_complete(generate_networking_message(payload))

        system_msgs = [m for m in captured if isinstance(m, SystemMessage)]
        assert any("english" in m.content.lower() for m in system_msgs)


class TestMessageCreatorTruncation:
    @patch("message_creator.service.LLMRouter")
    def test_input_truncation(self, mock_router, fake_api_keys):
        """Skills/projects/experience are truncated to avoid token limits."""
        import asyncio
        llm, captured = _make_llm_capturing("Message here")
        mock_router.get_model.return_value = llm

        from message_creator.models import MessageRequest
        from message_creator.service import generate_networking_message

        long_skills = [{"name": f"Skill{i}", "level": "Advanced"} for i in range(500)]
        long_projects = [{"name": f"Project{i}", "desc": "x" * 100} for i in range(200)]
        long_exp = "x" * 10000

        payload = MessageRequest(
            purpose="apply",
            skills_pool=long_skills,
            projects_pool=long_projects,
            experience_text=long_exp,
            api_keys=fake_api_keys,
        )
        asyncio.get_event_loop().run_until_complete(generate_networking_message(payload))

        # The human message should exist and not be excessively long
        human_msgs = [m for m in captured if isinstance(m, HumanMessage)]
        assert len(human_msgs) > 0
        # Truncation limits: skills 1000, projects 2000, experience 3000
        # Total prompt should be well under 10k chars
        total_len = sum(len(m.content) for m in human_msgs)
        assert total_len < 15000


class TestMessageCreatorEndpoint:
    @patch("message_creator.service.LLMRouter")
    def test_endpoint_returns_success(self, mock_router):
        llm = MagicMock()
        llm.invoke.return_value = AIMessage(content="Professional message here.")
        mock_router.get_model.return_value = llm

        with patch("router.rate_limiter.redis.Redis"):
            from fastapi.testclient import TestClient
            from main import app
            client = TestClient(app)

            response = client.post("/generate-message", json={
                "purpose": "apply",
                "description": "Full-stack role",
                "api_keys": {"groq_token": "test-key"},
            })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["message"], str)
        assert len(data["message"]) > 0

    @patch("message_creator.service.LLMRouter")
    def test_endpoint_500_on_failure(self, mock_router):
        mock_router.get_model.side_effect = Exception("LLM exploded")

        with patch("router.rate_limiter.redis.Redis"):
            from fastapi.testclient import TestClient
            from main import app
            client = TestClient(app)

            response = client.post("/generate-message", json={
                "purpose": "apply",
                "api_keys": {"groq_token": "test-key"},
            })

        assert response.status_code == 500
