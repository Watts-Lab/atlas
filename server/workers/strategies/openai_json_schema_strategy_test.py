"""Tests for OpenAIJSONSchemaStrategy with a mocked OpenAI client.

Only the external boundaries are faked:
- the OpenAI Responses API client
- the feature/schema lookups that hit the database

The strategy's own request-building and response-parsing logic runs for real.
"""

import json
from types import SimpleNamespace

import pytest
from workers.strategies.openai_json_schema_strategy import OpenAIJSONSchemaStrategy


class FakeEmitter:
    """Capture status events emitted by the strategy."""

    def __init__(self):
        self.events = []

    def emit_status(self, **kwargs):
        self.events.append(kwargs)


class FakeResponsesClient:
    """Mimic the OpenAI Responses API and capture the outgoing payload."""

    def __init__(self, output_text, input_tokens=123, output_tokens=45):
        self.last_kwargs = None
        usage = SimpleNamespace(input_tokens=input_tokens, output_tokens=output_tokens)
        self._response = SimpleNamespace(output_text=output_text, usage=usage)

        def _create(**kwargs):
            self.last_kwargs = kwargs
            return self._response

        self.responses = SimpleNamespace(create=_create)


@pytest.fixture
def patch_schema(monkeypatch):
    """Patch the DB-backed helpers so the strategy can run offline.

    Both the schema builder and the instruction resolver normally touch the
    database (feature lookups / Project.get). Those are the external boundaries;
    everything else in ``extract`` runs for real.
    """

    def _build(self, feature_ids=None):
        return {
            "type": "object",
            "properties": {"paper": {"type": "object"}},
            "required": ["paper"],
            "additionalProperties": False,
        }

    monkeypatch.setattr(OpenAIJSONSchemaStrategy, "_build_json_schema", _build)
    monkeypatch.setattr(
        OpenAIJSONSchemaStrategy,
        "_resolve_instructions",
        lambda self, custom_prompt: custom_prompt or "default instructions",
    )


def _make_pdf(tmp_path):
    pdf_path = tmp_path / "paper.pdf"
    pdf_path.write_bytes(b"%PDF-1.4 test")
    return pdf_path


@pytest.mark.unit
def test_extract_uses_custom_prompt_and_returns_tokens(tmp_path, patch_schema):
    """Exercise the request contract and the parsed response shape."""
    emitter = FakeEmitter()
    client = FakeResponsesClient(
        output_text=json.dumps({"paper": {"title": "A Study"}})
    )
    strategy = OpenAIJSONSchemaStrategy(client, "project-1", emitter)

    pdf_path = _make_pdf(tmp_path)
    result = strategy.extract(str(pdf_path), custom_prompt="custom instructions")

    assert result["result"] == {"paper": {"title": "A Study"}}
    assert result["prompt_tokens"] == 123
    assert result["completion_tokens"] == 45

    payload = client.last_kwargs
    assert payload["model"] == OpenAIJSONSchemaStrategy.MODEL
    assert payload["text"]["format"]["type"] == "json_schema"
    assert payload["text"]["format"]["strict"] is True
    # Custom prompt is sent as the system message.
    assert payload["input"][0]["role"] == "system"
    assert payload["input"][0]["content"] == "custom instructions"

    # The PDF is base64-encoded and forwarded as an input_file part.
    file_part = payload["input"][1]["content"][0]
    assert file_part["type"] == "input_file"
    assert file_part["filename"] == "paper.pdf"
    assert file_part["file_data"].startswith("data:application/pdf;base64,")


@pytest.mark.unit
def test_extract_emits_progress_events(tmp_path, patch_schema):
    """Status progression should be visible to clients."""
    emitter = FakeEmitter()
    client = FakeResponsesClient(output_text=json.dumps({"paper": {}}))
    strategy = OpenAIJSONSchemaStrategy(client, "project-1", emitter)

    strategy.extract(str(_make_pdf(tmp_path)))

    progress = [event["progress"] for event in emitter.events]
    assert progress[:4] == [0, 10, 20, 30]


@pytest.mark.unit
def test_extract_is_silent_when_requested(tmp_path, patch_schema):
    """No status events should be emitted in silent mode."""
    emitter = FakeEmitter()
    client = FakeResponsesClient(output_text=json.dumps({"paper": {}}))
    strategy = OpenAIJSONSchemaStrategy(client, "project-1", emitter)

    strategy.extract(str(_make_pdf(tmp_path)), silent=True)

    assert emitter.events == []


@pytest.mark.unit
def test_extract_raises_on_invalid_json_content(tmp_path, patch_schema):
    """Invalid JSON returned by the model must surface as a parse failure."""
    emitter = FakeEmitter()
    client = FakeResponsesClient(output_text="not-json")
    strategy = OpenAIJSONSchemaStrategy(client, "project-1", emitter)

    with pytest.raises(json.JSONDecodeError):
        strategy.extract(str(_make_pdf(tmp_path)))


@pytest.mark.unit
def test_extract_accepts_nonconforming_json_current_behavior(tmp_path, patch_schema):
    """Document current behavior: valid JSON is returned even if off-schema."""
    emitter = FakeEmitter()
    client = FakeResponsesClient(output_text=json.dumps({"unexpected": "shape"}))
    strategy = OpenAIJSONSchemaStrategy(client, "project-1", emitter)

    out = strategy.extract(str(_make_pdf(tmp_path)))

    assert out["result"] == {"unexpected": "shape"}


@pytest.mark.unit
def test_get_strategy_name():
    """The strategy reports a stable identifier."""
    strategy = OpenAIJSONSchemaStrategy(FakeResponsesClient("{}"), "p", FakeEmitter())
    assert strategy.get_strategy_name() == "openai_json_schema"
