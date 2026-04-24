"""
Krippendorff's Alpha - Enhanced Implementation with Utilities

This module provides a complete implementation of Krippendorff's alpha reliability
coefficient with additional utilities for practical use.
"""

import numpy as np
import pandas as pd
from typing import Union, Literal, Optional, Tuple
from dataclasses import dataclass


@dataclass
class AlphaResult:
    """Container for Krippendorff's alpha results"""

    alpha: float
    metric: str
    n_observers: int
    n_units: int
    n_pairable_values: int
    observed_disagreement: float
    expected_disagreement: float

    def __str__(self):
        return (
            f"Krippendorff's Alpha Results\n"
            f"{'='*50}\n"
            f"Alpha (α):              {self.alpha:.4f}\n"
            f"Metric:                 {self.metric}\n"
            f"Number of observers:    {self.n_observers}\n"
            f"Number of units:        {self.n_units}\n"
            f"Pairable values:        {self.n_pairable_values}\n"
            f"Observed disagreement:  {self.observed_disagreement:.4f}\n"
            f"Expected disagreement:  {self.expected_disagreement:.4f}\n"
            f"{'='*50}"
        )

    def interpret(self) -> str:
        """Provide interpretation of alpha value"""
        if self.alpha >= 0.8:
            return "Excellent reliability"
        elif self.alpha >= 0.667:
            return "Good reliability (tentative conclusions possible)"
        elif self.alpha >= 0.5:
            return "Moderate reliability (use with caution)"
        else:
            return "Poor reliability (not recommended for use)"


def krippendorff_alpha(
    data: Union[np.ndarray, pd.DataFrame],
    metric: Literal[
        "nominal", "ordinal", "interval", "ratio", "circular", "bipolar"
    ] = "interval",
    circumference: Optional[float] = None,
    value_range: Optional[Tuple[float, float]] = None,
    return_detailed: bool = False,
) -> Union[float, AlphaResult]:
    """
    Compute Krippendorff's alpha reliability coefficient.

    Krippendorff's alpha is a reliability coefficient that measures agreement among
    observers, coders, judges, or measuring instruments. It can handle:
    - Any number of observers (not just 2)
    - Any number of categories or values
    - Different levels of measurement (nominal, ordinal, interval, ratio, etc.)
    - Missing data
    - Any sample size

    Parameters
    ----------
    data : np.ndarray or pd.DataFrame
        Reliability data matrix of shape (observers, units).
        Each row represents an observer, each column a unit being rated.
        Missing values should be np.nan or None.

    metric : str, default='interval'
        The level of measurement or metric for computing differences:
        - 'nominal': Categories with no ordering (e.g., colors, names)
        - 'ordinal': Ordered categories (e.g., Likert scales, rankings)
        - 'interval': Numeric values with equal intervals (e.g., temperature in Celsius)
        - 'ratio': Numeric values with true zero (e.g., weight, length)
        - 'circular': Values on a circular scale (e.g., hours, angles)
        - 'bipolar': Values with meaningful endpoints (e.g., -2 to +2 scale)

    circumference : float, optional
        For 'circular' metric only: the number of equal intervals on the circle.
        E.g., for hours: 24, for degrees: 360, for radians: 2π

    value_range : tuple of (float, float), optional
        For 'bipolar' metric only: (minimum, maximum) values of the scale.

    return_detailed : bool, default=False
        If True, returns AlphaResult object with additional statistics.
        If False, returns only the alpha coefficient as a float.

    Returns
    -------
    float or AlphaResult
        If return_detailed=False: The alpha coefficient (float)
        If return_detailed=True: AlphaResult object with detailed statistics

        Alpha interpretation:
        - α = 1.0: Perfect reliability
        - α ≥ 0.8: Good reliability, acceptable for most purposes
        - α ≥ 0.667: Tentative conclusions possible
        - α < 0.667: Not reliable enough for definitive conclusions
        - α = 0.0: Absence of reliability (agreement by chance)
        - α < 0.0: Systematic disagreement (worse than chance)

    Examples
    --------
    >>> # Simple example with two raters
    >>> data = np.array([[1, 2, 3, 3, 2],
    ...                   [1, 2, 3, 3, 3]])
    >>> alpha = krippendorff_alpha(data, metric='nominal')
    >>> print(f"Alpha: {alpha:.3f}")

    >>> # Example with missing data
    >>> data = np.array([[1, 2, np.nan, 3],
    ...                   [1, 2, 3, 3],
    ...                   [np.nan, 2, 3, 4]])
    >>> result = krippendorff_alpha(data, metric='interval', return_detailed=True)
    >>> print(result)

    References
    ----------
    Krippendorff, K. (2013). Content Analysis: An Introduction to Its Methodology (3rd ed.).
    Thousand Oaks, CA: Sage Publications.

    Krippendorff, K. (2004). Reliability in Content Analysis: Some Common Misconceptions
    and Recommendations. Human Communication Research, 30(3), 411-433.
    """

    # Convert DataFrame to numpy array if needed
    if isinstance(data, pd.DataFrame):
        data = data.values

    print(
        "version 1.0.0 - Initial implementation of Krippendorff's alpha with enhanced features"
    )
    # Handle categorical/string data by converting to numeric codes
    is_categorical = False
    value_map = None

    # Check if data contains non-numeric values
    if data.dtype == object or data.dtype.kind in ["U", "S", "O"]:
        is_categorical = True
        # Get unique non-NaN values, handling mixed types carefully
        unique_vals = set()
        for val in data.flatten():
            # Skip None, NaN, and missing values
            if val is None:
                continue
            if isinstance(val, float) and np.isnan(val):
                continue
            unique_vals.add(val)

        unique_vals = sorted(list(unique_vals))  # Sort for consistent ordering

        # Create mapping from categories to numbers
        value_map = {val: idx for idx, val in enumerate(unique_vals)}

        # Convert to numeric array
        numeric_data = np.full(data.shape, np.nan, dtype=float)
        for i in range(data.shape[0]):
            for j in range(data.shape[1]):
                val = data[i, j]
                # Check if value is valid (not None, not NaN)
                if val is not None and not (isinstance(val, float) and np.isnan(val)):
                    numeric_data[i, j] = value_map[val]
        data = numeric_data
    else:
        # Convert to float array to handle NaN
        data = np.array(data, dtype=float)

    n_observers, n_units = data.shape

    # Get all pairable values (ignoring NaN)
    values_list = []
    unit_values = []

    for unit_idx in range(n_units):
        unit_column = data[:, unit_idx]
        # Get non-missing values for this unit
        valid_values = unit_column[~np.isnan(unit_column)]

        if len(valid_values) >= 2:  # Only units with 2+ values can be paired
            values_list.extend(valid_values)
            unit_values.append(valid_values)

    if len(values_list) == 0:
        return np.nan if not return_detailed else None

    n_total = len(values_list)

    # Get unique values
    unique_values = np.unique(values_list)

    # Get difference function
    delta_squared = _get_difference_function(
        unique_values, metric, circumference, value_range, values_list
    )

    # Compute observed disagreement (Do)
    Do = 0.0
    for unit_vals in unit_values:
        m_u = len(unit_vals)
        if m_u >= 2:
            for i, c in enumerate(unit_vals):
                for j, k in enumerate(unit_vals):
                    if i != j:
                        c_idx = np.where(unique_values == c)[0][0]
                        k_idx = np.where(unique_values == k)[0][0]
                        Do += delta_squared[c_idx, k_idx] / (m_u - 1)

    Do = Do / n_total

    # Compute n_c (frequency of each value)
    n_c = np.array([values_list.count(v) for v in unique_values])

    # Compute expected disagreement (De)
    De = 0.0
    for c_idx in range(len(unique_values)):
        for k_idx in range(len(unique_values)):
            De += n_c[c_idx] * n_c[k_idx] * delta_squared[c_idx, k_idx]

    De = De / (n_total * (n_total - 1))

    # Compute alpha
    if De == 0:
        alpha = 1.0 if Do == 0 else np.nan
    else:
        alpha = 1 - (Do / De)

    if return_detailed:
        return AlphaResult(
            alpha=alpha,
            metric=metric,
            n_observers=n_observers,
            n_units=n_units,
            n_pairable_values=n_total,
            observed_disagreement=Do,
            expected_disagreement=De,
        )
    else:
        return alpha


def _get_difference_function(
    values: np.ndarray,
    metric: str,
    circumference: Optional[float],
    value_range: Optional[Tuple[float, float]],
    all_values: list,
) -> np.ndarray:
    """
    Compute the squared difference matrix for given metric.

    Returns a matrix where delta_squared[i,j] = δ²(values[i], values[j])
    """
    n = len(values)
    delta_squared = np.zeros((n, n))

    if metric == "nominal":
        # Nominal: 0 if same, 1 if different
        for i in range(n):
            for j in range(n):
                delta_squared[i, j] = 0.0 if values[i] == values[j] else 1.0

    elif metric == "ordinal":
        # Ordinal: based on cumulative frequencies
        # δ²(c,k) = (Σ(g from c+1 to k) n_g)²
        n_g = np.array([all_values.count(v) for v in values])

        for i in range(n):
            for j in range(n):
                if i == j:
                    delta_squared[i, j] = 0.0
                else:
                    start = min(i, j)
                    end = max(i, j)
                    sum_between = sum(n_g[start + 1 : end + 1])
                    delta_squared[i, j] = sum_between**2

    elif metric == "interval":
        # Interval: (c - k)²
        for i in range(n):
            for j in range(n):
                delta_squared[i, j] = (values[i] - values[j]) ** 2

    elif metric == "ratio":
        # Ratio: ((c - k) / (c + k))²
        for i in range(n):
            for j in range(n):
                if values[i] + values[j] != 0:
                    delta_squared[i, j] = (
                        (values[i] - values[j]) / (values[i] + values[j])
                    ) ** 2
                else:
                    delta_squared[i, j] = 0.0

    elif metric == "circular":
        # Circular: (sin(π * |c - k| / U))²
        if circumference is None:
            raise ValueError("Circumference (U) must be specified for circular metric")
        for i in range(n):
            for j in range(n):
                delta_squared[i, j] = (
                    np.sin(np.pi * abs(values[i] - values[j]) / circumference) ** 2
                )

    elif metric == "bipolar":
        # Bipolar: ((c - k)² / ((c + k - 2*cmin) * (2*cmax - c - k)))
        if value_range is None:
            raise ValueError(
                "Value range (cmin, cmax) must be specified for bipolar metric"
            )
        cmin, cmax = value_range
        for i in range(n):
            for j in range(n):
                c, k = values[i], values[j]
                denominator = (c + k - 2 * cmin) * (2 * cmax - c - k)
                if denominator != 0:
                    delta_squared[i, j] = (c - k) ** 2 / denominator
                else:
                    delta_squared[i, j] = 0.0

    else:
        raise ValueError(f"Unknown metric: {metric}")

    return delta_squared


def bootstrap_confidence_interval(
    data: np.ndarray,
    metric: str = "interval",
    n_bootstrap: int = 1000,
    confidence_level: float = 0.95,
    random_seed: Optional[int] = None,
) -> Tuple[float, float, float]:
    """
    Calculate bootstrap confidence intervals for Krippendorff's alpha.

    Parameters
    ----------
    data : np.ndarray
        Reliability data matrix
    metric : str
        Metric to use
    n_bootstrap : int
        Number of bootstrap samples
    confidence_level : float
        Confidence level (e.g., 0.95 for 95% CI)
    random_seed : int, optional
        Random seed for reproducibility

    Returns
    -------
    tuple of (alpha, lower_bound, upper_bound)
    """
    if random_seed is not None:
        np.random.seed(random_seed)

    # Calculate original alpha
    original_alpha = krippendorff_alpha(data, metric=metric)

    # Bootstrap
    n_observers, n_units = data.shape
    alphas = []

    for _ in range(n_bootstrap):
        # Resample units with replacement
        indices = np.random.choice(n_units, size=n_units, replace=True)
        bootstrap_data = data[:, indices]

        alpha = krippendorff_alpha(bootstrap_data, metric=metric)
        if not np.isnan(alpha):
            alphas.append(alpha)

    # Calculate confidence interval
    alpha_lower = (1 - confidence_level) / 2
    alpha_upper = 1 - alpha_lower

    lower_bound = np.percentile(alphas, alpha_lower * 100)
    upper_bound = np.percentile(alphas, alpha_upper * 100)

    return original_alpha, lower_bound, upper_bound


def visualize_agreement_matrix(
    data: np.ndarray,
    observer_names: Optional[list] = None,
    unit_names: Optional[list] = None,
) -> pd.DataFrame:
    """
    Create a visualization-ready agreement matrix.

    Parameters
    ----------
    data : np.ndarray
        Reliability data matrix
    observer_names : list, optional
        Names for observers
    unit_names : list, optional
        Names for units

    Returns
    -------
    pd.DataFrame
        Agreement matrix with labeled rows and columns
    """
    n_observers, n_units = data.shape

    if observer_names is None:
        observer_names = [f"Observer_{i+1}" for i in range(n_observers)]

    if unit_names is None:
        unit_names = [f"Unit_{i+1}" for i in range(n_units)]

    df = pd.DataFrame(data, index=observer_names, columns=unit_names)
    return df


# Export main functions
__all__ = [
    "krippendorff_alpha",
    "AlphaResult",
    "bootstrap_confidence_interval",
    "visualize_agreement_matrix",
]
