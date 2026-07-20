// Git publishing: stage data, commit, rebase onto remote, push.
// Devices only write web/data/<device>/, so commits never conflict in content;
// `pull --rebase` cleanly replays this device's commit on top of others'.
import { spawnSync } from "node:child_process";
import { relative } from "node:path";
import { DATA_DIR, REPO_ROOT } from "./config.mjs";
import { stamp } from "./util.mjs";

/** Run a git command in the repo; returns { status, stdout }. */
function git(args) {
  const res = spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return { status: res.status, stdout: (res.stdout || "").trim() };
}

/**
 * Commit the device's data and optionally push it.
 * @param {string} device - device name (used in the commit message)
 * @param {boolean} doPush - push to the remote after committing
 */
export function publish(device, doPush) {
  if (git(["rev-parse", "--show-toplevel"]).status !== 0) {
    console.log("==> not a git repo; skipping commit.");
    return;
  }

  const dataRel = relative(REPO_ROOT, DATA_DIR).split("\\").join("/");
  git(["add", dataRel]);

  // Nothing staged means no data changed.
  if (git(["diff", "--cached", "--quiet"]).status === 0) {
    console.log("==> No data changes to commit.");
    return;
  }

  git(["commit", "-m", `data: update ${device} token usage (${stamp()})`]);
  console.log("==> Committed.");

  if (!doPush) {
    console.log("==> (not pushed)");
    return;
  }

  // Sync with remote first so a stale local branch replays cleanly.
  if (git(["pull", "--rebase"]).status !== 0) {
    console.log("==> pull --rebase failed; resolve manually then run: git push");
    return;
  }

  const pushed = git(["push"]).status === 0;
  console.log(pushed ? "==> Pushed." : "==> Push failed (commit is saved locally).");
}
