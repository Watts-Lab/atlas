"""
Sample size analyzed feature. This feature is responsible
for indicating the total sample size at the unit of what was analyzed.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Sample size analyzed feature. This feature is responsible for
    indicating the total sample size at the unit of what was analyzed.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "sample_size_analyzed"
        feature_type = "number"
        feature_prompt = (
            "What is the total sample size, at the unit of what was analyzed? "
            "Provide the total number of units that were analyzed in the experiment. "
            "This should be after any exclusions, if any are mentioned. "
            "If the unit of randomization is the same as the unit of analysis, this will often be the same number as the sample size randomized. "
            "If exclusions were made before analysis, this number may be smaller."
        )
        feature_enum = None
        feature_description = "What is the total sample size, at the unit of what was analyzed? This should be after any exclusions, if any are mentioned. If the unit of randomization = the unit of analysis, this will often be the same number as above. If exclusions were made before analysis, this may be smaller."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
