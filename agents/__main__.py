"""CLI: python -m agents "run demo case" """
from __future__ import annotations

import sys

from agents.pipeline_director import reply_to_message


def main() -> None:
    msg = " ".join(sys.argv[1:]).strip()
    if not msg:
        msg = input("Message: ").strip()
    print(reply_to_message(msg))


if __name__ == "__main__":
    main()
