class BColors:
    """
    A class that defines ANSI escape codes for text colors and styles.
    
    Attributes:
        HEADER (str): ANSI escape code for header color.
        OKBLUE (str): ANSI escape code for OK blue color.
        OKCYAN (str): ANSI escape code for OK cyan color.
        OKGREEN (str): ANSI escape code for OK green color.
        WARNING (str): ANSI escape code for warning color.
        FAIL (str): ANSI escape code for fail color.
        ENDC (str): ANSI escape code to reset text color and style.
        BOLD (str): ANSI escape code for bold text.
        UNDERLINE (str): ANSI escape code for underlined text.
    """
    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKCYAN = "\033[96m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
