#!/usr/bin/env python3
"""Regenerates the '## Project structure' section in README.md as a tree."""
import re
import subprocess
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
README = PROJECT_DIR / 'README.md'

EXCLUDE_FIND = [
    '*/node_modules/*', '*/.git/*', '*/generated/*',
    '*/migrations/*', '*/dist/*', '*/build/*',
]
# Drop directory entries whose name matches these (even though find shows the dir itself)
EXCLUDE_NAMES = {
    'node_modules', '.git', 'generated', 'migrations', 'dist', 'build',
}
# Drop individual files by name
EXCLUDE_FILES = {'package-lock.json', '.env', '.env.local', '.gitkeep'}


def collect_entries():
    args = ['find', str(PROJECT_DIR), '-maxdepth', '4']
    for pat in EXCLUDE_FIND:
        args += ['-not', '-path', pat]
    result = subprocess.run(args, capture_output=True, text=True)

    entries = []
    for line in sorted(result.stdout.strip().split('\n')):
        line = line.strip()
        if not line or line == str(PROJECT_DIR):
            continue
        p = Path(line)
        try:
            rel = str(p.relative_to(PROJECT_DIR))
            parts = Path(rel).parts
            if any(part in EXCLUDE_NAMES for part in parts):
                continue
            if parts[-1] in EXCLUDE_FILES:
                continue
            entries.append((rel, p.is_dir()))
        except ValueError:
            pass
    return entries


def build_tree(entries):
    """Build a nested dict: name → {'_is_dir': bool, '_children': dict}."""
    root = {}
    for rel, is_dir in entries:
        parts = Path(rel).parts
        node = root
        for i, part in enumerate(parts):
            is_last = i == len(parts) - 1
            if part not in node:
                node[part] = {'_is_dir': (not is_last) or is_dir, '_children': {}}
            node = node[part]['_children']
    return root


def render_tree(node, prefix=''):
    lines = []
    # Directories first, then files; alphabetical within each group
    entries = sorted(node.keys(), key=lambda n: (not node[n]['_is_dir'], n.lower()))
    for i, name in enumerate(entries):
        is_last = i == len(entries) - 1
        connector = '└── ' if is_last else '├── '
        extension = '    ' if is_last else '│   '
        item = node[name]
        suffix = '/' if item['_is_dir'] else ''
        lines.append(f'{prefix}{connector}{name}{suffix}')
        if item['_children']:
            lines.extend(render_tree(item['_children'], prefix + extension))
    return lines


entries = collect_entries()
tree_dict = build_tree(entries)
tree_str = '\n'.join(render_tree(tree_dict))

content = README.read_text()
new_block = f'## Project structure\n\n```\n{tree_str}\n```\n'
content = re.sub(
    r'## Project structure\n.*?(?=\n## |\Z)',
    new_block,
    content,
    flags=re.DOTALL,
)
README.write_text(content)
print('README.md structure updated.')
