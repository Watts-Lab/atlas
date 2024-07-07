"""
Experiments feature module. 
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Experiments feature. This feature is responsible for indicating the experiments in the study.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "experiments"
        feature_type = "object"
        feature_prompt = (
            "Define the experiments in this paper.  "
            "Each experiment should be a separate object with the following properties. "  # This could be moved to where aggregation is done
        )
        feature_enum = None
        feature_description = "The experiments in a paper."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
