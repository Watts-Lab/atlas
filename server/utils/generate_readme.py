import os
import importlib

FEATURES = [
    "condition.condition_name",
    "condition.condition_description",
    # Add other features as needed
]


def load_feature(module_path):
    module = importlib.import_module(module_path)
    return module.Feature


def generate_readme():
    readme_content = "# Conditions Features\n\n"
    readme_content += "This document provides an overview of the features in the conditions module.\n\n"

    for feature_path in FEATURES:
        FeatureClass = load_feature(feature_path)
        feature_instance = FeatureClass()
        readme_content += f"## {FeatureClass.__name__}\n"
        readme_content += f"{FeatureClass.__doc__}\n\n"
        readme_content += f"### Details:\n"
        readme_content += f"**Condition Name:** {getattr(feature_instance, 'condition_name', 'N/A')}\n\n"
        readme_content += f"**Condition Details:** {getattr(feature_instance, 'condition_details', 'N/A')}\n\n"
        readme_content += f"**Condition Type:** {getattr(feature_instance, 'condition_type', 'N/A')}\n\n"
        readme_content += f"**Condition Message:** {getattr(feature_instance, 'condition_message', 'N/A')}\n\n"

    return readme_content


def save_readme(content, file_path):
    with open(file_path, "w") as file:
        file.write(content)


def main():
    readme_content = generate_readme()
    readme_path = os.path.join(os.path.dirname(__file__), "condition", "README.md")
    save_readme(readme_content, readme_path)
    print("README.md has been generated and saved.")


if __name__ == "__main__":
    main()
