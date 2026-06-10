def flatten_object(obj, paths_to_collapse=None, current_path=""):
    """
    Flatten a nested dictionary / list structure into a list of flat dictionaries.
    Adapted from the notebook examples for use in the server.
    """
    if paths_to_collapse is None:
        paths_to_collapse = []

    def join_path(p, k):
        return f"{p}.{k}" if p else k

    def prefix_keys(row, prefix):
        """Prefix every key of `row` with `prefix`"""
        return {f"{prefix} {k}": v for k, v in row.items()}

    if isinstance(obj, list):
        result = []
        for item in obj:
            result.extend(flatten_object(item, paths_to_collapse, current_path))
        return result

    if not isinstance(obj, dict):
        return [{"value": obj}]

    rows = [{}]  # start with one empty row

    for key, value in obj.items():
        full_path = join_path(current_path, key)

        if isinstance(value, list):
            if full_path in paths_to_collapse:
                # collapse => one cell with the count
                for r in rows:
                    r[key] = f"{len(value)} {key}"
            else:
                # expand => one row per element
                if len(value) == 0:
                    child_rows = [{}]
                else:
                    child_rows = []
                    for elem in value:
                        child_rows.extend(
                            flatten_object(elem, paths_to_collapse, full_path)
                        )

                new_rows = []
                for r in rows:
                    for cr in child_rows:
                        new_rows.append({**r, **prefix_keys(cr, key)})
                rows = new_rows
            continue

        if isinstance(value, dict):
            child_rows = flatten_object(value, paths_to_collapse, full_path)
            new_rows = []
            for r in rows:
                for cr in child_rows:
                    new_rows.append({**r, **prefix_keys(cr, key)})
            rows = new_rows
            continue

        for r in rows:
            r[key] = value

    return rows
