"""Tests for the provider-agnostic JSONSchemaExtractionStrategy.

The injected LLMService is faked, so no real provider is called. We verify:
- the orchestration passes the right args to the service,
- the normalized result is returned,
- schema validation catches off-schema output,
- progress events / silent mode behave.
"""

import pytest
from services.llm.base import StructuredExtractionResult
from workers.strategies.json_schema_strategy import JSONSchemaExtractionStrategy

pytestmark = [pytest.mark.unit]

_SCHEMA = {
    "type": "object",
    "properties": {"paper": {"type": "object"}},
    "required": ["paper"],
    "additionalProperties": False,
}


class FakeEmitter:
    def __init__(self):
        self.events = []

    def emit_status(self, **kwargs):
        self.events.append(kwargs)


class FakeService:
    name = "fake"
    model = "fake-model"

    def __init__(self, data):
        self._data = data
        self.last_call = None

    def extract_structured(self, **kwargs):
        self.last_call = kwargs
        return StructuredExtractionResult(
            data=self._data, model=self.model, prompt_tokens=11, completion_tokens=7
        )

    def ping(self):
        pass


def _make_pdf(tmp_path):
    p = tmp_path / "paper.pdf"
    p.write_bytes(b"%PDF-1.4 fake")
    return str(p)


def _strategy(service, monkeypatch, project_id="p1"):
    strat = JSONSchemaExtractionStrategy(service, project_id, FakeEmitter())
    monkeypatch.setattr(strat, "_build_json_schema", lambda feature_ids=None: _SCHEMA)
    monkeypatch.setattr(
        strat, "_resolve_instructions", lambda custom_prompt: custom_prompt or "sys"
    )
    return strat


def test_extract_returns_normalized_result(monkeypatch, tmp_path):
    service = FakeService({"paper": {"title": "A Study"}})
    strat = _strategy(service, monkeypatch)

    out = strat.extract(_make_pdf(tmp_path), custom_prompt="do it")

    assert out["result"] == {"paper": {"title": "A Study"}}
    assert out["model"] == "fake-model"
    assert out["prompt_tokens"] == 11
    assert out["completion_tokens"] == 7
    # Service received the schema + instructions we built.
    assert service.last_call["schema"] == _SCHEMA
    assert service.last_call["instructions"] == "do it"


def test_extract_validates_against_schema(monkeypatch, tmp_path):
    # Missing required "paper" -> validation must fail with a clear error.
    service = FakeService({"unexpected": "shape"})
    strat = _strategy(service, monkeypatch)

    with pytest.raises(ValueError, match="schema validation"):
        strat.extract(_make_pdf(tmp_path))


def test_extract_silent_emits_nothing(monkeypatch, tmp_path):
    service = FakeService({"paper": {}})
    strat = _strategy(service, monkeypatch)
    strat.extract(_make_pdf(tmp_path), silent=True)
    assert strat.emitter.events == []


def test_get_strategy_name():
    strat = JSONSchemaExtractionStrategy(FakeService({"paper": {}}), "p", FakeEmitter())
    assert strat.get_strategy_name() == "json_schema"
