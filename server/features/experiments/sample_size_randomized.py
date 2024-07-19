"""
Sample size randomized feature. This feature is responsible
for indicating the total sample size at the unit of what was randomized.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Sample size randomized feature. This feature is responsible for
    indicating the total sample size at the unit of what was randomized.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "sample_size_randomized"
        feature_type = "number"
        feature_prompt = (
            "What is the total sample size, at the unit of what was randomized? "
            "Provide the total number of units that were randomized in the experiment."
        )
        feature_enum = None
        feature_description = (
            "What is the total sample size, at the unit of what was randomized?"
        )
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
