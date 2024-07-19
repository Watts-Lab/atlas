"""
Units randomized feature. This feature is responsible
for indicating what units were randomized in the experiment.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Units randomized feature. This feature is responsible for
    indicating what units were randomized in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "units_randomized"
        feature_type = "string"
        feature_prompt = (
            "What units were randomized in the experiment? "
            "Describe briefly what was randomized, such as individuals, teams, groups, schools, etc."
        )
        feature_enum = None
        feature_description = "What was randomized in the experiment? individuals, teams, groups, schools, etc."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
