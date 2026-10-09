"""Install the native direction-preset extension onto compatible hass_dyson."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest() if text is not None else None


def apply_diff(text, diff):
    original = text.splitlines(keepends=True) if text is not None else []
    output = []
    cursor = 0
    index = 0
    lines = diff.splitlines(keepends=True)
    while index < len(lines):
        match = re.match(r"@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@", lines[index])
        if not match:
            index += 1
            continue
        start = max(0, int(match[1]) - 1)
        if start < cursor:
            raise ValueError("Overlapping patch hunks")
        output.extend(original[cursor:start])
        cursor = start
        index += 1
        while index < len(lines) and not lines[index].startswith("@@"):
            line = lines[index]
            marker, content = line[0], line[1:]
            if marker in " -":
                if cursor >= len(original) or original[cursor] != content:
                    raise ValueError("Patch context does not match")
                cursor += 1
            if marker in " +":
                output.append(content)
            index += 1
    output.extend(original[cursor:])
    return "".join(output)


def install(target, check=False):
    package = Path(__file__).resolve().parent
    compatibility = json.loads((package / "compatibility.json").read_text())
    manifest = json.loads((target / "manifest.json").read_text())
    if manifest.get("domain") != "hass_dyson" or manifest.get("version") != compatibility["integration_version"]:
        raise ValueError("This extension requires hass_dyson 0.38.0")
    current = {name: (target / name).read_text() if (target / name).exists() else None for name in compatibility["files"]}
    if all(digest(current[name]) == hashes["after"] for name, hashes in compatibility["files"].items()):
        print("Native direction presets are already installed")
        return
    for name, hashes in compatibility["files"].items():
        if digest(current[name]) != hashes["before"]:
            raise ValueError(f"Unsupported or modified integration file: {name}; nothing written")
    output = {}
    for section in (package / "direction-presets.patch").read_text().split("--- ")[1:]:
        name = section.splitlines()[1].removeprefix("+++ b/")
        if name not in current:
            raise ValueError("Unexpected patch target")
        output[name] = apply_diff(current[name], section)
        if digest(output[name]) != compatibility["files"][name]["after"]:
            raise ValueError(f"Patched checksum mismatch: {name}")
        if name.endswith(".py"):
            compile(output[name], name, "exec")
    if set(output) != set(current):
        raise ValueError("Incomplete extension patch")
    if check:
        print("Compatible: patch applies cleanly; all checksums and Python syntax pass")
        return
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    backup = target.parent.parent / "dyson-direction-preset-backups" / stamp
    backup.mkdir(parents=True)
    for name, text in current.items():
        if text is not None:
            (backup / name).write_bytes((target / name).read_bytes())
    try:
        for name, text in output.items():
            (target / name).write_text(text)
    except OSError:
        for name, text in current.items():
            if text is None:
                (target / name).unlink(missing_ok=True)
            else:
                (target / name).write_bytes((backup / name).read_bytes())
        raise
    print(f"Installed native direction presets. Backup: {backup}")
    print("Check Home Assistant configuration, then restart Core to load the extension.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("integration", type=Path, help="Path to custom_components/hass_dyson")
    parser.add_argument("--check", action="store_true", help="Validate compatibility without writing files")
    args = parser.parse_args()
    try:
        install(args.integration.resolve(), args.check)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Error: {error}\n")
