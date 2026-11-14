import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from whalebin.main import wrapper_content

FAKE_CH_RUN = '#!/usr/bin/env bash\nprintf "%s\\n" "$@"\n'


class WrapperTest(unittest.TestCase):
    """Run a generated wrapper against a fake ch-run that echoes its argv."""

    def setUp(self) -> None:
        # Outside /tmp, which the wrapper leaves to ch-run's default bind.
        self.root = Path(tempfile.mkdtemp(prefix=".whalebin-", dir=Path(__file__).parent)).resolve()
        self.addCleanup(shutil.rmtree, self.root)
        if self.root.is_relative_to("/tmp"):
            self.skipTest("checkout under /tmp; no fixture location outside it")
        self.home = self.root / "home"
        self.outside = self.root / "outside"
        bindir = self.root / "bin"
        for d in (self.home / "repo", self.outside, bindir):
            d.mkdir(parents=True)
        (bindir / "ch-run").write_text(FAKE_CH_RUN)
        (bindir / "ch-run").chmod(0o755)
        self.wrapper = bindir / "tool"
        self.wrapper.write_text(wrapper_content("env", "img:tag", "tool", ["/data:/mnt/data"]))
        self.wrapper.chmod(0o755)
        self.env = {**os.environ, "HOME": str(self.home), "PATH": f"{bindir}:{os.environ['PATH']}"}

    def argv(self, cwd: Path, *args: str) -> list[str]:
        out = subprocess.run([str(self.wrapper), *args], cwd=cwd, env=self.env,
                             capture_output=True, text=True, check=True)
        return out.stdout.splitlines()

    def binds(self, argv: list[str]) -> list[str]:
        return [argv[i + 1] for i, a in enumerate(argv) if a == "--bind"]

    def test_home_is_bound_and_cwd_kept(self) -> None:
        argv = self.argv(self.home / "repo", "a b", "-c")
        self.assertIn("--write-fake", argv)
        self.assertEqual(self.binds(argv), [str(self.home), "/data:/mnt/data"])
        self.assertEqual(argv[argv.index("--cd") + 1], str(self.home / "repo"))
        self.assertEqual(argv[argv.index("--") :], ["--", "tool", "a b", "-c"])

    def test_cwd_outside_home_is_bound(self) -> None:
        argv = self.argv(self.outside)
        self.assertEqual(self.binds(argv), [str(self.home), str(self.outside), "/data:/mnt/data"])

    def test_root_is_not_bound(self) -> None:
        self.assertEqual(self.binds(self.argv(Path("/"))), [str(self.home), "/data:/mnt/data"])

    def test_tmp_is_left_to_ch_run(self) -> None:
        with tempfile.TemporaryDirectory(dir="/tmp") as tmp:
            argv = self.argv(Path(tmp).resolve())
        self.assertEqual(self.binds(argv), [str(self.home), "/data:/mnt/data"])


if __name__ == "__main__":
    unittest.main()
