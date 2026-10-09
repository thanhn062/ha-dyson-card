"""Test companion installation against an upstream hass_dyson ZIP."""

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile


package = Path(__file__).resolve().parent
files = json.loads((package / "compatibility.json").read_text())["files"]


def run(target, *arguments, success=True):
    result = subprocess.run([sys.executable, str(package / "install.py"), str(target), *arguments], capture_output=True, text=True)
    assert (result.returncode == 0) == success, result.stdout + result.stderr
    return result


def snapshot(target):
    return {file.name: file.read_bytes() for file in target.iterdir()}


with tempfile.TemporaryDirectory() as directory:
    target = Path(directory) / "custom_components/hass_dyson"
    target.mkdir(parents=True)
    with zipfile.ZipFile(sys.argv[1]) as archive:
        for name in [*files, "manifest.json"]:
            if name in archive.namelist():
                (target / name).write_bytes(archive.read(name))
    original = snapshot(target)
    run(target, "--check")
    assert snapshot(target) == original
    assert not (target.parent.parent / "dyson-direction-preset-backups").exists()
    run(target)
    patched = snapshot(target)
    backups = list((target.parent.parent / "dyson-direction-preset-backups").iterdir())
    assert len(backups) == 1
    assert snapshot(backups[0]) == {name: content for name, content in original.items() if name in files}
    subprocess.run([sys.executable, str(package / "test_direction_presets.py"), str(target)], check=True)
    run(target)
    assert snapshot(target) == patched
    assert len(list(backups[0].parent.iterdir())) == 1
    (target / "select.py").write_text("# other customization\n" + (target / "select.py").read_text())
    modified = snapshot(target)
    run(target, success=False)
    assert snapshot(target) == modified
    manifest = json.loads((target / "manifest.json").read_text())
    manifest["version"] = "99.0.0"
    (target / "manifest.json").write_text(json.dumps(manifest))
    modified = snapshot(target)
    run(target, success=False)
    assert snapshot(target) == modified

print("PASS: dry run, install, exact backups, idempotence, modified-file and unsupported-version guards")
