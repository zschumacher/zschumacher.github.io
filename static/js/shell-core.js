(function () {
    const DATA = window.PortfolioShellData;

    function createShell() {
        const state = {
            cwd: [],
            env: { ...DATA.env },
            history: [],
            lines: DATA.initialLines.map(cloneLine),
        };

        const commands = {
            cat: (args) => resolveCat(state, args[0]),
            cd: (args) => resolveCd(state, args[0]),
            clear: () => ({ clear: true, lines: [] }),
            echo: (args) => [["plain", expandVariables(state, args.join(" "))]],
            env: () => renderEnv(state),
            file: (args) => resolveFile(state, args[0]),
            history: () => renderHistory(state),
            ls: (args) => resolveLs(state, args),
            man: (args) => resolveMan(args[0]),
            open: (args) => resolveOpen(state, args[0]),
            printenv: (args) => resolvePrintenv(state, args),
            pwd: () => [["string", getCwdPath(state)]],
            readlink: (args) => resolveReadlink(state, args[0]),
            tree: (args) => resolveTree(state, args[0] || "."),
            uname: (args) => resolveUname(args),
            which: (args) => resolveWhich(args[0], commands),
            whoami: () => [["plain", "Zach Schumacher"]],
        };

        return {
            execute(input) {
                const trimmed = input.trim();
                if (!trimmed) {
                    return { clear: false, lines: [] };
                }

                state.history.push(trimmed);
                const parsed = parseCommand(trimmed);
                const helpOverride = resolveCommandHelp(parsed, commands);

                if (helpOverride) {
                    return normalizeResult(helpOverride);
                }

                const handler = commands[parsed.name];

                if (!handler) {
                    return { clear: false, lines: [["error", `${parsed.name}: command not found`]] };
                }

                const result = handler(parsed.args);
                return normalizeResult(result);
            },
            getAutocomplete(input) {
                return autocomplete(input, state, commands);
            },
            getClickCommand(action) {
                if (action.kind === "dir") {
                    return `ls ${action.path}`;
                }

                if (action.kind === "symlink") {
                    return `ls ${action.path}`;
                }

                if (action.kind === "file") {
                    return `cat ${action.path}`;
                }

                return "";
            },
            getHistory() {
                return [...state.history];
            },
            getInitialLines() {
                return state.lines.map(cloneLine);
            },
            getPrompt() {
                return `zach@portfolio:${getCwdPath(state)}$`;
            },
        };
    }

    function normalizeResult(result) {
        if (Array.isArray(result)) {
            return { clear: false, lines: result };
        }

        return result;
    }

    function parseCommand(input) {
        const parts = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        const [name = "", ...args] = parts.map(stripQuotes);
        return { args, name };
    }

    function stripQuotes(value) {
        if (value.startsWith("\"") && value.endsWith("\"")) {
            return value.slice(1, -1);
        }

        return value;
    }

    function resolveCommandHelp(parsed, commands) {
        if (parsed.args.includes("--help")) {
            if (parsed.name in DATA.manPages) {
                return DATA.manPages[parsed.name].map(cloneLine);
            }

            if (parsed.name in commands) {
                return DATA.manPages.shell.map(cloneLine);
            }
        }

        return null;
    }

    function resolveMan(topic) {
        const key = topic || "shell";

        if (!(key in DATA.manPages)) {
            return [["error", `man: no entry for ${key}`]];
        }

        return DATA.manPages[key].map(cloneLine);
    }

    function resolvePrintenv(state, args) {
        if (args.length === 0) {
            return renderEnv(state);
        }

        const values = args
            .filter((key) => key in state.env)
            .map((key) => ["plain", `${key}=${state.env[key]}`]);

        return values;
    }

    function renderEnv(state) {
        return Object.entries(state.env).map(([key, value]) => ["plain", `${key}=${value}`]);
    }

    function resolveLs(state, args) {
        const { flags, paths } = splitFlags(args);
        const target = expandPath(state, paths[0] || ".");
        const resolved = resolvePath(state, target);

        if (!resolved.ok) {
            return [["error", `ls: cannot access '${target}': No such file or directory`]];
        }

        if (resolved.node.type === "dir") {
            return renderDirectory(resolved, flags);
        }

        return renderSingleEntry(resolved, flags);
    }

    function resolveTree(state, rawPath) {
        const target = expandPath(state, rawPath);
        const resolved = resolvePath(state, target);

        if (!resolved.ok) {
            return [["error", `tree: ${rawPath}: No such file or directory`]];
        }

        if (resolved.node.type !== "dir") {
            return [["plain", resolved.name]];
        }

        return buildTreeLines(resolved.node, rawPath === "." ? "." : resolved.name);
    }

    function resolveCat(state, rawPath) {
        if (!rawPath) {
            return [["error", "cat: missing operand"]];
        }

        const resolved = resolvePath(state, expandPath(state, rawPath));

        if (!resolved.ok) {
            return [["error", `cat: ${rawPath}: No such file or directory`]];
        }

        if (resolved.node.type === "dir") {
            return [["error", `cat: ${rawPath}: Is a directory`]];
        }

        if (resolved.node.type === "symlink") {
            return resolveCat(state, resolved.node.target);
        }

        if (resolved.node.type === "link") {
            return [["string", resolved.node.href]];
        }

        if (resolved.node.kind === "text") {
            return resolved.node.value.map((line) => ["plain", line]);
        }

        if (resolved.node.kind === "contact") {
            return [["links", resolved.node.value]];
        }

        if (resolved.node.kind === "tokens") {
            return [["tokens", resolved.node.value]];
        }

        return [["string", resolved.node.value]];
    }

    function resolveReadlink(state, rawPath) {
        if (!rawPath) {
            return [["error", "readlink: missing operand"]];
        }

        const resolved = resolvePath(state, expandPath(state, rawPath), { followSymlinks: false });

        if (!resolved.ok) {
            return [["error", `readlink: ${rawPath}: No such file or directory`]];
        }

        if (resolved.node.type !== "symlink") {
            return [["error", `readlink: ${rawPath}: Invalid argument`]];
        }

        return [["string", resolved.node.target]];
    }

    function resolveCd(state, rawPath) {
        const nextPath = rawPath || state.env.HOME;
        const targetPath = nextPath === "-" ? state.env.OLDPWD : expandPath(state, nextPath);
        const resolved = resolvePath(state, targetPath);

        if (!resolved.ok) {
            return [["error", `cd: ${nextPath}: No such file or directory`]];
        }

        if (resolved.node.type !== "dir") {
            return [["error", `cd: ${nextPath}: Not a directory`]];
        }

        state.env.OLDPWD = state.env.PWD;
        state.cwd = resolved.segments;
        state.env.PWD = getCwdPath(state);

        if (nextPath === "-") {
            return [["string", state.env.PWD]];
        }

        return [];
    }

    function resolveOpen(state, rawPath) {
        if (!rawPath) {
            return [["error", "open: missing operand"]];
        }

        const resolved = resolvePath(state, expandPath(state, rawPath));

        if (!resolved.ok) {
            return [["error", `open: ${rawPath}: No such file or directory`]];
        }

        if (resolved.node.type !== "link") {
            return [["error", `open: ${rawPath}: not an openable link`]];
        }

        const opened = window.open(resolved.node.href, "_blank", "noopener");

        if (!opened) {
            return [["error", `open: unable to open ${resolved.node.label}`]];
        }

        return [["plain", `opened ${resolved.node.label}`]];
    }

    function resolveFile(state, rawPath) {
        if (!rawPath) {
            return [["error", "file: missing operand"]];
        }

        const resolved = resolvePath(state, expandPath(state, rawPath), { followSymlinks: false });

        if (!resolved.ok) {
            return [["error", `file: cannot open '${rawPath}'`]];
        }

        if (resolved.node.type === "dir") {
            return [["plain", `${rawPath}: directory`]];
        }

        if (resolved.node.type === "symlink") {
            return [["plain", `${rawPath}: symbolic link to ${resolved.node.target}`]];
        }

        if (resolved.node.type === "link") {
            return [["plain", `${rawPath}: link`]];
        }

        return [["plain", `${rawPath}: ASCII text`]];
    }

    function resolveUname(args) {
        if (args[0] === "-a") {
            return [["plain", "Portfolio 1.0.0 portfolio.local 24.0.0 JavaScript x86_64"]];
        }

        return [["plain", "Portfolio"]];
    }

    function resolveWhich(commandName, commands) {
        if (!commandName) {
            return [["error", "which: missing operand"]];
        }

        if (commandName in commands) {
            return [["plain", `/usr/bin/${commandName}`]];
        }

        return [];
    }

    function renderHistory(state) {
        return state.history.map((command, index) => ["plain", `${index + 1}  ${command}`]);
    }

    function splitFlags(args) {
        const flags = new Set();
        const paths = [];

        args.forEach((arg) => {
            if (arg.startsWith("-")) {
                arg.slice(1).split("").forEach((flag) => flags.add(flag));
            } else {
                paths.push(arg);
            }
        });

        return { flags, paths };
    }

    function renderDirectory(resolved, flags) {
        let entries = Object.entries(resolved.node.children);

        if (!flags.has("a")) {
            entries = entries.filter(([name]) => !name.startsWith("."));
        }

        if (flags.has("l")) {
            return entries.map(([name, child]) => ["plain", formatLongListing(name, child)]);
        }

        if (entries.every(([, child]) => child.type === "link")) {
            return [["links", entries.map(([name, child]) => ({ label: name, href: child.href }))]];
        }

        return [[
            "entries",
            entries.map(([name, child]) => ({
                kind: child.type,
                label: name,
                path: joinPath(resolved.segments, name, child.type === "dir"),
            })),
        ]];
    }

    function renderSingleEntry(resolved, flags) {
        const { name, node, segments } = resolved;

        if (flags.has("l")) {
            return [["plain", formatLongListing(name, node)]];
        }

        if (node.type === "link") {
            return [["links", [{ label: name, href: node.href }]]];
        }

        return [[
            "entries",
            [{
                kind: node.type,
                label: name,
                path: joinPath(segments.slice(0, -1), name, node.type === "dir"),
            }],
        ]];
    }

    function formatLongListing(name, node) {
        const typePrefix = node.type === "dir" ? "d" : node.type === "symlink" ? "l" : node.type === "link" ? "l" : "-";
        const size = getNodeSize(node);
        const suffix = node.type === "symlink" ? ` -> ${node.target}` : node.type === "link" ? ` -> ${node.href}` : "";
        return `${typePrefix}rwxr-xr-x  1 zach  staff  ${String(size).padStart(4, " ")} Apr 13  ${name}${suffix}`;
    }

    function expandVariables(state, input) {
        return input.replace(/\$([A-Z_]+)/g, (_, key) => state.env[key] || "");
    }

    function expandPath(state, input) {
        const expanded = expandVariables(state, input);

        if (expanded === "~") {
            return state.env.HOME;
        }

        if (expanded.startsWith("~/")) {
            return `${state.env.HOME}${expanded.slice(1)}`;
        }

        return expanded;
    }

    function getNodeSize(node) {
        if (node.type === "dir") {
            return 0;
        }

        if (node.type === "symlink") {
            return node.target.length;
        }

        if (node.type === "link") {
            return node.href.length;
        }

        if (node.kind === "text") {
            return node.value.join("\n").length;
        }

        return String(node.value).length;
    }

    function resolvePath(state, rawPath, options = {}) {
        const followSymlinks = options.followSymlinks !== false;
        const input = rawPath || ".";
        const parts = input.split("/").filter(Boolean);
        const segments = input.startsWith("/") ? [] : [...state.cwd];
        let node = input.startsWith("/") ? DATA.fs : getNodeAtSegments(state.cwd);

        for (const part of parts) {
            if (part === ".") {
                continue;
            }

            if (part === "..") {
                segments.pop();
                node = getNodeAtSegments(segments);
                continue;
            }

            if (part === "~") {
                segments.length = 0;
                node = DATA.fs;
                continue;
            }

            if (!node || node.type !== "dir" || !(part in node.children)) {
                return { ok: false };
            }

            node = node.children[part];
            segments.push(part);

            if (node.type === "symlink" && followSymlinks) {
                const target = resolvePath(state, node.target);

                if (!target.ok) {
                    return { ok: false };
                }

                node = target.node;
                segments.length = 0;
                segments.push(...target.segments);
            }
        }

        return {
            name: segments[segments.length - 1] || ".",
            node,
            ok: true,
            segments,
        };
    }

    function getNodeAtSegments(segments) {
        let node = DATA.fs;

        for (const segment of segments) {
            if (!node || node.type !== "dir" || !(segment in node.children)) {
                return null;
            }

            node = node.children[segment];
        }

        return node;
    }

    function getCwdPath(state) {
        return state.cwd.length ? `/${state.cwd.join("/")}` : "/";
    }

    function joinPath(segments, name, isDir = false) {
        const base = segments.length ? `/${segments.join("/")}` : "";
        const path = `${base}/${name}` || "/";
        return isDir ? `${path}/` : path;
    }

    function buildTreeLines(node, label) {
        const lines = [["tree", label]];
        walkTree(node, "", lines);
        return lines;
    }

    function walkTree(node, prefix, lines) {
        const entries = Object.entries(node.children);

        entries.forEach(([name, child], index) => {
            const isLast = index === entries.length - 1;
            const branch = isLast ? "└── " : "├── ";
            lines.push(["tree", `${prefix}${branch}${name}`]);

            if (child.type === "dir") {
                walkTree(child, `${prefix}${isLast ? "    " : "│   "}`, lines);
            }
        });
    }

    function autocomplete(input, state, commands) {
        const trimmed = input.trimStart();
        const parts = trimmed.split(/\s+/);

        if (parts.length <= 1) {
            const prefix = parts[0] || "";
            const matches = Object.keys(commands).filter((name) => name.startsWith(prefix)).sort();
            return buildCompletionResult(input, "", matches);
        }

        const [command, partial] = parts;

        if (!["cat", "cd", "file", "ls", "open", "readlink", "tree"].includes(command)) {
            return { input, matches: [] };
        }

        const matches = findPathCompletions(state, partial || "");
        return buildCompletionResult(input, `${command} `, matches);
    }

    function buildCompletionResult(input, prefix, matches) {
        if (matches.length === 0) {
            return { input, matches: [], replaceFrom: input.length };
        }

        if (matches.length === 1) {
            return {
                input: `${prefix}${matches[0]}`,
                matches,
                replaceFrom: prefix.length,
            };
        }

        return {
            input,
            matches,
            replaceFrom: prefix.length,
            sharedPrefix: getSharedPrefix(matches),
        };
    }

    function findPathCompletions(state, partialPath) {
        const isAbsolute = partialPath.startsWith("/");
        const useHome = partialPath.startsWith("~/");
        const trimmed = partialPath.replace(/^\/+/, "");
        const rawSegments = trimmed.split("/").filter(Boolean);
        const partialName = rawSegments.pop() || "";
        const parentSegments = isAbsolute || useHome ? [] : [...state.cwd];

        for (const segment of rawSegments) {
            if (segment === ".") {
                continue;
            }
            if (segment === "..") {
                parentSegments.pop();
                continue;
            }
            parentSegments.push(segment);
        }

        const parent = getNodeAtSegments(parentSegments);

        if (!parent || parent.type !== "dir") {
            return [];
        }

        return Object.keys(parent.children)
            .filter((name) => name.startsWith(partialName))
            .sort()
            .map((match) => {
                const child = parent.children[match];
                const combined = [...rawSegments, match].join("/");
                const prefix = isAbsolute ? "/" : useHome ? "~/" : "";
                return child.type === "dir" ? `${prefix}${combined}/` : `${prefix}${combined}`;
            });
    }

    function getSharedPrefix(values) {
        if (values.length === 0) {
            return "";
        }

        let prefix = values[0];

        for (const value of values.slice(1)) {
            while (!value.startsWith(prefix) && prefix) {
                prefix = prefix.slice(0, -1);
            }
        }

        return prefix;
    }

    function cloneLine([type, value]) {
        if (typeof value === "object" && value !== null) {
            if (typeof structuredClone === "function") {
                return [type, structuredClone(value)];
            }

            return [type, JSON.parse(JSON.stringify(value))];
        }

        return [type, value];
    }

    window.PortfolioShellCore = {
        createShell,
    };
})();
