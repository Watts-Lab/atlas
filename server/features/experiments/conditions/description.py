"""
Condition description feature. This feature is responsible 
for returning the name of the conditions in the experiment.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Condition description feature. This feature is responsible for
    returning the name of the conditions in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "description"
        feature_type = "string"
        feature_prompt = (
            "Describe each condition in greater detail. "
            "Author's words: If the authors have a clear description of each condition in the paper itself, "
            "you can copy it here instead of paraphrasing. If their description is not clear enough on its own, or is very verbose, please paraphrase here. "
            'DO NOT mention specific "nudge" or "choice architecture" concepts here. If the authors do, and you are quoting them, paraphrase over those using brackets [xx]. '
            'Specific vocabulary words naming techniques or concepts should appear under "condition_nudge". '
        )
        feature_enum = None
        feature_description = "The description of the condition."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
