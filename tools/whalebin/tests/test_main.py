import os
import unittest
from pathlib import Path
from unittest.mock import patch

from whalebin.main import _require_backend


class BackendEnvironmentTest(unittest.TestCase):
    @patch("whalebin.main.shutil.which", return_value="/bin/tool")
    def test_sets_shared_storage_default(self, _which) -> None:
        with patch.dict(os.environ, {}, clear=True), patch.object(Path, "home", return_value=Path("/home/test")):
            _require_backend()
            self.assertEqual(os.environ["CH_IMAGE_STORAGE"], "/home/test/.cache/charliecloud")

    @patch("whalebin.main.shutil.which", return_value="/bin/tool")
    def test_preserves_storage_override(self, _which) -> None:
        with patch.dict(os.environ, {"CH_IMAGE_STORAGE": "/custom"}, clear=True):
            _require_backend()
            self.assertEqual(os.environ["CH_IMAGE_STORAGE"], "/custom")


if __name__ == "__main__":
    unittest.main()
