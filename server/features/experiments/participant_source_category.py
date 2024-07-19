"""
Participant source category feature. This feature is responsible
for categorizing the source of the participants in the experiment.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Participant source category feature. This feature is responsible for
    categorizing the source of the participants in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "participant_source_category"
        feature_type = "string"
        feature_prompt = (
            "Where do participants come from? "
            "Pick one category from the following list: "
            "online panel, university students, high school or younger students, executive students, customers, employees, public or community, other."
        )
        feature_enum = [
            "online panel",
            "university students",
            "high school or younger students",
            "executive students",
            "customers",
            "employees",
            "public or community",
            "other",
        ]
        feature_description = "Where do participants come from."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
