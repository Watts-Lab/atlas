"""
Compensation feature. This feature is responsible for indicating 
whether the participants were compensated and describing the compensation.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Compensation feature. This feature is responsible for
    indicating whether the participants were compensated and describing the compensation.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "compensation"
        feature_type = "string"
        feature_prompt = (
            "Were the participants compensated at all? "
            "Often, online participants are paid for their time. Sometimes bonuses or lotteries are used as well. "
            "If they were compensated, please describe the compensation."
        )
        feature_enum = None
        feature_description = "Were the participants compensated at all? Often, online participants are paid for their time. Sometimes bonuses or lotteries are used as well. If they were compensated, please describe the compensation."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
