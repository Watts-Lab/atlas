"""
Sample size notes feature. This feature is responsible
for providing additional notes or explanations about the sample size.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Sample size notes feature. This feature is responsible for
    providing additional notes or explanations about the sample size.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "sample_size_notes"
        feature_type = "string"
        feature_prompt = (
            "If anything was confusing or complicated about the sample size, please explain here. "
            "Otherwise, write 'NA'."
        )
        feature_enum = None
        feature_description = "If anything was confusing or complicated about the sample size, please explain here. Otherwise, write 'NA'."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
