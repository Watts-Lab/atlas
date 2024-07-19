"""
Units analyzed feature. This feature is responsible
for indicating what units were analyzed in the experiment.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Units analyzed feature. This feature is responsible for
    indicating what units were analyzed in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "units_analyzed"
        feature_type = "string"
        feature_prompt = (
            "What units were analyzed in the experiment? "
            "Describe briefly what was analyzed. This may be the same as what was randomized (often, individual participants) "
            "but it may be a lower-level unit. For instance, restaurants may be the unit of randomization but orders placed might be the unit of analysis. "
            "Or schools may be the unit of randomization but students might be the unit of analysis."
        )
        feature_enum = None
        feature_description = "What was analyzed in the experiment? This may be the same as what was randomized (often, individual participants) but it may be a lower-level unit."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
