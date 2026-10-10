"""Installer isolation, backup and idempotence regressions."""

import importlib.util
import json
from pathlib import Path
import tempfile

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "install_direction", root / "tools/install_direction.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def snapshot(root):
    return {
        str(p.relative_to(root)): p.read_bytes() for p in root.rglob("*") if p.is_file()
    }


with tempfile.TemporaryDirectory() as directory:
    config = Path(directory)
    upstream = config / "custom_components/hass_dyson"
    upstream.mkdir(parents=True)
    (upstream / "__init__.py").write_text("# Stock upstream files\n")
    storage = config / ".storage"
    storage.mkdir()
    (storage / "core.config_entries").write_text("Existing configuration\n")
    original = snapshot(config)
    module.install(config, check=True)
    assert snapshot(config) == original
    module.install(config)
    assert snapshot(upstream) == {"__init__.py": b"# Stock upstream files\n"}
    assert snapshot(storage) == {"core.config_entries": b"Existing configuration\n"}
    installed = snapshot(config)
    module.install(config)
    assert snapshot(config) == installed
    helper = config / "custom_components/dyson_direction"
    (helper / "__init__.py").write_text("# Previous helper\n")
    module.install(config)
    backups = list((config / "dyson-direction-backups").iterdir())
    assert len(backups) == 1
    assert (backups[0] / "__init__.py").read_text() == "# Previous helper\n"
    manifest = json.loads((helper / "manifest.json").read_text())
    manifest["domain"] = "another_component"
    (helper / "manifest.json").write_text(json.dumps(manifest))
    installed = snapshot(config)
    try:
        module.install(config)
    except ValueError:
        pass
    else:
        raise AssertionError("Another integration was overwritten")
    assert snapshot(config) == installed

print(
    "PASS: standalone installation leaves upstream/config unchanged; dry run, idempotence, backups and ownership checks"
)
