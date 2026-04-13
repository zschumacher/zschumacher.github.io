(function () {
    function createTerminal(element, shell) {
        const state = {
            history: shell.getHistory(),
            historyIndex: shell.getHistory().length,
            input: "",
            isComposing: false,
            tabReplaceFrom: 0,
            tabMatches: [],
            tabIndex: -1,
            tabSeed: "",
        };

        let historyElement = null;
        let inputElement = null;
        let promptInputElement = null;
        let promptPrefixElement = null;

        initialize();

        return {
            focus() {
                focusInput();
            },
        };

        function initialize() {
            historyElement = document.createElement("div");
            historyElement.className = "terminal-history";
            element.appendChild(historyElement);

            shell.getInitialLines().forEach(appendLine);
            element.appendChild(renderPrompt());
            updatePrompt();

            element.addEventListener("click", onContainerClick);
            inputElement.addEventListener("keydown", onKeydown);
            inputElement.addEventListener("input", onInput);
            inputElement.addEventListener("click", moveCaretToEnd);
            inputElement.addEventListener("focus", moveCaretToEnd);
            inputElement.addEventListener("select", moveCaretToEnd);
            inputElement.addEventListener("compositionstart", onCompositionStart);
            inputElement.addEventListener("compositionend", onCompositionEnd);
            inputElement.addEventListener("paste", onPaste);
        }

        function onContainerClick(event) {
            if (event.target.closest("a")) {
                return;
            }

            const entry = event.target.closest(".terminal-entry");

            if (entry) {
                state.input = entry.dataset.command || "";
                resetTabState();
                syncInputValue();
                updatePrompt();
                submitCommand();
                return;
            }

            focusInput();
        }

        function onKeydown(event) {
            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home") {
                event.preventDefault();
                moveCaretToEnd();
                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();
                submitCommand();
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                if (state.historyIndex > 0) {
                    state.historyIndex -= 1;
                    state.input = state.history[state.historyIndex];
                    resetTabState();
                    syncInputValue();
                    updatePrompt();
                }
                return;
            }

            if (event.key === "ArrowDown") {
                event.preventDefault();
                if (state.historyIndex < state.history.length - 1) {
                    state.historyIndex += 1;
                    state.input = state.history[state.historyIndex];
                } else {
                    state.historyIndex = state.history.length;
                    state.input = "";
                }
                resetTabState();
                syncInputValue();
                updatePrompt();
                return;
            }

            if (event.key === "Tab") {
                event.preventDefault();
                handleTab();
                return;
            }
        }

        function onInput() {
            if (state.isComposing) {
                return;
            }

            state.input = inputElement.value.replace(/\r?\n/g, "");
            resetTabState();
            syncInputValue();
            updatePrompt();
        }

        function onCompositionStart() {
            state.isComposing = true;
        }

        function onCompositionEnd() {
            state.isComposing = false;
            state.input = inputElement.value.replace(/\r?\n/g, "");
            syncInputValue();
            updatePrompt();
        }

        function onPaste() {
            window.setTimeout(() => {
                state.input = inputElement.value.replace(/\r?\n/g, "");
                resetTabState();
                syncInputValue();
                updatePrompt();
            }, 0);
        }

        function submitCommand() {
            const rawInput = state.input;
            appendLine(["command", { prompt: shell.getPrompt(), command: rawInput }]);

            const trimmed = rawInput.trim();
            if (trimmed) {
                state.history.push(trimmed);
            }

            state.historyIndex = state.history.length;
            state.input = "";
            resetTabState();
            syncInputValue();
            updatePrompt();

            if (!trimmed) {
                return;
            }

            const result = shell.execute(trimmed);

            if (result.clear) {
                historyElement.replaceChildren();
                return;
            }

            result.lines.forEach(appendLine);
            updatePrompt();
            focusInput();
        }

        function handleTab() {
            const result = shell.getAutocomplete(state.input);

            if (result.matches.length === 0) {
                return;
            }

            if (result.matches.length === 1) {
                state.input = result.input;
                resetTabState();
                syncInputValue();
                updatePrompt();
                return;
            }

            if (state.tabSeed !== state.input || state.tabMatches.join("\0") !== result.matches.join("\0")) {
                state.tabSeed = state.input;
                state.tabMatches = result.matches;
                state.tabIndex = -1;
                state.tabReplaceFrom = result.replaceFrom;

                if (result.sharedPrefix) {
                    state.input = `${state.input.slice(0, result.replaceFrom)}${result.sharedPrefix}`;
                }

                syncInputValue();
                appendLine(["tokens", result.matches]);
                updatePrompt();
                return;
            }

            state.tabIndex = (state.tabIndex + 1) % state.tabMatches.length;
            state.input = `${state.tabSeed.slice(0, state.tabReplaceFrom)}${state.tabMatches[state.tabIndex]}`;
            syncInputValue();
            updatePrompt();
        }

        function appendLine(line) {
            historyElement.appendChild(renderLine(line));
            element.scrollTop = element.scrollHeight;
        }

        function renderLine([type, value]) {
            const line = document.createElement("p");

            if (type === "command") {
                line.append(renderSpan("caret", value.prompt), document.createTextNode(` ${value.command}`));
                return line;
            }

            if (type === "plain" || type === "tree") {
                line.textContent = value;
                return line;
            }

            if (type === "hint") {
                line.append(renderSpan("hint", value));
                return line;
            }

            if (type === "string") {
                line.append(renderSpan("string", value));
                return line;
            }

            if (type === "tokens") {
                value.forEach((token, index) => {
                    if (index > 0) {
                        line.append(document.createTextNode(" "));
                    }
                    line.append(renderSpan("string", token));
                });
                return line;
            }

            if (type === "entries") {
                value.forEach((item, index) => {
                    if (index > 0) {
                        line.append(document.createTextNode(" "));
                    }

                    const entry = document.createElement("button");
                    entry.type = "button";
                    entry.className = `terminal-entry terminal-entry-${item.kind}`;
                    entry.dataset.command = shell.getClickCommand(item);
                    entry.textContent = item.label;
                    line.append(entry);
                });
                return line;
            }

            if (type === "links") {
                value.forEach((item, index) => {
                    if (index > 0) {
                        line.append(document.createTextNode(" "));
                    }
                    const link = document.createElement("a");
                    link.href = item.href;
                    link.append(renderSpan("string", item.label));
                    line.append(link);
                });
                return line;
            }

            if (type === "error") {
                line.append(renderSpan("error", value));
                return line;
            }

            return line;
        }

        function renderPrompt() {
            const line = document.createElement("p");
            line.className = "prompt-line";
            promptPrefixElement = renderSpan("caret", "");
            promptInputElement = document.createElement("span");
            promptInputElement.className = "prompt-input";
            inputElement = document.createElement("textarea");
            inputElement.className = "terminal-input";
            inputElement.setAttribute("aria-label", "Terminal input");
            inputElement.setAttribute("autocapitalize", "off");
            inputElement.setAttribute("autocomplete", "off");
            inputElement.setAttribute("autocorrect", "off");
            inputElement.setAttribute("spellcheck", "false");
            inputElement.rows = 1;
            line.append(promptPrefixElement, document.createTextNode(" "), promptInputElement, renderCursor());
            line.append(inputElement);
            return line;
        }

        function updatePrompt() {
            promptPrefixElement.textContent = shell.getPrompt();
            promptInputElement.textContent = state.input;
            element.scrollTop = element.scrollHeight;
        }

        function syncInputValue() {
            inputElement.value = state.input;
            moveCaretToEnd();
        }

        function focusInput() {
            inputElement.focus();
            moveCaretToEnd();
        }

        function moveCaretToEnd() {
            inputElement.setSelectionRange(state.input.length, state.input.length);
        }

        function resetTabState() {
            state.tabMatches = [];
            state.tabIndex = -1;
            state.tabReplaceFrom = 0;
            state.tabSeed = "";
        }
    }

    function renderSpan(className, value) {
        const span = document.createElement("span");
        span.className = className;
        span.textContent = value;
        return span;
    }

    function renderCursor() {
        const cursor = document.createElement("span");
        cursor.className = "cursor";
        cursor.setAttribute("aria-hidden", "true");
        return cursor;
    }

    window.PortfolioTerminalUI = {
        createTerminal,
    };
})();
