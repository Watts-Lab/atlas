"""
Experiment name feature. This feature is responsible
for returning the name of the experiment.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Experiment name feature. This feature is responsible for
    returning the name of the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "name"
        feature_type = "string"
        feature_prompt = (
            "Provide the name of the experiment. "
            "Author's words: Use the name mentioned by the authors in the paper. "
            "If the name is not clear or not provided, use a concise and descriptive name based on the details of the experiment."
        )
        feature_enum = None
        feature_description = "Name of the experiment."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
