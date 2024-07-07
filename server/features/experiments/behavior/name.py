"""
Condition name feature. This feature is responsible 
for returning the name of the conditions in the experiment.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Condition name feature. This feature is responsible for
    returning the name of the conditions in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "name"
        feature_type = "string"
        feature_prompt = (
            "Give each behavior a one or two word name to describe it. "
            "Author's words: Where possible, use the label the research authors give it. "
            "Look at tables/figures to see their naming conventions for the behavior and use those if they exist. "
        )
        feature_enum = None
        feature_description = "The name of the condition."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
