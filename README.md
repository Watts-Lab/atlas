# Research Atlas

## Introduction

The data is a common storage of all research cartography results. However, an approximate abstraction is a large table with a row for each paper (ever) and a column for each property we might use to differentiate papers. In essence, this is a system for reliably desegregating pieces of research through a systematic process of adding columns.

## Concepts
### Features
Features are properties of a research effort that we want to document, e.g., `title`, `authors`, `N` of experiments, `effect_size` of each condition etc.
#### Parents
Parents frame the unit of analysis for a feature, for example, "`effect_size` of each condition" has the parent `condition`, because each condition has a result for this feature. Similarly, `condition` has the parent `experiment`. The highest parent at this point is paper. We also sometimes call these scopes.
### Projects — coming soon
Projects are built from a bundle of features and papers (or a rule for including papers). 
#### Inclusion criteria
Effectively a saved search that returns papers. The papers can then be added to a project individually, as a group. Updates to the results of the search instigate notifications to inform the user.
### Papers — more coming soon
### Users — more coming soon

## Contributing
Please submit a PR improving Atlas or adding new feature columns.
