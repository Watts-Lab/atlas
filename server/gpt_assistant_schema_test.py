"""Regression tests for JSON-schema construction in gpt_assistant.

Guards against the bug where ``required`` / ``additionalProperties`` leaked into
the ``properties`` map, producing invalid JSON Schema that OpenAI tolerated but
stricter providers (via OpenRouter: Azure/Anthropic/Bedrock) rejected with:
    "['paper_title', 'main_n'] is not of type 'object', 'boolean'"
"""

import pytest

import gpt_assistant as g

pytestmark = [pytest.mark.unit]


def _assert_strict_mode_valid(node, path="root"):
    """Every object node must have additionalProperties=False and a required
    array containing exactly its property keys (OpenAI/OpenRouter strict mode).
    """
    if isinstance(node, dict):
        if node.get("type") == "object":
            props = node.get("properties", {})
            assert node.get("additionalProperties") is False, f"{path}: addProps"
            assert set(node.get("required", [])) == set(props.keys()), (
                f"{path}: required {node.get('required')} != props {list(props.keys())}"
            )
        for k, v in node.items():
            _assert_strict_mode_valid(v, f"{path}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            _assert_strict_mode_valid(v, f"{path}[{i}]")


def test_flat_features_produce_valid_schema():
    feats = ["paper_title", "main_n"]
    obj = {
        "paper_title": {"type": "string", "description": "title"},
        "main_n": {"type": "number", "description": "n"},
    }
    schema = g.build_top_level_schema(feats, obj)

    props = schema["properties"]
    # Schema keywords must NOT appear as if they were feature properties.
    assert isinstance(props["paper_title"], dict) and "type" in props["paper_title"]
    # Top-level required lists the actual properties (not a phantom "paper").
    assert set(schema["required"]) == {"paper_title", "main_n"}
    assert schema["additionalProperties"] is False
    _assert_strict_mode_valid(schema)


def test_nested_features_place_required_inside_items(monkeypatch):
    # Force the generic-parent branch (no "<key>.parent" doc in the DB).
    class _Q:
        def run(self):
            return None

    class _Field:
        def __eq__(self, other):
            return ("eq", other)

    monkeypatch.setattr(
        g,
        "Features",
        type(
            "F",
            (),
            {
                "find_one": staticmethod(lambda *a, **k: _Q()),
                "feature_identifier": _Field(),
            },
        ),
    )

    feats = sorted(
        ["experiments.condition", "experiments.n", "paper_title"],
        key=lambda s: s.count("."),
    )
    obj = {
        "experiments.condition": {"type": "string", "description": "cond"},
        "experiments.n": {"type": "number", "description": "n"},
        "paper_title": {"type": "string", "description": "title"},
    }
    schema = g.build_top_level_schema(feats, obj)

    props = schema["properties"]
    assert set(schema["required"]) == {"experiments", "paper_title"}

    items = props["experiments"]["items"]
    assert items["type"] == "object"
    # Strict mode: required lists ALL property keys of this nested object.
    assert set(items["required"]) == {"condition", "n"}
    assert items["additionalProperties"] is False

    # And the whole tree is strict-mode valid at every object node.
    _assert_strict_mode_valid(schema)


def test_paper_container_required_includes_all_keys(monkeypatch):
    # Regression for the strict-mode 400: "required ... must include every key in
    # properties. Missing 'property'." The intermediate container's required
    # must list ALL its children, not just leaves.
    class _Q:
        def run(self):
            return None

    class _Field:
        def __eq__(self, other):
            return ("eq", other)

    monkeypatch.setattr(
        g,
        "Features",
        type(
            "F",
            (),
            {
                "find_one": staticmethod(lambda *a, **k: _Q()),
                "feature_identifier": _Field(),
            },
        ),
    )

    feats = sorted(
        ["paper.property", "paper.parties", "paper.paper_title"],
        key=lambda s: s.count("."),
    )
    obj = {
        "paper.property": {"type": "string", "description": "prop"},
        "paper.parties": {"type": "string", "description": "parties"},
        "paper.paper_title": {"type": "string", "description": "title"},
    }
    schema = g.build_top_level_schema(feats, obj)

    paper_items = schema["properties"]["paper"]["items"]
    assert set(paper_items["required"]) == {"property", "parties", "paper_title"}
    _assert_strict_mode_valid(schema)


def test_scalar_leaves_are_nullable_so_model_can_say_not_reported():
    # Regression for the fabricated-number bug: a feature that doesn't apply must
    # be answerable with null, not an invented value. Strict mode keeps the key
    # required, so nullability is expressed via a [<type>, "null"] union.
    feats = ["effect_size_d", "source", "design"]
    obj = {
        "effect_size_d": {"type": "number", "description": "Cohen's d"},
        "source": {"type": "string", "description": "quote or 'not applicable'"},
        "design": {
            "type": "string",
            "description": "pick one",
            "enum": ["RCT", "Cohort"],
        },
    }
    schema = g.build_top_level_schema(feats, obj)
    props = schema["properties"]

    # Scalar value leaves accept null...
    assert props["effect_size_d"]["type"] == ["number", "null"]
    assert props["source"]["type"] == ["string", "null"]
    # ...enums gain null as a member too.
    assert None in props["design"]["enum"]
    # ...but the keys are still required (strict mode).
    assert set(schema["required"]) == {"effect_size_d", "source", "design"}


def test_containers_are_not_made_nullable(monkeypatch):
    # Object/array structural nodes must stay non-nullable (an empty array/object
    # already expresses "nothing here"); only scalar leaves become nullable.
    class _Q:
        def run(self):
            return None

    class _Field:
        def __eq__(self, other):
            return ("eq", other)

    monkeypatch.setattr(
        g,
        "Features",
        type(
            "F",
            (),
            {
                "find_one": staticmethod(lambda *a, **k: _Q()),
                "feature_identifier": _Field(),
            },
        ),
    )

    feats = sorted(["paper.n", "paper.title"], key=lambda s: s.count("."))
    obj = {
        "paper.n": {"type": "number", "description": "n"},
        "paper.title": {"type": "string", "description": "t"},
    }
    schema = g.build_top_level_schema(feats, obj)
    paper = schema["properties"]["paper"]
    assert paper["type"] == "array"  # not ["array", "null"]
    assert paper["items"]["type"] == "object"  # not nullable
    assert paper["items"]["properties"]["n"]["type"] == ["number", "null"]
