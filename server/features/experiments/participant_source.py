"""
Participant source feature. This feature is responsible
for indicating where the participants of the experiment come from.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Participant source feature. This feature is responsible for
    indicating where the participants of the experiment come from.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "participant_source"
        feature_type = "string"
        feature_prompt = (
            "Where do participants come from? "
            "Provide a brief description of the participant source, such as mTurk, Prolific, students, retail workers, etc. "
            "Try to use just a few words to describe this. "
            "If it is an online panel, please write the name of the source: mTurk, Prolific, etc."
        )
        feature_enum = None
        feature_description = "Where do participants come from? mTurk, Prolific, students, retail workers, etc. Try to use just a few words to describe this. If it is an online panel, please write the name of the source: mTurk, Prolific, etc."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
