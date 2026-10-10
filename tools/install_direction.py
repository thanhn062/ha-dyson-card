"""Install the standalone helper without modifying the upstream Dyson integration."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil


def install(config, check=False):
    source = Path(__file__).resolve().parents[1] / "custom_components/dyson_direction"
    destination = config / "custom_components/dyson_direction"
    manifest = json.loads((source / "manifest.json").read_text())
    if manifest.get("domain") != "dyson_direction":
        raise ValueError("Invalid integration package")
    files = [
        p for p in source.rglob("*") if p.is_file() and "__pycache__" not in p.parts
    ]
    for path in files:
        if path.suffix == ".py":
            compile(path.read_text(), str(path), "exec")
    if destination.exists():
        installed = json.loads((destination / "manifest.json").read_text())
        if installed.get("domain") != "dyson_direction":
            raise ValueError("Destination belongs to another integration")
        if all(
            (destination / p.relative_to(source)).is_file()
            and (destination / p.relative_to(source)).read_bytes() == p.read_bytes()
            for p in files
        ):
            print("Standalone Dyson Direction Presets is already installed")
            return
    if check:
        print(
            "Package verified; only custom_components/dyson_direction will be installed"
        )
        return
    if destination.exists():
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        backup = config / "dyson-direction-backups" / stamp
        shutil.copytree(destination, backup)
        print(f"Previous helper backed up to {backup}")
    shutil.copytree(
        source,
        destination,
        dirs_exist_ok=True,
        ignore=shutil.ignore_patterns("__pycache__"),
    )
    print(
        "Installed standalone Dyson Direction Presets; upstream hass_dyson files were not changed"
    )
    print(
        "Check configuration and restart Core, then add Dyson Direction Presets in Devices & services."
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "config", type=Path, help="Home Assistant configuration directory"
    )
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        install(args.config.resolve(), args.check)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Error: {error}\n")
