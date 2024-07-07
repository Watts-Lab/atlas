"""
Condition type feature. This feature is responsible 
for returning the name of the conditions in the experiment.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Condition type feature. This feature is responsible for
    returning the name of the conditions in the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "type"
        feature_type = "string"
        feature_prompt = (
            "Is the condition considered a control or treatment in the original source? "
            "If there is no control, just call all of them treatment. "
            "If a control, specify:  "
            "- do-nothing control (e.g. no email sent) "
            "- plain vanilla control (e.g., the researcher took the treatment email and stripped out all "
            "interventions from it, making it a plain control email; it is created for the research and intended to be bland) "
            "- business as usual control (e.g., the email the organization was historically sending) "
            "- business as usual do-nothing control (e.g., the organization historically did nothing)"
        )
        feature_enum = [
            "treatment",
            "do nothing control",
            "plain vanilla control",
            "business as usual control",
            "business as usual do-nothing control",
        ]
        feature_description = "The type of the condition."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
