"""
Experiment description feature. This feature is responsible
for returning the description of the experiment.
"""

from features.gpt_feature import GPTFeature


class Feature(GPTFeature):
    """
    Experiment description feature. This feature is responsible for
    returning the description of the experiment.
    """

    def __init__(self, *args, **kwargs):
        feature_name = "description"
        feature_type = "string"
        feature_prompt = (
            "Describe the experiment in detail. "
            "Author's words: Provide a concise but comprehensive description of the experiment as mentioned by the authors in the paper. "
            "If the description is not clear or is too lengthy, paraphrase it to be more concise and understandable."
        )
        feature_enum = None
        feature_description = "Description of the experiment."
        super().__init__(
            feature_name,
            feature_type,
            feature_prompt,
            feature_enum,
            feature_description,
            *args,
            **kwargs
        )
