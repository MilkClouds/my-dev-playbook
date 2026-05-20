# HPC Node Setup

Run these steps after [common.md](common.md) on cluster nodes.

## Aliases

Add the following to `.zshrc`.

`docker-gpu` mounts the current directory as `/workspace` and passes all GPUs through. `docker-gpu-network` adds host networking for when containers need to talk to services on the host (e.g., Jupyter, TensorBoard).

`SINGLE_GPU` and `MULTI_GPU` are arrays of srun args for the most common job shapes on our cluster (1-GPU with 16 CPUs / 128G, or 8-GPU with 16 CPUs-per-GPU / 1TB). `squeue_` is a wide-format squeue that shows GPU allocation (TRES column) without truncation.

```bash
# Docker GPU containers
gpu_args="--gpus all --ipc=host"
alias docker-gpu="docker run $gpu_args -it --rm -v .:/workspace --workdir /workspace"
alias docker-gpu-network="docker run $gpu_args --network=host -it --rm -v .:/workspace --workdir /workspace"
alias docker-ubuntu="docker run -it --rm -v .:/workspace -w /workspace ubuntu:latest"

# Slurm
export SINGLE_GPU=(--nodes 1 --gpus 1 --cpus-per-gpu 16 --mem 128G)
export MULTI_GPU=(--nodes 1 --gpus 8 --cpus-per-gpu 16 --mem 1024G)
alias squeue_="squeue -O JobID:10,Partition:12,NAME:36,USERNAME:10,STATE:10,TRES:50,TimeUsed:12,TimeLimit:14,ReqNodes,NodeList,Reason:50"
# squeue_ --me / squeue_ -w {node} / squeue_ -u {user}
```

## smon

Install [smon](https://github.com/MilkClouds/smon), a custom Slurm cluster monitoring TUI. Shows GPU/CPU/memory allocation across all nodes at a glance, with job-level drill-down. Use this instead of `squeue_` when you need the full cluster picture.

## VS Code Remote-SSH

Cluster nodes share `~` over NFS, so they share one `~/.vscode-server`. When the VS Code client updates, every node races to migrate that folder to the new server version at once — the concurrent writes corrupt it and Remote-SSH breaks (`Refused to connect to unsupported server`, dropped connections, runaway `command-shell` processes).

Redirect the folder to node-local disk. The symlink lives on the shared home, but its target is an absolute path, so each node resolves it to its own `/var/tmp`.

```bash
rm -rf ~/.vscode-server   # run once from any node
ln -s /var/tmp/vscode-server-$USER ~/.vscode-server
```

VS Code recreates the target on first connect. `/var/tmp` is node-local and reboot-persistent; the OS may prune it after ~30 days idle, costing one re-download. Close all VS Code windows before running this, or an active client will recreate `~/.vscode-server` as a real directory.
