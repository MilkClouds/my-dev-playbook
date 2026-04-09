# progress-utils: progress bars for everyday file operations
# https://github.com/MilkClouds/progress-utils
#
# Dependencies: tqdm (pip install tqdm), aria2c, rsync
# Platform: GNU/Linux (du -sb, tar auto-detection)
#
# Set PU_COUNT=1 to pre-scan file/byte counts for percentage and ETA.
# Works with rm_ and tar_. Example:
#   PU_COUNT=1 rm_ huge_dir/
#   export PU_COUNT=1  # enable for entire session

# --- Dependency check ---
for _pu_cmd in tqdm aria2c rsync; do
    command -v "$_pu_cmd" &>/dev/null || echo "[progress-utils] missing: $_pu_cmd" >&2
done
unset _pu_cmd

# --- Helpers ---
if command -v tqdm &>/dev/null; then
    _pu_python="$(head -1 "$(command -v tqdm)" | sed 's/^#!//')"
fi
_pu_tqdm() {
    "${_pu_python:-python3}" -c "import signal,sys;signal.signal(2,lambda*_:sys.exit(0));from tqdm.cli import main;main()" "$@"
}

# --- Aliases ---
alias wget_="aria2c -s 16 -x 16"
alias cp_='rsync -a --partial --info=progress2'

# --- Functions ---

mv_() {
    (( $# < 2 )) && { echo "mv_: need at least one source and a destination" >&2; return 1; }
    local dest="${@: -1}"
    local n=$(( $# - 1 ))
    local src stripped
    local real_srcs=()
    for src in "${@:1:$n}"; do
        stripped="${src%/}"
        # Symlinks: fall back to GNU mv. rsync with a trailing-slash'd symlink
        # dereferences into the target directory, which would move (and then
        # unlink) the files inside the link's target — very much not what mv does.
        if [ -L "$stripped" ]; then
            mv -- "$stripped" "$dest" || return $?
        else
            real_srcs+=("$stripped")
        fi
    done
    if (( ${#real_srcs[@]} > 0 )); then
        rsync -a --partial --info=progress2 --remove-source-files "${real_srcs[@]}" "$dest"
        for src in "${real_srcs[@]}"; do
            [ -d "$src" ] && find "$src" -depth -type d -empty -delete 2>/dev/null
        done
    fi
}

rm_() {
    local target stripped rc
    for target in "$@"; do
        stripped="${target%/}"
        [ -e "$stripped" ] || [ -L "$stripped" ] || continue
        # Symlinks: just unlink the link itself, never descend into the target.
        # `find symlink/ -delete` would follow the link (POSIX trailing-slash
        # rule) and delete files inside the symlink's target directory.
        if [ -L "$stripped" ]; then
            rm -- "$stripped" || return $?
            continue
        fi
        local tqdm_args=(--desc "Deleting $stripped" --unit files)
        [[ -n "$PU_COUNT" ]] && tqdm_args+=(--total "$(find "$stripped" | _pu_tqdm --desc "Counting $stripped" --unit files 2>/dev/tty | wc -l)")
        # rm -rf uses FTS_PHYSICAL, so it never follows symlinks regardless of
        # trailing slash or internal links. Output format is locale-dependent,
        # so pin LC_ALL=C for reproducibility (tqdm only counts lines either way).
        LC_ALL=C rm -rfv -- "$stripped" | _pu_tqdm "${tqdm_args[@]}" > /dev/null
        rc=${pipestatus[1]}
        [ "$rc" -ne 0 ] && return "$rc"
    done
}

# tar_ dir [outfile]
#   Default outfile: dir.tar.gz
tar_() {
    local dir="$1"
    local outfile="${2:-$dir.tar.gz}"

    if [[ -n "$PU_COUNT" ]]; then
        local bytes
        bytes="$(du -sb "$dir" | cut -f1)"
        tar -cf - "$dir" \
            | _pu_tqdm --bytes --total "$bytes" --desc Processing \
            | gzip \
            | _pu_tqdm --bytes --desc Compressed --position 1 \
            > "$outfile"
    else
        tar -cf - "$dir" \
            | _pu_tqdm --bytes --desc Processing \
            | gzip \
            | _pu_tqdm --bytes --desc Compressed --position 1 \
            > "$outfile"
    fi
}

# untar_ archive [outdir]
#   Default outdir: current directory
untar_() {
    local infile="$1"
    local outdir="${2:-.}"
    local bytes
    bytes="$(du -sb "$infile" | cut -f1)"
    mkdir -p "$outdir"

    local tar_flags=(-xf - -C "$outdir")
    case "$infile" in
        *.tar.gz|*.tgz)    tar_flags+=(-z) ;;
        *.tar.bz2|*.tbz2)  tar_flags+=(-j) ;;
        *.tar.xz|*.txz)    tar_flags+=(-J) ;;
        *.tar.zst|*.tzst)  tar_flags+=(--zstd) ;;
    esac

    _pu_tqdm --bytes --total "$bytes" --desc Extracting < "$infile" \
        | tar "${tar_flags[@]}"
}
